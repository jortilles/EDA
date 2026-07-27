import { Component, ViewChild, OnInit, Input, AfterViewChecked } from '@angular/core';
import { EdaDialog, EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import { PanelChart } from '../panel-charts/panel-chart';
import { PanelChartComponent } from '../panel-charts/panel-chart.component';
import { StyleProviderService } from '@eda/services/service.index';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { EdaDialog2Component } from '@eda/shared/components/shared-components.index';
import { ColorPickerModule } from 'primeng/colorpicker';
import { DropdownModule } from 'primeng/dropdown';
import { ChartDialogSaveResponseBase } from '../panel-charts/chart-configuration-models/chart-dialog-save-response';
import { CategoryChartType, getChartCategoryValues, getSankeyRowLabels } from '../panel-charts/chart-category-values.util';

type ColorEditorShape = 'category-list' | 'start-end';
type ToggleKey = 'chartLegend' | 'showLabels' | 'showLabelsPercent' | 'showGridLines';

interface ChartTypeSpec {
  chartType: CategoryChartType;
  colorEditorShape: ColorEditorShape;
  toggles: ToggleKey[];
  hasInnerRadius: boolean;
  hasUseGradient: boolean;
}

const TOGGLE_DEFAULTS: Record<ToggleKey, boolean> = {
  chartLegend: true,
  showGridLines: true,
  showLabels: false,
  showLabelsPercent: false
};

const CHART_TYPE_SPECS: Record<CategoryChartType, ChartTypeSpec> = {
  doughnut:     { chartType: 'doughnut',     colorEditorShape: 'category-list', hasUseGradient: true,  hasInnerRadius: true,  toggles: ['chartLegend', 'showLabels', 'showLabelsPercent'] },
  polarArea:    { chartType: 'polarArea',    colorEditorShape: 'category-list', hasUseGradient: true,  hasInnerRadius: false, toggles: ['chartLegend', 'showGridLines', 'showLabels', 'showLabelsPercent'] },
  sunburst:     { chartType: 'sunburst',     colorEditorShape: 'category-list', hasUseGradient: true,  hasInnerRadius: false, toggles: ['chartLegend'] },
  treeMap:      { chartType: 'treeMap',      colorEditorShape: 'category-list', hasUseGradient: true,  hasInnerRadius: false, toggles: ['chartLegend'] },
  scatterPlot:  { chartType: 'scatterPlot',  colorEditorShape: 'category-list', hasUseGradient: true,  hasInnerRadius: false, toggles: ['chartLegend'] },
  bubblechart:  { chartType: 'bubblechart',  colorEditorShape: 'category-list', hasUseGradient: true,  hasInnerRadius: false, toggles: ['chartLegend'] },
  parallelSets: { chartType: 'parallelSets', colorEditorShape: 'category-list', hasUseGradient: true,  hasInnerRadius: false, toggles: ['chartLegend'] },
  funnel:       { chartType: 'funnel',       colorEditorShape: 'start-end',     hasUseGradient: false, hasInnerRadius: false, toggles: ['chartLegend'] },
};

@Component({
  standalone: true,
  selector: 'app-category-chart-dialog',
  templateUrl: './category-chart-dialog.component.html',
  imports: [FormsModule, CommonModule, EdaDialog2Component, PanelChartComponent, ColorPickerModule, DropdownModule]
})
export class CategoryChartDialogComponent implements OnInit, AfterViewChecked {

  @Input() controller: any;
  @ViewChild('PanelChartComponent', { static: false }) myPanelChartComponent: PanelChartComponent;

  public dialog: EdaDialog;
  public panelChartConfig: PanelChart = new PanelChart();
  public display = false;
  public title = $localize`:@@ChartProps:PROPIEDADES DEL GRAFICO`;

  public spec: ChartTypeSpec;
  public assignedColors: { value: string | number; color: string }[] = [];
  public toggleState: Record<string, boolean> = {};
  public innerRadiusPercent = 50;
  public useGradient = true;
  public chartAnimation = true;

  private original: {
    assignedColors: { value: string | number; color: string }[];
    toggleState: Record<string, boolean>;
    innerRadiusPercent: number;
    useGradient: boolean;
    chartAnimation: boolean;
  };

  public selectedPalette: { name: string; paleta: string[] } | null = null;
  public allPalettes: any = this.stylesProviderService.ChartsPalettes;

  constructor(private stylesProviderService: StyleProviderService) { }

  ngOnInit(): void {
    this.panelChartConfig = this.controller.params.panelChart;
    this.spec = CHART_TYPE_SPECS[this.controller.params.chartType as CategoryChartType];
    this.display = true;
  }

  ngAfterViewChecked(): void {
    if (!this.assignedColors.length && this.myPanelChartComponent?.componentRef) {
      setTimeout(() => {
        const instance = this.myPanelChartComponent.componentRef.instance;
        const values = getChartCategoryValues(this.spec.chartType, instance);
        const config = this.myPanelChartComponent.props.config.getConfig();
        const existingColors: { value: string | number; color: string }[] = config['assignedColors'] || [];

        this.assignedColors = values.map((value, index) => {
          const match = existingColors.find(c => c.value === value);
          return { value, color: match?.color || this.stylesProviderService.getPaletteColor(index) };
        });

        this.toggleState = {};
        for (const key of this.spec.toggles) {
          this.toggleState[key] = config[key] ?? TOGGLE_DEFAULTS[key];
        }

        this.innerRadiusPercent = config['innerRadiusPercent'] ?? 50;
        this.useGradient = config['useGradient'] ?? true;
        this.chartAnimation = config['chartAnimation'] ?? true;

        this.original = {
          assignedColors: this.assignedColors.map(c => ({ ...c })),
          toggleState: { ...this.toggleState },
          innerRadiusPercent: this.innerRadiusPercent,
          useGradient: this.useGradient,
          chartAnimation: this.chartAnimation
        };
      }, 0);
    }
  }

  onClose(event: EdaDialogCloseEvent, response?: any): void {
    this.controller.close(event, response);
  }

  handleInputColor(): void {
    this.syncChart();
  }

  onToggleChanged(): void {
    this.syncChart();
  }

  setUseGradient(): void {
    this.syncChart();
  }

  setInnerRadius(): void {
    this.syncChart();
  }

  setChartAnimation(): void {
    this.syncChart();
  }

  onPaletteSelected(): void {
    if (!this.selectedPalette) return;
    const palette = this.selectedPalette.paleta;

    if (this.spec.colorEditorShape === 'start-end') {
      // Start/end spans the whole palette (first/last color), not a modulo walk over it.
      this.assignedColors = this.assignedColors.map((item, index) => ({
        value: item.value,
        color: index === 0 ? palette[0] : palette[palette.length - 1]
      }));
    } else {
      this.assignedColors = this.assignedColors.map((item, index) => ({
        value: item.value,
        color: palette[index % palette.length]
      }));
    }

    this.syncChart();
  }

  saveChartConfig(): void {
    this.syncChart();
    const config = this.myPanelChartComponent.props.config.getConfig();

    const response: ChartDialogSaveResponseBase = {
      colors: config['colors'],
      assignedColors: [...this.assignedColors],
      chartLegend: this.toggleState['chartLegend'],
      chartAnimation: this.chartAnimation
    };
    if (this.spec.hasUseGradient) response.useGradient = this.useGradient;
    if (this.spec.toggles.includes('showLabels')) response.showLabels = this.toggleState['showLabels'];
    if (this.spec.toggles.includes('showLabelsPercent')) response.showLabelsPercent = this.toggleState['showLabelsPercent'];
    if (this.spec.toggles.includes('showGridLines')) response.showGridLines = this.toggleState['showGridLines'];
    if (this.spec.hasInnerRadius) response.innerRadiusPercent = this.innerRadiusPercent;

    this.onClose(EdaDialogCloseEvent.UPDATE, response);
  }

  closeChartConfig(): void {
    this.assignedColors = this.original.assignedColors.map(c => ({ ...c }));
    this.toggleState = { ...this.original.toggleState };
    this.innerRadiusPercent = this.original.innerRadiusPercent;
    this.useGradient = this.original.useGradient;
    this.chartAnimation = this.original.chartAnimation;

    this.syncChart();
    this.onClose(EdaDialogCloseEvent.NONE);
  }

  /* Mutates the live config and re-renders the preview - the single place every setter/save/cancel funnels through. */
  private syncChart(): void {
    const config = this.myPanelChartComponent.props.config.getConfig();
    config['assignedColors'] = [...this.assignedColors];
    for (const key of this.spec.toggles) {
      config[key] = this.toggleState[key];
    }
    if (this.spec.hasUseGradient) config['useGradient'] = this.useGradient;
    if (this.spec.hasInnerRadius) config['innerRadiusPercent'] = this.innerRadiusPercent;
    config['chartAnimation'] = this.chartAnimation;

    if (this.spec.chartType === 'parallelSets') {
      // Sankey's colors[] is positional-per-row, not positional-per-unique-label.
      const rowLabels = getSankeyRowLabels(this.myPanelChartComponent.componentRef.instance);
      const labelColorMap: Record<string, string> = {};
      this.assignedColors.forEach(c => { labelColorMap[c.value as string] = c.color; });
      config['colors'] = [...new Set(rowLabels.map(l => labelColorMap[l]))];
    } else {
      config['colors'] = this.assignedColors.map(c => c.color);
    }

    this.myPanelChartComponent.changeChartType();
  }
}
