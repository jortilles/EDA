import { Component, ViewChild, AfterViewChecked, OnInit, Input } from '@angular/core';
import { EdaDialog, EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import { PanelChart } from '../panel-charts/panel-chart';
import { PanelChartComponent } from '../panel-charts/panel-chart.component';
import { SankeyConfig } from './../panel-charts/chart-configuration-models/sankey-config';
import { StyleProviderService, ChartUtilsService } from '@eda/services/service.index';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { EdaDialog2Component } from '@eda/shared/components/shared-components.index';
import { ColorPickerModule } from 'primeng/colorpicker';

@Component({
  standalone: true,
  selector: 'app-sankey-dialog',
  templateUrl: './sankey-dialog.component.html',
  imports: [FormsModule, CommonModule, EdaDialog2Component, PanelChartComponent, ColorPickerModule]
})
export class SankeyDialog implements OnInit, AfterViewChecked {

  @Input() controller: any;
  @ViewChild('PanelChartComponent', { static: false }) myPanelChartComponent: PanelChartComponent;

  public panelChartConfig: PanelChart = new PanelChart();

  /* fuente única de verdad */
  public assignedColors: { value: string; color: string }[] = [];
  private originalAssignedColors: { value: string; color: string }[] = [];

  public labels: string[] = [];
  public values: any[] = [];

  public display = false;
  public selectedPalette: { name: string; paleta: string[] } | null = null;
  public allPalettes = this.stylesProviderService.ChartsPalettes;
  public title = $localize`:@@ChartProps:PROPIEDADES DEL GRAFICO`;

  constructor(
    private stylesProviderService: StyleProviderService,
    private chartUtils: ChartUtilsService
  ) {}

  ngOnInit(): void {
    this.panelChartConfig = this.controller.params.panelChart;
    this.display = true;
  }

  ngAfterViewChecked(): void {
    if (!this.assignedColors.length && this.myPanelChartComponent?.componentRef) {
      setTimeout(() => {

        this.values = this.myPanelChartComponent.componentRef.instance.data.values;

        // labels únicos reales
        this.labels = [...new Set<string>(this.values.map(v => v[0] as string))];

        const chartAssignedColors =
          this.myPanelChartComponent.props.config.getConfig()['assignedColors'] || [];

        this.assignedColors = this.labels.map(label => {
          const match = chartAssignedColors.find(c => c.value === label);
          return {
            value: label,
            color: match?.color
          };
        });

        // preview cancelación
        this.originalAssignedColors = this.assignedColors.map(c => ({ ...c }));

      }, 0);
    }
  }

  onClose(event: EdaDialogCloseEvent, response?: any): void {
    this.controller.close(event, response);
  }

  /** GUARDAR */
  saveChartConfig(): void {
    this.syncChart();
    this.onClose(EdaDialogCloseEvent.UPDATE, {colors: this.assignedColors.map(c => c.color)});
  }

  /** CANCELAR */
  closeChartConfig(): void {
    this.assignedColors = this.originalAssignedColors.map(c => ({ ...c }));
    this.syncChart();
    this.onClose(EdaDialogCloseEvent.NONE);
  }

  /** COLOR PICKER */
  handleInputColor(): void {
    this.syncChart();
  }

  /** PALETA */
  onPaletteSelected(): void {
    if (!this.selectedPalette) return;

    const palette = this.selectedPalette.paleta;
    const length = this.labels.length;

    const colors: string[] = [];
    for (let i = 0; i < length; i++) {
      colors.push(palette[i % palette.length]);
    }

    this.assignedColors = this.labels.map((label, i) => ({
      value: label,
      color: colors[i]
    }));

    this.syncChart();
  }

  /*sincroniza todo */
  private syncChart(): void {
    const labelColorMap: Record<string, string> = {};
    this.assignedColors.forEach(c => {labelColorMap[c.value] = c.color;});

    // Sankey necesita colores según data.values
    const colorsForChart = this.values.map(v => labelColorMap[v[0] as string]);

    this.myPanelChartComponent.props.config.setConfig(new SankeyConfig([...new Set(colorsForChart)]));
    this.myPanelChartComponent.props.config.getConfig()['assignedColors'] = [...this.assignedColors];
    this.myPanelChartComponent.changeChartType();
  }
}
