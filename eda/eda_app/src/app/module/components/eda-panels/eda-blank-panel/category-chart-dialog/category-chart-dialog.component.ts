import { Component, ViewChild, OnInit, Input, AfterViewChecked } from '@angular/core';
import { EdaDialog, EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import { PanelChart } from '../panel-charts/panel-chart';
import { PanelChartComponent } from '../panel-charts/panel-chart.component';
import { StyleProviderService, MediaService, AlertService } from '@eda/services/service.index';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { EdaDialog2Component } from '@eda/shared/components/shared-components.index';
import { ColorPickerModule } from 'primeng/colorpicker';
import { DropdownModule } from 'primeng/dropdown';
import { ChartDialogSaveResponseBase } from '../panel-charts/chart-configuration-models/chart-dialog-save-response';
import { CategoryChartType, getChartCategoryValues, getSankeyRowLabels } from '../panel-charts/chart-category-values.util';
import { DEFAULT_FRAME_DURATION_MS } from '@eda/components/eda-race-bar/eda-race-bar.component';
import { MediaLibraryComponent } from '@eda/components/media-library/media-library.component';

type ColorEditorShape = 'category-list' | 'start-end';
type ToggleKey = 'chartLegend' | 'showLabels' | 'showLabelsPercent' | 'showGridLines' | 'showTimeline' | 'useIcons';

interface ChartTypeSpec {
  chartType: CategoryChartType;
  colorEditorShape: ColorEditorShape;
  toggles: ToggleKey[];
  hasInnerRadius: boolean;
  hasUseGradient: boolean;
  /** raceBar only - how many bars to show at once (recomputed every frame from whoever's currently
   * biggest), instead of just however many the panel's height fits. */
  hasTopNCount: boolean;
  /** raceBar only - how long each tick's transition takes, in ms. */
  hasTransitionMs: boolean;
  /** raceBar only - lets each category get an icon (from the media library) next to its value. */
  hasIcons: boolean;
}

const TOGGLE_DEFAULTS: Record<ToggleKey, boolean> = {
  chartLegend: true,
  showGridLines: true,
  showLabels: false,
  showLabelsPercent: false,
  showTimeline: false,
  useIcons: false
};

const CHART_TYPE_SPECS: Record<CategoryChartType, ChartTypeSpec> = {
  doughnut:     { chartType: 'doughnut',     colorEditorShape: 'category-list', hasUseGradient: true,  hasInnerRadius: true,  hasTopNCount: false, hasTransitionMs: false, hasIcons: false, toggles: ['chartLegend', 'showLabels', 'showLabelsPercent'] },
  polarArea:    { chartType: 'polarArea',    colorEditorShape: 'category-list', hasUseGradient: true,  hasInnerRadius: false, hasTopNCount: false, hasTransitionMs: false, hasIcons: false, toggles: ['chartLegend', 'showGridLines', 'showLabels', 'showLabelsPercent'] },
  sunburst:     { chartType: 'sunburst',     colorEditorShape: 'category-list', hasUseGradient: true,  hasInnerRadius: false, hasTopNCount: false, hasTransitionMs: false, hasIcons: false, toggles: ['chartLegend'] },
  treeMap:      { chartType: 'treeMap',      colorEditorShape: 'category-list', hasUseGradient: true,  hasInnerRadius: false, hasTopNCount: false, hasTransitionMs: false, hasIcons: false, toggles: ['chartLegend'] },
  scatterPlot:  { chartType: 'scatterPlot',  colorEditorShape: 'category-list', hasUseGradient: true,  hasInnerRadius: false, hasTopNCount: false, hasTransitionMs: false, hasIcons: false, toggles: ['chartLegend'] },
  bubblechart:  { chartType: 'bubblechart',  colorEditorShape: 'category-list', hasUseGradient: true,  hasInnerRadius: false, hasTopNCount: false, hasTransitionMs: false, hasIcons: false, toggles: ['chartLegend'] },
  parallelSets: { chartType: 'parallelSets', colorEditorShape: 'category-list', hasUseGradient: true,  hasInnerRadius: false, hasTopNCount: false, hasTransitionMs: false, hasIcons: false, toggles: ['chartLegend'] },
  funnel:       { chartType: 'funnel',       colorEditorShape: 'start-end',     hasUseGradient: false, hasInnerRadius: false, hasTopNCount: false, hasTransitionMs: false, hasIcons: false, toggles: ['chartLegend'] },
  raceBar:      { chartType: 'raceBar',      colorEditorShape: 'category-list', hasUseGradient: true,  hasInnerRadius: false, hasTopNCount: true,  hasTransitionMs: true,  hasIcons: true,  toggles: ['chartLegend', 'showTimeline', 'useIcons'] },
};

@Component({
  standalone: true,
  selector: 'app-category-chart-dialog',
  templateUrl: './category-chart-dialog.component.html',
  imports: [FormsModule, CommonModule, EdaDialog2Component, PanelChartComponent, ColorPickerModule, DropdownModule, MediaLibraryComponent]
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
  public assignedIcons: { value: string | number; icon: string }[] = [];
  public iconPickerOpenForIndex: number | null = null;
  public matchFolderPickerOpen = false;
  public toggleState: Record<string, boolean> = {};
  public innerRadiusPercent = 50;
  public useGradient = true;
  public chartAnimation = true;
  public labelColorMode = 'series';
  public labelCustomColor = '#000000';
  public topNCount = 10;
  public transitionMs = DEFAULT_FRAME_DURATION_MS;

  private original: {
    assignedColors: { value: string | number; color: string }[];
    assignedIcons: { value: string | number; icon: string }[];
    toggleState: Record<string, boolean>;
    innerRadiusPercent: number;
    useGradient: boolean;
    chartAnimation: boolean;
    labelColorMode: string;
    labelCustomColor: string;
    topNCount: number;
    transitionMs: number;
  };

  public selectedPalette: { name: string; paleta: string[] } | null = null;
  public allPalettes: any = this.stylesProviderService.ChartsPalettes;

  constructor(
    private stylesProviderService: StyleProviderService,
    private mediaService: MediaService,
    private alertService: AlertService
  ) { }

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

        const existingIcons: { value: string | number; icon: string }[] = config['assignedIcons'] || [];
        this.assignedIcons = values.map(value => {
          const match = existingIcons.find(c => c.value === value);
          return { value, icon: match?.icon || '' };
        });

        this.toggleState = {};
        for (const key of this.spec.toggles) {
          this.toggleState[key] = config[key] ?? TOGGLE_DEFAULTS[key];
        }

        this.innerRadiusPercent = config['innerRadiusPercent'] ?? 50;
        this.useGradient = config['useGradient'] ?? true;
        this.chartAnimation = config['chartAnimation'] ?? true;
        this.labelColorMode = config['labelColorMode'] || 'series';
        this.labelCustomColor = config['labelCustomColor'] || '#000000';
        this.topNCount = config['topNCount'] ?? 10;
        this.transitionMs = config['transitionMs'] ?? DEFAULT_FRAME_DURATION_MS;

        this.original = {
          assignedColors: this.assignedColors.map(c => ({ ...c })),
          assignedIcons: this.assignedIcons.map(c => ({ ...c })),
          toggleState: { ...this.toggleState },
          innerRadiusPercent: this.innerRadiusPercent,
          useGradient: this.useGradient,
          chartAnimation: this.chartAnimation,
          labelColorMode: this.labelColorMode,
          labelCustomColor: this.labelCustomColor,
          topNCount: this.topNCount,
          transitionMs: this.transitionMs
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

  openIconPicker(idx: number): void {
    this.iconPickerOpenForIndex = idx;
  }

  onIconSelected(url: string, idx: number): void {
    this.assignedIcons[idx].icon = url;
    this.iconPickerOpenForIndex = null;
    this.syncChart();
  }

  removeIcon(idx: number): void {
    this.assignedIcons[idx].icon = '';
    this.syncChart();
  }

  openMatchFolderPicker(): void {
    this.matchFolderPickerOpen = true;
  }

  /** Bulk-assigns icons by filename: for every category, a file in `folder` whose name (minus
   * extension, normalized) equals the category's own value gets assigned; anything without a match
   * is cleared. One-shot action, not a lasting link to the folder - the per-row picker/remove
   * buttons above still let the user correct any of it by hand afterward. */
  onMatchFolderSelected(folder: { id: string | null; name: string }): void {
    this.matchFolderPickerOpen = false;
    this.mediaService.list(folder.id).subscribe({
      next: (res: any) => {
        const images: { url: string; originalName: string }[] = res.media || [];
        const byName = new Map<string, string>();
        images.forEach(img => byName.set(this.normalizeForMatch(img.originalName.replace(/\.[^.]+$/, '')), img.url));

        let matched = 0;
        this.assignedIcons = this.assignedIcons.map(entry => {
          const url = byName.get(this.normalizeForMatch(String(entry.value))) || '';
          if (url) matched++;
          return { value: entry.value, icon: url };
        });
        this.syncChart();

        const total = this.assignedIcons.length;
        this.alertService.addSuccess(
          `${$localize`:@@raceBarMatchingIconsDone:Iconos asignados por coincidencia de nombre`}: ${matched}/${total}`
        );
      },
      error: (err: any) => this.alertService.addError(err)
    });
  }

  /** Case/accent-insensitive key for matching a category value against a filename (e.g. "México" ~ "mexico.png").
   * The combining-diacritics range (U+0300-U+036F) is built from char codes, not typed literally,
   * so it can't silently get mangled into the visible accent glyphs themselves. */
  private normalizeForMatch(value: string): string {
    const combiningDiacritics = new RegExp(`[\\u0300-\\u036f]`, 'g');
    return value.trim().toLowerCase().normalize('NFD').replace(combiningDiacritics, '');
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

  setTopNCount(): void {
    this.syncChart();
  }

  setTransitionMs(): void {
    this.syncChart();
  }

  setLabelColor(): void {
    this.syncChart();
  }

  labelColorButtonClass(mode: string): Record<string, boolean> {
    return { 'bg-[var(--corporate-primary)] text-white': this.labelColorMode === mode };
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
    if (this.spec.hasIcons) response.assignedIcons = [...this.assignedIcons];
    if (this.spec.hasUseGradient) response.useGradient = this.useGradient;
    if (this.spec.toggles.includes('showLabels')) response.showLabels = this.toggleState['showLabels'];
    if (this.spec.toggles.includes('showLabelsPercent')) response.showLabelsPercent = this.toggleState['showLabelsPercent'];
    if (this.spec.toggles.includes('showLabels') || this.spec.toggles.includes('showLabelsPercent')) {
      response.labelColorMode = this.labelColorMode;
      response.labelCustomColor = this.labelCustomColor;
    }
    if (this.spec.toggles.includes('showGridLines')) response.showGridLines = this.toggleState['showGridLines'];
    if (this.spec.toggles.includes('showTimeline')) response.showTimeline = this.toggleState['showTimeline'];
    if (this.spec.toggles.includes('useIcons')) response.useIcons = this.toggleState['useIcons'];
    if (this.spec.hasInnerRadius) response.innerRadiusPercent = this.innerRadiusPercent;
    if (this.spec.hasTopNCount) response.topNCount = this.topNCount;
    if (this.spec.hasTransitionMs) response.transitionMs = this.transitionMs;

    this.onClose(EdaDialogCloseEvent.UPDATE, response);
  }

  closeChartConfig(): void {
    this.assignedColors = this.original.assignedColors.map(c => ({ ...c }));
    this.assignedIcons = this.original.assignedIcons.map(c => ({ ...c }));
    this.toggleState = { ...this.original.toggleState };
    this.innerRadiusPercent = this.original.innerRadiusPercent;
    this.useGradient = this.original.useGradient;
    this.chartAnimation = this.original.chartAnimation;
    this.labelColorMode = this.original.labelColorMode;
    this.labelCustomColor = this.original.labelCustomColor;
    this.topNCount = this.original.topNCount;
    this.transitionMs = this.original.transitionMs;

    this.syncChart();
    this.onClose(EdaDialogCloseEvent.NONE);
  }

  /* Mutates the live config and re-renders the preview - the single place every setter/save/cancel funnels through. */
  private syncChart(): void {
    const config = this.myPanelChartComponent.props.config.getConfig();
    config['assignedColors'] = [...this.assignedColors];
    if (this.spec.hasIcons) config['assignedIcons'] = [...this.assignedIcons];
    for (const key of this.spec.toggles) {
      config[key] = this.toggleState[key];
    }
    if (this.spec.hasUseGradient) config['useGradient'] = this.useGradient;
    if (this.spec.hasInnerRadius) config['innerRadiusPercent'] = this.innerRadiusPercent;
    if (this.spec.hasTopNCount) config['topNCount'] = this.topNCount;
    if (this.spec.hasTransitionMs) config['transitionMs'] = this.transitionMs;
    config['chartAnimation'] = this.chartAnimation;
    if (this.spec.toggles.includes('showLabels') || this.spec.toggles.includes('showLabelsPercent')) {
      config['labelColorMode'] = this.labelColorMode;
      config['labelCustomColor'] = this.labelCustomColor;
    }

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
