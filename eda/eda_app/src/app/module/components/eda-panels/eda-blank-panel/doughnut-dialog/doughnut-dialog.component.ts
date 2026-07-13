import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import { PanelChart } from '../panel-charts/panel-chart';
import { PanelChartComponent } from '../panel-charts/panel-chart.component';
import { StyleProviderService } from '@eda/services/service.index';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { EdaDialog2Component } from '@eda/shared/components/shared-components.index';
import { ColorPickerModule } from 'primeng/colorpicker';
import { DropdownModule } from 'primeng/dropdown';

@Component({
  standalone: true,
  selector: 'app-doughnut-dialog',
  templateUrl: './doughnut-dialog.component.html',
  imports: [FormsModule, CommonModule, EdaDialog2Component, ColorPickerModule, PanelChartComponent, DropdownModule],
})
export class DoughnutDialog implements OnInit {

  @Input() controller: any;
  @ViewChild('PanelChartComponent', { static: false })
  myPanelChartComponent: PanelChartComponent;

  public panelChartConfig: PanelChart = new PanelChart();
  public display = false;
  public title = $localize`:@@ChartProps:PROPIEDADES DEL GRAFICO`;

  public assignedColors: { value: string; color: string }[] = [];
  private originalAssignedColors: { value: string; color: string }[] = [];

  public showLabels = false;
  public showLabelsPercent = false;
  public chartLegend = true;
  public innerRadiusPercent = 50;
  public useGradient = true;
  private originalValues: { showLabels: boolean; showLabelsPercent: boolean; chartLegend: boolean; innerRadiusPercent: number; useGradient: boolean };

  public selectedPalette: { name: string; paleta: string[] } | null = null;
  public allPalettes: any = this.stylesProviderService.ChartsPalettes;

  constructor(private stylesProviderService: StyleProviderService) { }

  ngOnInit(): void {
    this.panelChartConfig = this.controller.params.panelChart;

    const config = this.panelChartConfig.config.getConfig();
    this.showLabels = config['showLabels'] || false;
    this.showLabelsPercent = config['showLabelsPercent'] || false;
    this.chartLegend = config['chartLegend'] ?? true;
    this.innerRadiusPercent = config['innerRadiusPercent'] ?? 50;
    this.useGradient = config['useGradient'] ?? true;

    this.originalValues = {
      showLabels: this.showLabels,
      showLabelsPercent: this.showLabelsPercent,
      chartLegend: this.chartLegend,
      innerRadiusPercent: this.innerRadiusPercent,
      useGradient: this.useGradient
    };

    this.loadChartColors();
    this.display = true;
  }

  private loadChartColors(): void {
    const config = this.panelChartConfig.config.getConfig();
    const existingColors: { value: string; color: string }[] = config['assignedColors'] || [];
    const labels: string[] = this.controller.params.chart?.chartLabels || [];

    this.assignedColors = labels.map((label, index) => {
      const match = existingColors.find(c => c.value === label);
      return { value: label, color: match?.color || this.getDefaultColor(index) };
    });

    this.originalAssignedColors = this.assignedColors.map(c => ({ ...c }));
  }

  private getDefaultColor(index: number): string {
    const palette = this.stylesProviderService.ActualChartPalette?.['paleta'];
    return palette[index % palette.length];
  }

  onClose(event: EdaDialogCloseEvent, response?: any): void {
    this.controller.close(event, response);
  }

  /* COLOR PICKER */
  handleInputColor(): void {
    this.panelChartConfig.config.getConfig()['assignedColors'] = [...this.assignedColors];
    this.myPanelChartComponent.changeChartType();
  }

  /* PALETTE */
  onPaletteSelected(): void {
    if (!this.selectedPalette) return;
    const palette = this.selectedPalette.paleta;

    this.assignedColors = this.assignedColors.map((item, index) => ({
      value: item.value,
      color: palette[index % palette.length]
    }));

    this.panelChartConfig.config.getConfig()['assignedColors'] = [...this.assignedColors];
    this.myPanelChartComponent.changeChartType();
  }

  /* TOGGLES */
  setShowLabels(): void {
    this.panelChartConfig.config.getConfig()['showLabels'] = this.showLabels;
    this.myPanelChartComponent.changeChartType();
  }

  setShowLabelsPercent(): void {
    this.panelChartConfig.config.getConfig()['showLabelsPercent'] = this.showLabelsPercent;
    this.myPanelChartComponent.changeChartType();
  }

  setChartLegend(): void {
    this.panelChartConfig.config.getConfig()['chartLegend'] = this.chartLegend;
    this.myPanelChartComponent.changeChartType();
  }

  setInnerRadius(): void {
    this.panelChartConfig.config.getConfig()['innerRadiusPercent'] = this.innerRadiusPercent;
    this.myPanelChartComponent.changeChartType();
  }

  setUseGradient(): void {
    this.panelChartConfig.config.getConfig()['useGradient'] = this.useGradient;
    this.myPanelChartComponent.changeChartType();
  }

  /* SAVE */
  saveChartConfig(): void {
    const config = this.panelChartConfig.config.getConfig();
    config['assignedColors'] = [...this.assignedColors];
    config['showLabels'] = this.showLabels;
    config['showLabelsPercent'] = this.showLabelsPercent;
    config['chartLegend'] = this.chartLegend;
    config['innerRadiusPercent'] = this.innerRadiusPercent;
    config['useGradient'] = this.useGradient;

    this.onClose(EdaDialogCloseEvent.UPDATE, {
      assignedColors: [...this.assignedColors],
      showLabels: this.showLabels,
      showLabelsPercent: this.showLabelsPercent,
      chartLegend: this.chartLegend,
      innerRadiusPercent: this.innerRadiusPercent,
      useGradient: this.useGradient
    });
  }

  /* CANCEL */
  closeChartConfig(): void {
    this.assignedColors = this.originalAssignedColors.map(c => ({ ...c }));
    this.showLabels = this.originalValues.showLabels;
    this.showLabelsPercent = this.originalValues.showLabelsPercent;
    this.chartLegend = this.originalValues.chartLegend;
    this.innerRadiusPercent = this.originalValues.innerRadiusPercent;
    this.useGradient = this.originalValues.useGradient;

    const config = this.panelChartConfig.config.getConfig();
    config['assignedColors'] = [...this.assignedColors];
    config['showLabels'] = this.showLabels;
    config['showLabelsPercent'] = this.showLabelsPercent;
    config['chartLegend'] = this.chartLegend;
    config['innerRadiusPercent'] = this.innerRadiusPercent;
    config['useGradient'] = this.useGradient;

    this.myPanelChartComponent.changeChartType();
    this.onClose(EdaDialogCloseEvent.NONE);
  }
}
