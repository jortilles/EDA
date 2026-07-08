import { Component, ViewChild, OnInit, Input, AfterViewChecked } from '@angular/core';
import { EdaDialog, EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import { PanelChart } from '../panel-charts/panel-chart';
import { PanelChartComponent } from '../panel-charts/panel-chart.component';
import { ScatterConfig } from '../panel-charts/chart-configuration-models/scatter-config';
import { StyleProviderService, ChartUtilsService } from '@eda/services/service.index';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { EdaDialog2Component } from '@eda/shared/components/shared-components.index';
import { ColorPickerModule } from 'primeng/colorpicker';
import { DropdownModule } from 'primeng/dropdown';

@Component({
  standalone: true,
  selector: 'app-scatter-plot-dialog',
  templateUrl: './scatter-plot-dialog.component.html',
  imports: [FormsModule, CommonModule, PanelChartComponent, EdaDialog2Component, ColorPickerModule, DropdownModule]
})
export class ScatterPlotDialog implements OnInit, AfterViewChecked {

  @Input() controller: any;
  @ViewChild('PanelChartComponent', { static: false }) myPanelChartComponent: PanelChartComponent;

  public panelChartConfig: PanelChart = new PanelChart();

  /** Single source of truth */
  public assignedColors: { value: string; color: string }[] = [];
  private originalAssignedColors: { value: string; color: string }[] = [];
  public useGradient: boolean = true;
  private originalUseGradient: boolean = true;

  public labels: string[] = [];
  public display: boolean = false;

  public selectedPalette: { name: string; paleta: string[] } | null = null;
  public allPalettes: any = this.stylesProviderService.ChartsPalettes;
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

        this.labels =
          this.myPanelChartComponent.componentRef.instance.firstColLabels;

        const chartAssignedColors =
          this.myPanelChartComponent.props.config.getConfig()['assignedColors'] || [];

        this.assignedColors = this.labels.map(label => {
          const match = chartAssignedColors.find(c => c.value === label);
          return {
            value: label,
            color: match?.color
          };
        });

        // snapshot for cancel
        this.originalAssignedColors = this.assignedColors.map(c => ({ ...c }));

        this.useGradient = this.myPanelChartComponent.props.config.getConfig()['useGradient'] ?? true;
        this.originalUseGradient = this.useGradient;

      }, 0);
    }
  }

  /** Toggle the per-point gradient fill */
  setUseGradient(): void {
    this.myPanelChartComponent.props.config.getConfig()['useGradient'] = this.useGradient;
    this.myPanelChartComponent.changeChartType();
  }

  onClose(event: EdaDialogCloseEvent, response?: any): void {
    this.controller.close(event, response);
  }

  /** SAVE */
  saveChartConfig(): void {
    const colorsForConfig = this.assignedColors.map(c => c.color);

    this.myPanelChartComponent.props.config.setConfig(
      new ScatterConfig(colorsForConfig)
    );

    this.myPanelChartComponent.props.config.getConfig()['assignedColors'] =
      [...this.assignedColors];
    this.myPanelChartComponent.props.config.getConfig()['useGradient'] = this.useGradient;

    this.myPanelChartComponent.changeChartType();

    this.onClose(EdaDialogCloseEvent.UPDATE, { colors: colorsForConfig });
  }

  /** CANCEL */
  closeChartConfig(): void {
    this.assignedColors = this.originalAssignedColors.map(c => ({ ...c }));
    this.useGradient = this.originalUseGradient;

    const colorsForConfig = this.assignedColors.map(c => c.color);

    this.myPanelChartComponent.props.config.setConfig(
      new ScatterConfig(colorsForConfig)
    );

    this.myPanelChartComponent.props.config.getConfig()['assignedColors'] =
      [...this.assignedColors];
    this.myPanelChartComponent.props.config.getConfig()['useGradient'] = this.useGradient;

    this.myPanelChartComponent.changeChartType();
    this.onClose(EdaDialogCloseEvent.NONE);
  }

  /** COLOR PICKER */
  handleInputColor(): void {
    const colorsForConfig = this.assignedColors.map(c => c.color);

    this.myPanelChartComponent.props.config.setConfig(
      new ScatterConfig(colorsForConfig)
    );

    this.myPanelChartComponent.props.config.getConfig()['assignedColors'] =
      [...this.assignedColors];
    this.myPanelChartComponent.props.config.getConfig()['useGradient'] = this.useGradient;

    this.myPanelChartComponent.changeChartType();
  }

  /** PALETTE */
  onPaletteSelected(): void {
    if (!this.selectedPalette) return;

    const length = this.labels.length;
    const palette = this.selectedPalette.paleta;

    const newColors: string[] = [];
    for (let i = 0; i < length; i++) {
      newColors.push(palette[i % palette.length]);
    }

    this.assignedColors = this.labels.map((label, i) => ({
      value: label,
      color: newColors[i]
    }));

    const colorsForConfig = this.assignedColors.map(c => c.color);

    this.myPanelChartComponent.props.config.setConfig(
      new ScatterConfig(colorsForConfig)
    );

    this.myPanelChartComponent.props.config.getConfig()['assignedColors'] =
      [...this.assignedColors];
    this.myPanelChartComponent.props.config.getConfig()['useGradient'] = this.useGradient;

    this.myPanelChartComponent.changeChartType();
  }
}