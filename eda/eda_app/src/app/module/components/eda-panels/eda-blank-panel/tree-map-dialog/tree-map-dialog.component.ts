import { Component, ViewChild, OnInit, Input, AfterViewChecked } from '@angular/core';
import { PanelChartComponent } from '../panel-charts/panel-chart.component';
import { TreeMapConfig } from '../panel-charts/chart-configuration-models/treeMap-config';
import { StyleProviderService, ChartUtilsService } from '@eda/services/service.index';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { EdaDialog2Component } from '@eda/shared/components/shared-components.index';
import { ColorPickerModule } from 'primeng/colorpicker';
import { DropdownModule } from 'primeng/dropdown';
import { EdaDialog, EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import { PanelChart } from '../panel-charts/panel-chart';

@Component({
  standalone: true,
  selector: 'app-tree-map-dialog',
  templateUrl: './tree-map-dialog.component.html',
  imports: [FormsModule, CommonModule, EdaDialog2Component, PanelChartComponent, ColorPickerModule, DropdownModule],
})
export class TreeMapDialog implements OnInit, AfterViewChecked {
  @Input() controller: any;
  @ViewChild('PanelChartComponent', { static: false }) myPanelChartComponent: PanelChartComponent;

  public dialog: EdaDialog;
  public panelChartConfig: PanelChart = new PanelChart();

  /** Source of truth for colors by label */
  public assignedColors: { value: string; color: string }[] = [];
  private originalAssignedColors: { value: string; color: string }[] = [];

  public labels: string[] = [];
  public display: boolean = false;
  public selectedPalette: { name: string; paleta: string[] } | null = null;
  public allPalettes: any = this.stylesProviderService.ChartsPalettes;
  public title: string = $localize`:@@ChartProps:PROPIEDADES DEL GRAFICO`;

  constructor(
    private stylesProviderService: StyleProviderService,
    private ChartUtilsService: ChartUtilsService
  ) { }

  ngOnInit(): void {
    this.panelChartConfig = this.controller.params.panelChart;
    this.display = true;
  }

  ngAfterViewChecked(): void {
    if (!this.assignedColors.length && this.myPanelChartComponent?.componentRef) {
      setTimeout(() => {
        // Retrieve labels from the chart
        this.labels = this.myPanelChartComponent.componentRef.instance.firstColLabels;

        // Retrieve assignedColors from the chart if they exist
        const chartAssignedColors: { value: string; color: string }[] =
          this.myPanelChartComponent.props.config.getConfig()['assignedColors'] || [];

        // Map labels to existing assignedColors
        this.assignedColors = this.labels.map((label, i) => {
          const match = chartAssignedColors.find(c => c.value === label);
          return {
            value: label,
            color: match.color,
          };
        });

        // Store copy for cancellation
        this.originalAssignedColors = this.assignedColors.map(c => ({ ...c }));
      }, 0);
    }
  }

  /** Closes the dialog */
  onClose(event: EdaDialogCloseEvent, response?: any): void {
    this.controller.close(event, response);
  }

  /** Save color configuration */
  saveChartConfig(): void {
    const colorsForConfig = this.assignedColors.map(c => c.color);

    // Update TreeMapConfig and assignedColors in the config
    this.myPanelChartComponent.props.config.setConfig(new TreeMapConfig(colorsForConfig));
    this.myPanelChartComponent.props.config.getConfig()['assignedColors'] = [...this.assignedColors];

    this.myPanelChartComponent.changeChartType();

    this.onClose(EdaDialogCloseEvent.UPDATE, { colors: colorsForConfig });
  }

  /** Cancel changes and restore initial state */
  closeChartConfig(): void {
    this.assignedColors = this.originalAssignedColors.map(c => ({ ...c }));

    // Update TreeMapConfig and assignedColors in the config
    const colorsForConfig = this.assignedColors.map(c => c.color);
    this.myPanelChartComponent.props.config.setConfig(new TreeMapConfig(colorsForConfig));
    this.myPanelChartComponent.props.config.getConfig()['assignedColors'] = [...this.assignedColors];

    this.myPanelChartComponent.changeChartType();
    this.onClose(EdaDialogCloseEvent.NONE);
  }

  /** When the user edits an individual color */
  handleInputColor(): void {
    const colorsForConfig = this.assignedColors.map(c => c.color);

    // Update TreeMapConfig and synchronize assignedColors
    this.myPanelChartComponent.props.config.setConfig(new TreeMapConfig(colorsForConfig));
    this.myPanelChartComponent.props.config.getConfig()['assignedColors'] = [...this.assignedColors];

    this.myPanelChartComponent.changeChartType();
  }

  /** Apply full palette to the chart */
  onPaletteSelected(): void {
    if (!this.selectedPalette) return;

    const length = this.labels.length;

    // Map palette to the number of labels
    const newColors: string[] = [];
    for (let i = 0; i < length; i++) {
      newColors.push(this.selectedPalette.paleta[i % this.selectedPalette.paleta.length]);
    }

    // Update assignedColors
    this.assignedColors = this.labels.map((label, i) => ({
      value: label,
      color: newColors[i]
    }));

    // Update TreeMapConfig and assignedColors in the config
    const colorsForConfig = this.assignedColors.map(c => c.color);
    this.myPanelChartComponent.props.config.setConfig(new TreeMapConfig(colorsForConfig));
    this.myPanelChartComponent.props.config.getConfig()['assignedColors'] = [...this.assignedColors];

    this.myPanelChartComponent.changeChartType();
  }
}