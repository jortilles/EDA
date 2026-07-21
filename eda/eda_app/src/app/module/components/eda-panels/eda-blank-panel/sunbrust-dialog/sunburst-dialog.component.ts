import { Component, Input, OnInit, ViewChild, AfterViewChecked } from "@angular/core";
import { EdaDialogCloseEvent } from "@eda/shared/components/shared-components.index";
import { SunburstConfig } from "../panel-charts/chart-configuration-models/sunburst-config";
import { PanelChart } from "../panel-charts/panel-chart";
import { PanelChartComponent } from "../panel-charts/panel-chart.component";
import { StyleProviderService, ChartUtilsService } from "@eda/services/service.index";

import { FormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";
import { ColorPickerModule } from "primeng/colorpicker";
import { DropdownModule } from 'primeng/dropdown';
import { EdaDialog2Component } from "@eda/shared/components/shared-components.index";

@Component({
  standalone: true,
  selector: "sunburst-dialog",
  templateUrl: "./sunburst-dialog.component.html",
  imports: [FormsModule, CommonModule, PanelChartComponent, EdaDialog2Component, ColorPickerModule, DropdownModule]
})
export class SunburstDialogComponent implements OnInit, AfterViewChecked {

  @Input() controller: any;
  @ViewChild("PanelChartComponent", { static: false })
  myPanelChartComponent: PanelChartComponent;

  public panelChartConfig: PanelChart = new PanelChart();

  /** Single source of truth */
  public assignedColors: { value: string; color: string }[] = [];
  private originalAssignedColors: { value: string; color: string }[] = [];
  public useGradient: boolean = true;
  private originalUseGradient: boolean = true;
  public chartLegend: boolean = true;
  private originalChartLegend: boolean = true;

  public labels: string[] = [];
  public display = false;

  public selectedPalette: { name: string; paleta: string[] } | null = null;
  public allPalettes = this.stylesProviderService.ChartsPalettes;

  public title: string = $localize`:@@ChartProps:PROPIEDADES DEL GRAFICO`;

  constructor(
    private stylesProviderService: StyleProviderService,
    private chartUtils: ChartUtilsService
  ) { }

  ngOnInit(): void {
    this.panelChartConfig = this.controller.params.panelChart;
    this.display = true;
  }

  ngAfterViewChecked(): void {
    if (!this.assignedColors.length && this.myPanelChartComponent?.componentRef) {
      setTimeout(() => {

        // Get labels from rendered component
        this.labels = this.myPanelChartComponent.componentRef.instance.firstColLabels;

        // Get existing assigned colors or empty array
        const chartAssignedColors =
          this.myPanelChartComponent.props.config.getConfig()['assignedColors'] || [];

        // Always build assignedColors, even if none existed before
        this.assignedColors = this.labels.map(label => {
          const match = chartAssignedColors.find(c => c.value === label);
          return {
            value: label,
            color: match?.color
          };
        });

        // Snapshot for canceling changes
        this.originalAssignedColors = this.assignedColors.map(c => ({ ...c }));

        this.useGradient = this.myPanelChartComponent.props.config.getConfig()['useGradient'] ?? true;
        this.originalUseGradient = this.useGradient;

        this.chartLegend = this.myPanelChartComponent.props.config.getConfig()['chartLegend'] ?? true;
        this.originalChartLegend = this.chartLegend;

      }, 0);
    }
  }

  /** Toggle the per-arc gradient fill */
  setUseGradient(): void {
    this.myPanelChartComponent.props.config.getConfig()['useGradient'] = this.useGradient;
    this.myPanelChartComponent.changeChartType();
  }

  setChartLegend(): void {
    this.myPanelChartComponent.props.config.getConfig()['chartLegend'] = this.chartLegend;
    this.myPanelChartComponent.changeChartType();
  }

  /* Closes the dialog */
  onClose(event: EdaDialogCloseEvent, response?: any): void {
    this.controller.close(event, response);
  }

  /** SAVE */
  saveChartConfig(): void {
    const colorsForConfig = this.assignedColors.map(c => c.color);

    this.myPanelChartComponent.props.config.setConfig(
      new SunburstConfig(colorsForConfig)
    );

    this.myPanelChartComponent.props.config.getConfig()['assignedColors'] =
      [...this.assignedColors];
    this.myPanelChartComponent.props.config.getConfig()['useGradient'] = this.useGradient;
    this.myPanelChartComponent.props.config.getConfig()['chartLegend'] = this.chartLegend;

    this.myPanelChartComponent.changeChartType();

    // onCloseSunburstProperties() reads chartLegend/useGradient off this response too.
    this.onClose(EdaDialogCloseEvent.UPDATE, {
      colors: colorsForConfig,
      chartLegend: this.chartLegend,
      useGradient: this.useGradient
    });
  }

  /** CANCEL */
  closeChartConfig(): void {
    this.assignedColors = this.originalAssignedColors.map(c => ({ ...c }));
    this.useGradient = this.originalUseGradient;
    this.chartLegend = this.originalChartLegend;

    const colorsForConfig = this.assignedColors.map(c => c.color);

    this.myPanelChartComponent.props.config.setConfig(
      new SunburstConfig(colorsForConfig)
    );

    this.myPanelChartComponent.props.config.getConfig()['assignedColors'] =
      [...this.assignedColors];
    this.myPanelChartComponent.props.config.getConfig()['useGradient'] = this.useGradient;
    this.myPanelChartComponent.props.config.getConfig()['chartLegend'] = this.chartLegend;

    this.myPanelChartComponent.changeChartType();
    this.onClose(EdaDialogCloseEvent.NONE);
  }

  /** COLOR PICKER */
  handleInputColor(): void {
    const colorsForConfig = this.assignedColors.map(c => c.color);

    this.myPanelChartComponent.props.config.setConfig(
      new SunburstConfig(colorsForConfig)
    );

    this.myPanelChartComponent.props.config.getConfig()['assignedColors'] =
      [...this.assignedColors];
    this.myPanelChartComponent.props.config.getConfig()['useGradient'] = this.useGradient;
    this.myPanelChartComponent.props.config.getConfig()['chartLegend'] = this.chartLegend;

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
      new SunburstConfig(colorsForConfig)
    );

    this.myPanelChartComponent.props.config.getConfig()['assignedColors'] =
      [...this.assignedColors];
    this.myPanelChartComponent.props.config.getConfig()['useGradient'] = this.useGradient;
    this.myPanelChartComponent.props.config.getConfig()['chartLegend'] = this.chartLegend;

    this.myPanelChartComponent.changeChartType();
  }
}