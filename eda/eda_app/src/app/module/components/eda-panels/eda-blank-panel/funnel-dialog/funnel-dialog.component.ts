import { Component, ViewChild, OnInit, Input } from '@angular/core';
import { EdaDialog, EdaDialogAbstract, EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import { PanelChart } from '../panel-charts/panel-chart';
import { PanelChartComponent } from '../panel-charts/panel-chart.component';
import { FunnelConfig } from '../panel-charts/chart-configuration-models/funnel.config';
import { StyleProviderService,ChartUtilsService } from '@eda/services/service.index';
import { FormsModule } from '@angular/forms'; 
import { CommonModule } from '@angular/common';
import { EdaDialog2Component } from '@eda/shared/components/shared-components.index';
import { ColorPickerModule } from 'primeng/colorpicker';
@Component({
  standalone: true,
  selector: 'app-funnel-dialog',
  templateUrl: './funnel-dialog.component.html',
  imports: [FormsModule, CommonModule, EdaDialog2Component, ColorPickerModule, PanelChartComponent],
})

export class FunnelDialog implements OnInit {

  @Input() controller: any;
  @ViewChild('PanelChartComponent', { static: false })
  myPanelChartComponent: PanelChartComponent;

  public dialog: EdaDialog;
  public panelChartConfig: PanelChart = new PanelChart();

  /** Fuente de verdad */
  public assignedColors: { value: string | number; color: string }[] = [];
  private originalAssignedColors: { value: string | number; color: string }[] = [];

  public labels: Array<string | number> = [];
  public selectedPalette: { name: string; paleta: string[] } | null = null;
  public allPalettes: any = this.stylesProviderService.ChartsPalettes;

  public title = $localize`:@@ChartProps:PROPIEDADES DEL GRAFICO`;
  public display = false;

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

        const funnelInstance =
          this.myPanelChartComponent.componentRef.instance;

        /** labels reales del funnel */
        this.labels = funnelInstance.firstColLabels || [];

        /** colores existentes */
        const chartAssignedColors =
          this.myPanelChartComponent.props.config.getConfig()['assignedColors'] || [];

        /** sincronizar dialog ←→ chart */
        this.assignedColors = this.labels.map(label => {
          const match = chartAssignedColors.find(c => c.value === label);
          return {
            value: label,
            color: match?.color || '#000000'
          };
        });

        this.originalAssignedColors =
          this.assignedColors.map(c => ({ ...c }));

      }, 0);
    }
  }

  onClose(event: EdaDialogCloseEvent, response?: any): void {
    this.controller.close(event, response);
  }

  /** guardar */
  saveChartConfig(): void {
    const colorsForConfig = this.assignedColors.map(c => c.color);

    this.myPanelChartComponent.props.config.setConfig(new FunnelConfig(this.assignedColors.map(c => c.color)));

    this.myPanelChartComponent.props.config.getConfig()['assignedColors'] = [...this.assignedColors];
    this.myPanelChartComponent.changeChartType();

    this.onClose(EdaDialogCloseEvent.UPDATE, { assignedColors: colorsForConfig });
  }

  /** cancelar */
  closeChartConfig(): void {

    this.assignedColors =
      this.originalAssignedColors.map(c => ({ ...c }));

    this.myPanelChartComponent.props.config.setConfig(
      new FunnelConfig(this.assignedColors.map(c => c.color))
    );

    this.myPanelChartComponent.props.config.getConfig()['assignedColors'] =
      [...this.assignedColors];

    this.myPanelChartComponent.changeChartType();

    this.onClose(EdaDialogCloseEvent.NONE);
  }

  /** cambio individual */
  handleInputColor(): void {

    this.myPanelChartComponent.props.config.setConfig(
      new FunnelConfig(this.assignedColors.map(c => c.color))
    );

    this.myPanelChartComponent.props.config.getConfig()['assignedColors'] =
      [...this.assignedColors];

    this.myPanelChartComponent.changeChartType();
  }

  /** paleta completa */
  onPaletteSelected(): void {

    if (!this.selectedPalette) return;

    const length = this.labels.length;
    const palette = this.selectedPalette.paleta;

    const newColors = Array.from({ length }, (_, i) =>
      palette[i % palette.length]
    );

    this.assignedColors = this.labels.map((label, i) => ({
      value: label,
      color: newColors[i]
    }));

    this.myPanelChartComponent.props.config.setConfig(
      new FunnelConfig(this.assignedColors.map(c => c.color))
    );

    this.myPanelChartComponent.props.config.getConfig()['assignedColors'] =
      [...this.assignedColors];

    this.myPanelChartComponent.changeChartType();
  }
}
