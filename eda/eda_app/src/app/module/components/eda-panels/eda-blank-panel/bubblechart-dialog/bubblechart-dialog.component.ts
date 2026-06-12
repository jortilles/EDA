import { Component, ViewChild, OnInit, Input, AfterViewChecked } from '@angular/core';
import { EdaDialog, EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import { PanelChart } from '../panel-charts/panel-chart';
import { PanelChartComponent } from '../panel-charts/panel-chart.component';
import { BubblechartConfig } from '../panel-charts/chart-configuration-models/bubblechart.config';
import { StyleProviderService, ChartUtilsService } from '@eda/services/service.index';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { EdaDialog2Component } from '@eda/shared/components/shared-components.index';
import { ColorPickerModule } from 'primeng/colorpicker';
import { DropdownModule } from 'primeng/dropdown';

@Component({
  standalone: true,
  selector: 'app-bubblechart-dialog',
  templateUrl: './bubblechart-dialog.component.html',
  imports: [FormsModule, EdaDialog2Component, PanelChartComponent, CommonModule, ColorPickerModule, DropdownModule],
})
export class BubblechartDialog implements OnInit, AfterViewChecked {
  @ViewChild('PanelChartComponent', { static: false }) myPanelChartComponent: PanelChartComponent;
  @Input() controller;

  public dialog: EdaDialog;
  public panelChartConfig: PanelChart = new PanelChart();

  /** Source of truth for colors by label */
  public assignedColors: { value: string | number; color: string }[] = [];
  private originalAssignedColors: { value: string | number; color: string }[] = [];

  public labels: Array<string | number> = [];
  public selectedPalette: { name: string; paleta: string[] } | null = null;
  public allPalettes: any = this.stylesProviderService.ChartsPalettes;
  public title = $localize`:@@ChartProps:PROPIEDADES DEL GRAFICO`;

  constructor(private stylesProviderService: StyleProviderService, private ChartUtilsService: ChartUtilsService) { }

  ngOnInit(): void {
    this.panelChartConfig = this.controller.params.panelChart;
  }

  ngAfterViewChecked(): void {
    if (!this.assignedColors.length && this.myPanelChartComponent?.componentRef) {
      setTimeout(() => {
        // Retrieve labels and colors from the chart
        this.labels = this.myPanelChartComponent.componentRef.instance.firstColLabels;

        const chartAssignedColors: { value: string | number; color: string }[] =
          this.myPanelChartComponent.props.config.getConfig()['assignedColors'] || [];

        // Initialize assignedColors from the chart or with black by default
        this.assignedColors = this.labels.map(label => {
          const match = chartAssignedColors.find(c => c.value === label);
          return {
            value: label,
            color: match.color,
          };
        });

        // Save a copy for cancellation
        this.originalAssignedColors = this.assignedColors.map(c => ({ ...c }));
      }, 0);
    }
  }

  /** Closes the dialog */
  onClose(event: EdaDialogCloseEvent, response?: any): void {
    this.controller.close(event, response);
  }

  /** Saves the color configuration */
  saveChartConfig(): void {
    const colorsForConfig = this.assignedColors.map(c => c.color);

    this.myPanelChartComponent.props.config.setConfig(new BubblechartConfig(colorsForConfig));
    this.myPanelChartComponent.props.config.getConfig()['assignedColors'] = [...this.assignedColors];
    this.myPanelChartComponent.changeChartType();

    this.onClose(EdaDialogCloseEvent.UPDATE, { colors: colorsForConfig });
  }

  /** Cancels changes and restores the initial state */
  closeChartConfig(): void {
    this.assignedColors = this.originalAssignedColors.map(c => ({ ...c }));

    const colorsForConfig = this.assignedColors.map(c => c.color);
    this.myPanelChartComponent.props.config.setConfig(new BubblechartConfig(colorsForConfig));
    this.myPanelChartComponent.props.config.getConfig()['assignedColors'] = [...this.assignedColors];
    this.myPanelChartComponent.changeChartType();

    this.onClose(EdaDialogCloseEvent.NONE);
  }

  /** Called when the user edits an individual color */
  handleInputColor(): void {
    const colorsForConfig = this.assignedColors.map(c => c.color);
    this.myPanelChartComponent.props.config.setConfig(new BubblechartConfig(colorsForConfig));
    this.myPanelChartComponent.props.config.getConfig()['assignedColors'] = [...this.assignedColors];
    this.myPanelChartComponent.changeChartType();
  }

  /** Applies the full palette to the chart */
  onPaletteSelected(): void {
    if (!this.selectedPalette) return;
    const length = this.labels.length;

    // Map the palette to the number of labels
    const newColors: string[] = [];
    for (let i = 0; i < length; i++) {
      newColors.push(this.selectedPalette.paleta[i % this.selectedPalette.paleta.length]);
    }

    // Update assignedColors
    this.assignedColors = this.labels.map((label, i) => ({
      value: label,
      color: newColors[i],
    }));

    // Synchronize config and TreeMapConfig
    const colorsForConfig = this.assignedColors.map(c => c.color);
    this.myPanelChartComponent.props.config.setConfig(new BubblechartConfig(colorsForConfig));
    this.myPanelChartComponent.props.config.getConfig()['assignedColors'] = [...this.assignedColors];

    this.myPanelChartComponent.changeChartType();
  }
}
