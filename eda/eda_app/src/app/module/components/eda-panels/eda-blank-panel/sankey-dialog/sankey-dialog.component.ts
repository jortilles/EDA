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
import { DropdownModule } from 'primeng/dropdown';

@Component({
  standalone: true,
  selector: 'app-sankey-dialog',
  templateUrl: './sankey-dialog.component.html',
  imports: [FormsModule, CommonModule, EdaDialog2Component, PanelChartComponent, ColorPickerModule, DropdownModule]
})
export class SankeyDialog implements OnInit, AfterViewChecked {

  @Input() controller: any;
  @ViewChild('PanelChartComponent', { static: false }) myPanelChartComponent: PanelChartComponent;

  public panelChartConfig: PanelChart = new PanelChart();

  /* single source of truth */
  public assignedColors: { value: string; color: string }[] = [];
  private originalAssignedColors: { value: string; color: string }[] = [];
  public useGradient: boolean = true;
  private originalUseGradient: boolean = true;

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

        // The category column isn't necessarily column 0 - that's only true if it happens to come
        // before the numeric column in the raw query result. Use the same otherColumns[0].index
        // eda-d3.component.ts itself uses for firstColLabels, instead of assuming v[0].
        const labelIndex = this.myPanelChartComponent.componentRef.instance.inject.dataDescription.otherColumns[0].index;
        // real unique labels
        this.labels = [...new Set<string>(this.values.map(v => v[labelIndex] as string))];

        const chartAssignedColors =
          this.myPanelChartComponent.props.config.getConfig()['assignedColors'] || [];

        // Fall back to a palette color when a label has no saved match (e.g. it's new, or the
        // saved assignedColors got out of sync) - leaving it undefined is what was rendering the
        // color picker as an invalid red square and, once saved, painting that link black.
        const paletaActual = this.stylesProviderService.ActualChartPalette?.['paleta']
          || this.stylesProviderService.DEFAULT_PALETTE_COLOR?.['paleta'] || [];
        this.assignedColors = this.labels.map((label, index) => {
          const match = chartAssignedColors.find(c => c.value === label);
          return {
            value: label,
            color: match?.color || paletaActual[index % paletaActual.length]
          };
        });

        // preview cancel
        this.originalAssignedColors = this.assignedColors.map(c => ({ ...c }));

        this.useGradient = this.myPanelChartComponent.props.config.getConfig()['useGradient'] ?? true;
        this.originalUseGradient = this.useGradient;

      }, 0);
    }
  }

  /** Toggle the per-link gradient stroke */
  setUseGradient(): void {
    this.myPanelChartComponent.props.config.getConfig()['useGradient'] = this.useGradient;
    this.myPanelChartComponent.changeChartType();
  }

  onClose(event: EdaDialogCloseEvent, response?: any): void {
    this.controller.close(event, response);
  }

  /** SAVE */
  saveChartConfig(): void {
    this.syncChart();
    this.onClose(EdaDialogCloseEvent.UPDATE, {colors: this.assignedColors.map(c => c.color)});
  }

  /** CANCEL */
  closeChartConfig(): void {
    this.assignedColors = this.originalAssignedColors.map(c => ({ ...c }));
    this.useGradient = this.originalUseGradient;
    this.syncChart();
    this.onClose(EdaDialogCloseEvent.NONE);
  }

  /** COLOR PICKER */
  handleInputColor(): void {
    this.syncChart();
  }

  /** PALETTE */
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

  /* syncs everything */
  private syncChart(): void {
    const labelColorMap: Record<string, string> = {};
    this.assignedColors.forEach(c => {labelColorMap[c.value] = c.color;});

    // Same as ngAfterViewChecked above - the category column isn't necessarily v[0].
    const labelIndex = this.myPanelChartComponent.componentRef.instance.inject.dataDescription.otherColumns[0].index;
    // Sankey needs colors according to data.values
    const colorsForChart = this.values.map(v => labelColorMap[v[labelIndex] as string]);

    this.myPanelChartComponent.props.config.setConfig(new SankeyConfig([...new Set(colorsForChart)]));
    this.myPanelChartComponent.props.config.getConfig()['assignedColors'] = [...this.assignedColors];
    this.myPanelChartComponent.props.config.getConfig()['useGradient'] = this.useGradient;
    this.myPanelChartComponent.changeChartType();
  }
}