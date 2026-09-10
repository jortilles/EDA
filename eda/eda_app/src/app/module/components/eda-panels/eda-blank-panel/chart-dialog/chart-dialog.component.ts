
import { PanelChartComponent } from './../panel-charts/panel-chart.component';
import { Component, Input, ViewChild, AfterViewChecked } from '@angular/core';
import { EdaDialog, EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import * as _ from 'lodash';
import { StyleProviderService, ChartUtilsService, AlertService, SpinnerService, DashboardService, MediaService } from '@eda/services/service.index';
import { PanelChart } from '../panel-charts/panel-chart';
import { ChartConfig } from '../panel-charts/chart-configuration-models/chart-config';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EdaDialog2Component } from '@eda/shared/components/shared-components.index';
import { ColorPickerModule } from 'primeng/colorpicker';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { PredictionDialogComponent, PredictionConfig, QueryColumn } from '../prediction-dialog/prediction-dialog.component';
import { CategoryChartType, getChartCategoryValues, getSankeyRowLabels } from '../panel-charts/chart-category-values.util';
import { ChartDialogFeatures, CHART_DIALOG_FEATURES, CATEGORY_TRANSITION_MS_DEFAULT, resolveChartDialogFeatures } from './chart-dialog-features';
import { MediaLibraryComponent } from '@eda/components/media-library/media-library.component';
import Swal from 'sweetalert2';

@Component({
    standalone: true,
    selector: 'app-chart-dialog',
    templateUrl: './chart-dialog.component.html',
    styleUrls: ['./chart-dialog.component.css'],
    imports: [CommonModule, FormsModule, EdaDialog2Component, PanelChartComponent, ColorPickerModule, PredictionDialogComponent, InputNumberModule, DropdownModule, MediaLibraryComponent]
})

export class ChartDialogComponent implements AfterViewChecked {
    @Input() controller: any;
    @Input() dashboard: any;
    @ViewChild('PanelChartComponent', { static: false }) panelChartComponent: PanelChartComponent;

    /** Per-type capability descriptor - drives every option block in the template. */
    public features: ChartDialogFeatures;

    // 'live' family working state (D3 category charts + knob). Which of these the type actually
    // shows/persists is decided by the has* flags on `features`, not by any per-type branch.
    public liveChartType: CategoryChartType | 'knob';
    public innerRadiusPercent: number = 50;
    public topNCount: number = 10;
    public transitionMs: number = CATEGORY_TRANSITION_MS_DEFAULT;
    public showTimeline: boolean = false;
    public min: number;
    public max: number;
    public semaphoreColor: boolean = false;
    // Per-category media-library images (raceBar / bubblechart). Parallel array to assignedColors.
    public useIcons: boolean = false;
    public assignedIcons: { value: string | number; icon: string }[] = [];
    public iconPickerOpenForIndex: number | null = null;
    public matchFolderPickerOpen = false;
    private liveSeeded: boolean = false;
    private originalLive: any;

    public dialog: EdaDialog;
    public activeTabIndex: number = 0;
    public chart: any;
    public addTrend: boolean;
    public addComparative: boolean;
    public numberOfColumns: number;
    public panelChartConfig: PanelChart = new PanelChart();
    public showTrend: boolean = false;
    public showComparative: boolean = false;
    public showNumberOfColumns: boolean = false;
    public display: boolean = false;
    public showLabels: boolean = false;
    public showLabelsPercent: boolean = false;
    public labelColorMode: string = 'series';
    public labelCustomColor: string = '#000000';
    public showUniqueColors: boolean = false;
    public showPointLines: boolean = false;
    public secondAxis: boolean = false;
    public showPredictionLines: boolean = false;
    public chartLegend: boolean = true;
    public showGridLines: boolean = true;
    public useGradient: boolean = true;
    public useRoundedBars: boolean = true;
    public chartAnimation: boolean = true;
    public showPredictionDialog: boolean = false;
    public predictionMethod: string = 'Arima';
    public selectedPalette: { name: string; paleta: any } | null = null;
    public allPalettes: any = this.stylesProviderService.ChartsPalettes;
    public assignedColors: { value: string; color: string; opacity?: number }[] = [];
    private originalAssignedColors: { value: string; color: string; opacity?: number }[] = [];
    public uniqueBarColors: { value: string; color: string }[] = [];
    private originalUniqueBarColors: { value: string; color: string }[] = [];

    // Colored bars thresholds
    public coloredBarsActive: boolean = false;
    public thresholdHigh: number | null = null;
    public thresholdLow: number | null = null;
    public colorAbove: string = '#ff4444';
    public colorBetween: string = '#ffcc00';
    public colorBelow: string = '#44bb44';

    public comparativeTooltip = $localize`:@@comparativeTooltip:La función de comparar sólo se puede activar si se dispone de un campo de fecha agregado por mes o semana y un único campo numérico agregado`
    public trendTooltip = $localize`:@@trendTooltip:La función de añadir tendencia sólo se puede activar en los gràficos de lineas`
    public showLablesTooltip = $localize`:@@showLablesTooltip:Mostrar o ocultar las etiquetas sobre los gráficos`
    public showLablesPercentTooltip = $localize`:@@showLablesPercentTooltip:Mostrar o ocultar las etiquetas en porcentaje sobre los gráficos`
    public columnsTooltip = $localize`:@@columnsTooltip:Elige cuantas columnas quieres mostrar`
    public tooltipBlockedByComparative = $localize`:@@tooltipBlockedByComparative:Bloqueado porque comparativa está activa`
    public tooltipBlockedByTrendOrPrediction = $localize`:@@tooltipBlockedByTrendOrPrediction:Bloqueado porque tendencia o predicción está activa`

    // Save the original label values
    private originalLabelValues: {
        addTrend: boolean;
        showLabels: boolean;
        showLabelsPercent: boolean;
        labelColorMode: string;
        labelCustomColor: string;
        showUniqueColors: boolean;
        showPointLines: boolean;
        secondAxis: boolean;
        showPredictionLines: boolean;
        numberOfColumns: number;
        addComparative: boolean;
        chartLegend: boolean;
        showGridLines: boolean;
        useGradient: boolean;
        useRoundedBars: boolean;
        chartAnimation: boolean;
    };

    public drops = {
        pointStyles: [],
        pointSizes: [],
        grid: [],
        direction: [],
        stacked: []
    };

    public pointStyle: any;
    public direction: any = { label: '', value: '' };
    public stacked: any;
    public id: any;
    public title: string = $localize`:@@ChartProps:PROPIEDADES DEL GRAFICO`

    constructor(private chartUtils: ChartUtilsService, private stylesProviderService: StyleProviderService,
        private alertService: AlertService,
        private spinnerService: SpinnerService,
        private dashboardService: DashboardService,
        private mediaService: MediaService
    ) {
        this.drops.pointStyles = [
            { label: 'Puntos', value: 'circle' },
            { label: 'Triangulos', value: 'triangle' },
            { label: 'Rectangulos', value: 'rect' },
            { label: 'Cruces', value: 'cross' },
            { label: 'Estrella', value: 'star' },
            { label: 'Linia', value: 'line' }
        ];

        this.drops.grid = [
            { label: 'Mostrar', value: true },
            { label: 'Ocultar', value: false }
        ];

        this.drops.direction = [
            { label: 'Vertical', value: 'bar' },
            { label: 'Horizontal', value: 'horizontalBar' }
        ];

        this.drops.stacked = [
            { label: 'Sin apilar', value: false },
            { label: 'Apilar', value: true }
        ];
    }

    ngOnInit(): void {
        this.panelChartConfig = this.controller.params.config;
        this.chart = this.controller.params.chart;

        const resolved = resolveChartDialogFeatures(this.chart?.edaChart, this.chart?.chartType ?? this.controller.params.chartType);
        if (!resolved) console.error('[chart-dialog] no features for', this.chart?.edaChart, this.chart?.chartType);
        this.features = resolved ?? CHART_DIALOG_FEATURES['bar'];

        this.features.family === 'live' ? this.initLive() : this.initAxis();
    }


    private initAxis(): void {
        this.addTrend = this.controller.params.config.config.getConfig()['addTrend'] || false;
        this.showLabels = this.controller.params.config.config.getConfig()['showLabels'] || false;
        this.showLabelsPercent = this.controller.params.config.config.getConfig()['showLabelsPercent'] || false;
        this.labelColorMode = this.controller.params.config.config.getConfig()['labelColorMode'] || 'series';
        this.labelCustomColor = this.controller.params.config.config.getConfig()['labelCustomColor'] || '#000000';
        this.showUniqueColors = this.controller.params.config.config.getConfig()['showUniqueColors'] || false;
        this.showPointLines = this.controller.params.config.config.getConfig()['showPointLines'] || false;
        this.secondAxis = this.controller.params.config.config.getConfig()['secondAxis'] || false;
        this.showPredictionLines = this.controller.params.config.config.getConfig()['showPredictionLines'] || false;
        this.predictionMethod = this.controller.params.config.config.getConfig()['predictionMethod'] || 'Arima'; // Initial value in the dropdown
        // NOT `|| false` - numberOfColumns is a number (or unset), and transformDataQuery's own
        // "was it actually provided" check is `!isNaN(numberOfColumns) && numberOfColumns !== null`,
        // which treats `false` as a valid override (isNaN(false) is false, coerced to 0) - that
        // silently zeroed out every histogram bin count on the very next dialog option change,
        // since every setter round-trips this same field back into the shared config.
        this.numberOfColumns = this.controller.params.config.config.getConfig()['numberOfColumns'] ?? undefined;
        this.addComparative = this.controller.params.config.config.getConfig()['addComparative'] || false;
        this.chartLegend = this.controller.params.config.config.getConfig()['chartLegend'] ?? true;
        this.showGridLines = this.controller.params.config.config.getConfig()['showGridLines'] ?? true;
        this.useGradient = this.controller.params.config.config.getConfig()['useGradient'] ?? true;
        this.useRoundedBars = this.controller.params.config.config.getConfig()['useRoundedBars'] ?? true;
        this.chartAnimation = this.controller.params.config.config.getConfig()['chartAnimation'] ?? true;

        // NEW: Save original label values
        this.originalLabelValues = {
            addTrend: this.addTrend,
            showLabels: this.showLabels,
            showLabelsPercent: this.showLabelsPercent,
            labelColorMode: this.labelColorMode,
            labelCustomColor: this.labelCustomColor,
            showUniqueColors: this.showUniqueColors,
            showPointLines: this.showPointLines,
            secondAxis: this.secondAxis,
            showPredictionLines: this.showPredictionLines,
            numberOfColumns: this.numberOfColumns,
            addComparative: this.addComparative,
            chartLegend: this.chartLegend,
            showGridLines: this.showGridLines,
            useGradient: this.useGradient,
            useRoundedBars: this.useRoundedBars,
            chartAnimation: this.chartAnimation
        };

        this.chart = this.controller.params.chart;
        this.showTrend = this.chart.chartType === 'line';
        this.showNumberOfColumns = this.controller.params.chart.edaChart === 'histogram';
        this.showComparative = this.allowCoparative(this.controller.params);
        this.load();
        this.loadChartColors();

        // Load colored bars config
        const coloredBarsConfig = this.controller.params.config.config.getConfig()['coloredBarsConfig'];
        if (coloredBarsConfig) {
            this.thresholdHigh = coloredBarsConfig.thresholdHigh ?? null;
            this.thresholdLow = coloredBarsConfig.thresholdLow ?? null;
            this.colorAbove = coloredBarsConfig.colorAbove ?? '#ff4444';
            this.colorBetween = coloredBarsConfig.colorBetween ?? '#ffcc00';
            this.colorBelow = coloredBarsConfig.colorBelow ?? '#44bb44';
            this.coloredBarsActive = coloredBarsConfig.active ?? false;
            if (this.coloredBarsActive) {
                this.activeTabIndex = this.intervalTabIndex;
                this.applyColorsToChart();
            }
        }
        if (!this.coloredBarsActive && this.showUniqueColors && this.showUniqueColorsTab) {
            this.activeTabIndex = 1;
        }
        this.display = true;
    }

    // ---------------------------------------------------------------------------
    // 'live' family: every D3 category chart (doughnut / polarArea / sunburst /
    // treeMap / scatterPlot / bubblechart / parallelSets / funnel / raceBar) plus
    // the knob gauge. Preview = mutate the shared config + changeChartType(). Which
    // fields exist is decided entirely by the has* flags on `features`.
    // ---------------------------------------------------------------------------

    private readonly LIVE_FIELDS = [
        'chartLegend', 'showGridLines', 'showLabels', 'showLabelsPercent', 'showTimeline',
        'innerRadiusPercent', 'useGradient', 'chartAnimation', 'labelColorMode', 'labelCustomColor',
        'topNCount', 'transitionMs', 'min', 'max', 'semaphoreColor', 'useIcons',
    ] as const;

    private initLive(): void {
        this.liveChartType = (this.chart?.chartType ?? this.controller.params.chartType) as CategoryChartType | 'knob';
        const cfg = this.controller.params.config.config.getConfig();
        this.chartLegend = cfg['chartLegend'] ?? true;
        this.showGridLines = cfg['showGridLines'] ?? true;
        this.showLabels = cfg['showLabels'] ?? false;
        this.showLabelsPercent = cfg['showLabelsPercent'] ?? false;
        this.showTimeline = cfg['showTimeline'] ?? false;
        this.innerRadiusPercent = cfg['innerRadiusPercent'] ?? 50;
        this.useGradient = cfg['useGradient'] ?? true;
        this.chartAnimation = cfg['chartAnimation'] ?? true;
        this.labelColorMode = cfg['labelColorMode'] || 'series';
        this.labelCustomColor = cfg['labelCustomColor'] || '#000000';
        this.topNCount = cfg['topNCount'] ?? 10;
        this.transitionMs = cfg['transitionMs'] ?? CATEGORY_TRANSITION_MS_DEFAULT;
        this.semaphoreColor = cfg['semaphoreColor'] ?? false;
        this.useIcons = cfg['useIcons'] ?? false;
        this.min = (cfg['limits'] || [])[0];
        this.max = (cfg['limits'] || [])[1];
        this.display = true;
    }

    ngAfterViewChecked(): void {
        if (this.features?.family !== 'live' || this.liveSeeded || !this.panelChartComponent?.componentRef) return;
        // knob resolves colour/limits off its rendered instance; category types wait until the
        // chart has data so getChartCategoryValues() returns the real category list.
        setTimeout(() => this.seedLive(), this.liveChartType === 'knob' ? 100 : 0);
    }

    private seedLive(): void {
        const instance = this.panelChartComponent?.componentRef?.instance;
        if (!instance) return;
        const cfg = this.panelChartComponent.props.config.getConfig();
        const existing: { value: any; color: string }[] = cfg['assignedColors'] || [];

        if (this.liveChartType === 'knob') {
            const label = this.panelChartConfig.data?.labels?.[0] ?? $localize`:@@colorsChartH6:Colores`;
            this.assignedColors = [{ value: label, color: existing[0]?.color || instance.color }];
            const limits = instance.limits || [];
            this.min = limits[0] ?? this.min;
            this.max = limits[1] ?? this.max;
            this.semaphoreColor = !!instance.inject?.semaphoreColor;
            this.chartAnimation = instance.inject?.chartAnimation ?? this.chartAnimation;
        } else {
            const values = getChartCategoryValues(this.liveChartType as CategoryChartType, instance);
            if (!values?.length) return;
            this.assignedColors = values.map((value, i) => {
                const match = existing.find(c => c.value === value);
                return { value: value as string, color: match?.color || this.stylesProviderService.getPaletteColor(i) };
            });
            if (this.features.hasIcons) {
                const existingIcons: { value: any; icon: string }[] = cfg['assignedIcons'] || [];
                this.assignedIcons = values.map(value => ({
                    value: value as string,
                    icon: existingIcons.find(c => c.value === value)?.icon || '',
                }));
            }
        }
        this.liveSeeded = true;
        this.originalLive = this.snapshotLive();
    }

    private snapshotLive(): any {
        const snap: any = {
            assignedColors: this.assignedColors.map(c => ({ ...c })),
            assignedIcons: this.assignedIcons.map(c => ({ ...c })),
        };
        this.LIVE_FIELDS.forEach(f => snap[f] = (this as any)[f]);
        return snap;
    }

    /** Writes the 'live'-family's enabled fields into the shared config (no re-render). */
    private persistLive(): void {
        const cfg = this.panelChartComponent.props.config.getConfig();
        const s = this.features;
        cfg['assignedColors'] = [...this.assignedColors];
        cfg['chartAnimation'] = this.chartAnimation;
        if (s.hasLegend) cfg['chartLegend'] = this.chartLegend;
        if (s.hasGridLines) cfg['showGridLines'] = this.showGridLines;
        if (s.hasLabels) cfg['showLabels'] = this.showLabels;
        if (s.hasLabelsPercent) cfg['showLabelsPercent'] = this.showLabelsPercent;
        if (s.hasTimeline) cfg['showTimeline'] = this.showTimeline;
        if (s.hasUseGradient) cfg['useGradient'] = this.useGradient;
        if (s.hasInnerRadius) cfg['innerRadiusPercent'] = this.innerRadiusPercent;
        if (s.hasTopNCount) cfg['topNCount'] = this.topNCount;
        if (s.hasTransitionMs) cfg['transitionMs'] = this.transitionMs;
        if (s.hasSemaphore) cfg['semaphoreColor'] = this.semaphoreColor;
        if (s.hasLimits) cfg['limits'] = [this.min, this.max];
        if (s.hasIcons) { cfg['useIcons'] = this.useIcons; cfg['assignedIcons'] = [...this.assignedIcons]; }
        if (s.hasLabels || s.hasLabelsPercent) {
            cfg['labelColorMode'] = this.labelColorMode;
            cfg['labelCustomColor'] = this.labelCustomColor;
        }

        if (this.liveChartType === 'parallelSets') {
            // Sankey's colors[] is positional-per-row, not positional-per-unique-label.
            const rowLabels = getSankeyRowLabels(this.panelChartComponent.componentRef.instance);
            const map: Record<string, string> = {};
            this.assignedColors.forEach(c => { map[c.value as string] = c.color; });
            cfg['colors'] = [...new Set(rowLabels.map(l => map[l]))];
        } else {
            cfg['colors'] = this.assignedColors.map(c => c.color);
        }
    }

    /** Live color editor: spread the palette dropdown across every row (or the two ends for funnel). */
    private applyLivePalette(): void {
        if (!this.selectedPalette) return;
        const palette = this.selectedPalette.paleta;
        const endsOnly = this.features.colorEditorShape === 'start-end';
        this.assignedColors = this.assignedColors.map((item, i) => ({
            value: item.value,
            color: endsOnly ? (i === 0 ? palette[0] : palette[palette.length - 1]) : palette[i % palette.length],
        }));
        this.applyOption();
    }

    private buildLiveSaveResponse(): any {
        this.applyOption();
        const cfg = this.panelChartComponent.props.config.getConfig();
        const s = this.features;
        const r: any = { assignedColors: [...this.assignedColors], colors: cfg['colors'], chartAnimation: this.chartAnimation };
        if (s.hasLegend) r.chartLegend = this.chartLegend;
        if (s.hasGridLines) r.showGridLines = this.showGridLines;
        if (s.hasLabels) r.showLabels = this.showLabels;
        if (s.hasLabelsPercent) r.showLabelsPercent = this.showLabelsPercent;
        if (s.hasLabels || s.hasLabelsPercent) { r.labelColorMode = this.labelColorMode; r.labelCustomColor = this.labelCustomColor; }
        if (s.hasUseGradient) r.useGradient = this.useGradient;
        if (s.hasInnerRadius) r.innerRadiusPercent = this.innerRadiusPercent;
        if (s.hasTopNCount) r.topNCount = this.topNCount;
        if (s.hasTransitionMs) r.transitionMs = this.transitionMs;
        if (s.hasTimeline) r.showTimeline = this.showTimeline;
        if (s.hasSemaphore) r.semaphoreColor = this.semaphoreColor;
        if (s.hasLimits) { r.limits = [this.min, this.max]; this.stylesProviderService.palKnob = false; }
        if (s.hasIcons) { r.useIcons = this.useIcons; r.assignedIcons = [...this.assignedIcons]; }
        return r;
    }

    private restoreLive(): void {
        if (!this.originalLive) return;
        this.assignedColors = this.originalLive.assignedColors.map((c: any) => ({ ...c }));
        this.assignedIcons = (this.originalLive.assignedIcons || []).map((c: any) => ({ ...c }));
        this.LIVE_FIELDS.forEach(f => (this as any)[f] = this.originalLive[f]);
        this.applyOption();
    }

    // --- Icons (raceBar / bubblechart) - media-library image per category -------

    openIconPicker(idx: number): void {
        this.iconPickerOpenForIndex = idx;
    }

    onIconSelected(url: string, idx: number | null): void {
        if (idx === null) return;
        this.assignedIcons[idx].icon = url;
        this.iconPickerOpenForIndex = null;
        this.applyOption();
    }

    removeIcon(idx: number): void {
        this.assignedIcons[idx].icon = '';
        this.applyOption();
    }

    openMatchFolderPicker(): void {
        this.matchFolderPickerOpen = true;
    }

    /** Bulk-assigns icons by filename: for every category, a file in `folder` whose name (minus
     * extension, normalized) equals the category's own value gets assigned; anything without a match
     * is cleared. One-shot action - the per-row picker/remove buttons still let the user correct it. */
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
                this.applyOption();

                const total = this.assignedIcons.length;
                this.alertService.addSuccess(
                    `${$localize`:@@raceBarMatchingIconsDone:Iconos asignados por coincidencia de nombre`}: ${matched}/${total}`
                );
            },
            error: (err: any) => this.alertService.addError(err)
        });
    }

    /** Case/accent-insensitive key for matching a category value against a filename (e.g. "México" ~ "mexico.png"). */
    private normalizeForMatch(value: string): string {
        const combiningDiacritics = new RegExp(`[\\u0300-\\u036f]`, 'g');
        return value.trim().toLowerCase().normalize('NFD').replace(combiningDiacritics, '');
    }

    load() {
        this.loadChartTypeProperties();
    }

    loadChartColors() {
        // Retrieve assignedColors saved in config
        const existingColors = this.controller.params.config.config.getConfig()['assignedColors'] || [];
        // Get labels based on the chart type
        const labels = this.getChartLabels();

        // Create assignedColors by mapping labels to colors
        if (this.chart['edaChart'] === 'histogram') {
            this.assignedColors = labels.map((label, index) => {
                const match = existingColors.find(c => c.value === label);
                return {
                    value: label,
                    color: existingColors[0]?.color,
                };
            });
        } else {
            this.assignedColors = labels.map((label, index) => {
                const match = existingColors.find(c => c.value === label);
                // Trend/prediction rows default to their source series' color (and, for area, a
                // lighter 25% default opacity) instead of the next palette slot - still fully
                // editable afterwards like any other row.
                const ds: any = this.chart.chartDataset?.find((d: any) => d.label === label);
                const isDerived = !!(ds?.isTrend || ds?.isPrediction);
                const sourceColor = isDerived ? existingColors.find(c => c.value === ds.sourceLabel)?.color : undefined;
                return {
                    value: label,
                    color: match?.color || sourceColor || this.getDefaultColor(index),
                    opacity: match?.opacity ?? (isDerived ? 25 : 100)
                };
            });
        }

        // Load uniqueBarColors from chartLabels (for bars) before applyColorsToChart
        const savedUniqueColors = this.controller.params.config.config.getConfig()['uniqueBarColors'] || [];
        const barLabels: string[] = this.chart.chartLabels || [];
        this.uniqueBarColors = barLabels.map((label, index) => {
            const match = savedUniqueColors.find(c => c.value === label);
            return { value: label, color: match?.color || this.getDefaultColor(index) };
        });

        // Apply colors to the chart
        this.applyColorsToChart();

        // Save the preview for cancellation
        this.originalAssignedColors = _.cloneDeep(this.assignedColors);
        this.originalUniqueBarColors = _.cloneDeep(this.uniqueBarColors);
    }

    loadChartTypeProperties() {
        // edaChart, not chartType - chartType is always literally 'bar' for every bar subtype,
        // so switching on it here meant the 'horizontalBar' case below could never be reached.
        const type: any = this.chart['edaChart'];
        switch (type) {
            case 'bar':
                this.direction = { label: 'Vertical', value: 'bar' };
                break;
            case 'horizontalBar':
                this.direction = { label: 'Horizontal', value: 'horizontalBar' };
                break;
            case 'line':
                this.pointStyle = _.find(this.drops.pointStyles, key =>
                    key.value === _.get(this.chart.chartOptions, 'elements.point.pointStyle')
                );
                break;
        }
    }

    // Axis-family label list (category types seed their rows from getChartCategoryValues instead).
    private getChartLabels(): string[] {
        return this.chart.chartDataset?.map(d => d.label) || [];
    }


    // Methods that update the chart configuration

    /** Flags the dashboard as having unsaved changes - called by every live-editing entry point
     * below, not just the final "Guardar" button (which already goes through eda-blank-panel's
     * onCloseChartProperties -> setNotSaved(true) on its own). */
    private markUnsaved(): void {
        this.dashboardService.setNotSaved(true);
    }

    /** Single place every live setter funnels through: writes this dialog's whole field set into
     * the shared config, avoiding the old pattern of repeating the same field list per setter. */
    private buildCustomFieldsPatch(): any {
        return {
            addTrend: this.addTrend,
            addComparative: this.addComparative,
            showLabels: this.showLabels,
            showLabelsPercent: this.showLabelsPercent,
            showPointLines: this.showPointLines,
            secondAxis: this.secondAxis,
            showPredictionLines: this.showPredictionLines,
            numberOfColumns: this.numberOfColumns,
            assignedColors: [...this.assignedColors],
            chartLegend: this.chartLegend,
            labelColorMode: this.labelColorMode,
            labelCustomColor: this.labelCustomColor,
            coloredBarsConfig: {
                thresholdHigh: this.thresholdHigh,
                thresholdLow: this.thresholdLow,
                colorAbove: this.colorAbove,
                colorBetween: this.colorBetween,
                colorBelow: this.colorBelow,
                active: this.coloredBarsActive
            },
            showUniqueColors: this.showUniqueColors,
            uniqueBarColors: [...this.uniqueBarColors],
            showGridLines: this.showGridLines,
            useGradient: this.useGradient,
            useRoundedBars: this.useRoundedBars,
            chartAnimation: this.chartAnimation
        };
    }

    private syncCustomFields(): void {
        Object.assign(this.controller.params.config.config.getConfig(), this.buildCustomFieldsPatch());
    }

    /**
     * Re-renders the axis-family preview after a config change.
     *  - `rebuild` true  → the option changed the dataset (trend/comparative/prediction/histogram
     *    bins), so re-instantiate PanelChart (its ngOnChanges re-runs the query path).
     *  - `rebuild` false → visual-only option; just re-render the D3 component in place from config.
     * Either way the dialog re-grabs `this.chart` and reconciles the colour rows afterwards.
     */
    private refreshPreview(rebuild = true): void {
        this.markUnsaved();
        if (rebuild) this.panelChartConfig = new PanelChart(this.panelChartConfig);
        else this.panelChartComponent.changeChartType();
        setTimeout(_ => {
            this.chart = this.panelChartComponent.componentRef.instance.inject;
            this.load();
            this.syncAssignedColorsWithChart();
        });
    }

    /**
     * Single entry point for every display-option setter, both families. `requery` marks the option
     * as one that changes the dataset (axis only). Live charts never requery - their preview is
     * always an in-place config mutation + changeChartType().
     */
    public applyOption(requery = false): void {
        if (this.features.family === 'live') {
            this.persistLive();
            this.markUnsaved();
            this.panelChartComponent.changeChartType();
            return;
        }
        this.syncCustomFields();
        this.refreshPreview(requery);
    }

    // Toggles like Tendencia/Comparativa add or remove a dataset (and its label) on the fly - keeps
    // assignedColors' row list matching the chart's current labels immediately, without waiting for
    // a dialog close/reopen. Existing rows (and their colors/opacity) are preserved untouched.
    private syncAssignedColorsWithChart(): void {
        const labels = this.getChartLabels();
        const existingByLabel = new Map(this.assignedColors.map(c => [c.value, c]));
        this.assignedColors = labels.map((label, index) => {
            const existing = existingByLabel.get(label);
            if (existing) return existing;
            const ds: any = this.chart.chartDataset?.find((d: any) => d.label === label);
            const isDerived = !!(ds?.isTrend || ds?.isPrediction);
            const sourceColor = isDerived ? existingByLabel.get(ds.sourceLabel)?.color : undefined;
            return {
                value: label,
                color: sourceColor || this.getDefaultColor(index),
                opacity: isDerived ? 25 : 100
            };
        });
        this.applyColorsToChart();
    }

    SetNumberOfColumns() {
        this.applyOption(true);
    }

    checkTrend() {
        this.applyOption(true);
    }

    setComparative() {
        this.applyOption(true);
    }

    setShowLablesPercent() {
        this.applyOption();
    }

    allowCoparative(params) {

        let monthformat = false;
        const haveDate = params.config.query.filter(field => field.column_type === 'date').length > 0 // there is a date
        if (haveDate) {
            monthformat = ['month', 'week','day'].includes(params.config.query.filter(field => field.column_type === 'date')[0].format);
        }
        const chartAllowed = ['line', 'bar'].includes(params.config.chartType);
        const onlyTwoCols = params.config.query.length === 2;

        const aggregation =
            params.config.query.filter(col => col.column_type === 'numeric')
                .map(col => col.aggregation_type
                    .filter(agg => agg.selected === true && agg.value !== 'none')
                    .map(agg => agg.selected))
                .reduce((a, b) => a || b, false)[0];


        return haveDate && chartAllowed && onlyTwoCols && monthformat && aggregation;

    }


    setShowLables() {
        this.applyOption();
    }

    setLabelColor() {
        this.applyOption();
    }

    labelColorButtonClass(mode: string): Record<string, boolean> {
        const active = this.labelColorMode === mode;
        return {
            'bg-[var(--corporate-primary)] text-white': active
        };
    }

    setChartLegend() {
        this.applyOption();
    }

    setShowGridLines() {
        this.applyOption();
    }

    setShowLines() {
        this.applyOption(true);
    }

    setSecondAxis() {
        this.applyOption(true);
    }

    setChartAnimation() {
        this.applyOption();
    }

    setPredictionLines() {
        if (this.showPredictionLines) {
            // Toggle ON -> open the prediction configuration dialog
            this.showPredictionDialog = true;
        } else {
            // Toggle OFF -> confirm with Swal before removing the prediction
            Swal.fire({
                title: $localize`:@@RemovePredictionTitle:¿Quieres quitar la predicción?`,
                text: $localize`:@@RemovePredictionText:Se quitará la predicción y se ejecutará la consulta del gráfico.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: $localize`:@@RemovePredictionYes:Sí, quitar`,
                cancelButtonText: $localize`:@@RemovePredictionNo:No, mantener`,
                didOpen: () => {
                    const container = document.querySelector('.swal2-container') as HTMLElement;
                    if (container) {
                        container.style.zIndex = '10000';
                    }
                }
            }).then(async (result) => {
                if (result.isConfirmed) {
                    await this.applyPrediction('None');
                } else {
                    // Canceled -> switch back to ON
                    this.showPredictionLines = true;
                }
            });
        }
    }

    // Returns the visible tables from the panel data model.
    get modelTables(): any[] {
        const panelID = this.controller.params.panelId;
        const dashboardPanel = this.dashboard?.edaPanels?.toArray().find(cmp => cmp.panel.id === panelID);
        if (!dashboardPanel?.dataSource?.model?.tables) return [];
        return dashboardPanel.dataSource.model.tables.filter(t => t.visible !== false);
    }

    /** Returns the numeric columns from the current query for the TensorFlow target column selector */
    get queryNumericColumns(): QueryColumn[] {
        const queryFields: any[] = this.controller?.params?.config?.query;
        if (!queryFields) return [];
        return queryFields
            .filter(f => f.column_type === 'numeric')
            .map(f => ({
                column_name: f.column_name,
                table_id: f.table_id,
                display_name: typeof f.display_name === 'object' ? (f.display_name.default || f.column_name) : (f.display_name || f.column_name)
            }));
    }

    async confirmPrediction(predictionConfig: PredictionConfig) {
        this.showPredictionDialog = false;
        this.predictionMethod = predictionConfig.method;

        // Show the spinner while the prediction runs
        this.spinnerService.on();

        // Update the chart config
        this.syncCustomFields();
        this.controller.params.config.config.getConfig()['predictionMethod'] = this.predictionMethod;
        this.panelChartConfig = new PanelChart(this.panelChartConfig);

        // Set prediction and configuration in the panel query
        const panelID = this.controller.params.panelId;
        const dashboardPanel = this.dashboard?.edaPanels?.toArray().find(cmp => cmp.panel.id === panelID);
        if (!dashboardPanel) {
            this.spinnerService.off();
            return;
        }
        dashboardPanel.panel.content.query.query.prediction = predictionConfig.method;
        dashboardPanel.panel.content.query.query.predictionConfig = {
            steps: predictionConfig.steps,
            targetColumn: predictionConfig.targetColumn,
            arimaParams: predictionConfig.arimaParams,
            tensorflowParams: predictionConfig.tensorflowParams,
        };

        // Run the query and save the config
        try {
            await dashboardPanel.runQueryFromDashboard(true);
        } finally {
            this.spinnerService.off();
        }
        this.saveChartConfig();
    }

    /** The user canceled the dialog: close it and switch the toggle back to OFF */
    cancelPrediction() {
        this.showPredictionDialog = false;
        this.showPredictionLines = false;
    }

    /**
     * Updates the chart config, writes the type to the panel query,
     * and reruns the query.
     */
    private async applyPrediction(type: string) {
        this.syncCustomFields();
        this.panelChartConfig = new PanelChart(this.panelChartConfig);

        const panelID = this.controller.params.panelId;
        const dashboardPanel = this.dashboard?.edaPanels?.toArray().find(cmp => cmp.panel.id === panelID);
        if (!dashboardPanel) return;
        dashboardPanel.panel.content.query.query.prediction = type;

        await dashboardPanel.runQueryFromDashboard(true);
        this.saveChartConfig();
    }


    // Chart color management methods

    // Get default color by index
    private getDefaultColor(index: number): string {
        const palette = this.stylesProviderService.ActualChartPalette?.['paleta'];
        return palette[index % palette.length];
    }

    // Keeps the live D3 components' native color source (assignedColors, plus categoryColorOverrides
    // for bar's per-category threshold/unique modes) in sync with the dialog's own working state on
    // every edit - the D3 components resolve color/opacity from these fields directly now, no more
    // Chart.js-shaped chartColors/chartDataset intermediate to maintain.
    private applyColorsToChart(): void {
        const type = this.chart['edaChart'];
        const isBar = type === 'bar' || type === 'horizontalBar';

        this.chart.assignedColors = [...this.assignedColors];

        const hasThresholds = this.thresholdHigh !== null || this.thresholdLow !== null;
        if (isBar && this.coloredBarsActive && hasThresholds && this.thresholdsValid && this.chart.chartDataset?.[0]?.data) {
            const bothThresholds = this.thresholdHigh !== null && this.thresholdLow !== null;
            const dataset = this.chart.chartDataset[0];
            const baseColor = this.assignedColors.find(c => c.value === dataset.label)?.color || this.getDefaultColor(0);
            this.chart.categoryColorOverrides = (this.chart.chartLabels || []).map((label: string, idx: number) => {
                const value = dataset.data[idx];
                let color = baseColor;
                if (this.thresholdHigh !== null && value > this.thresholdHigh) color = this.colorAbove;
                else if (this.thresholdLow !== null && value < this.thresholdLow) color = this.colorBelow;
                else if (bothThresholds) color = this.colorBetween;
                return { value: label, color };
            });
        } else if (isBar && this.showUniqueColors && this.uniqueBarColors.length > 0) {
            this.chart.categoryColorOverrides = [...this.uniqueBarColors];
        } else {
            this.chart.categoryColorOverrides = undefined;
        }
    }

    handleUniqueColorInput(): void {
        this.markUnsaved();
        this.applyColorsToChart();
        this.controller.params.config.config.getConfig()['uniqueBarColors'] = [...this.uniqueBarColors];
        if (this.panelChartComponent?.componentRef?.instance) {
            this.panelChartComponent.componentRef.instance.inject = this.chart;
            this.panelChartComponent.componentRef.instance.updateChart();
        }

        this.updateChartView();
    }

    // Simplified method for color changes
    handleInputColor(): void {
        if (this.features?.family === 'live') {
            this.applyOption();
            return;
        }
        this.markUnsaved();
        // Apply assignedColors to the chart
        this.applyColorsToChart();

        // Re-render
        if (this.panelChartComponent?.componentRef?.instance) {
            this.panelChartComponent.componentRef.instance.inject = this.chart;
            this.panelChartComponent.componentRef.instance.updateChart();
        }
        this.updateChartView();

    }

    stepOpacity(idx: number, delta: number): void {
        const current = this.assignedColors[idx].opacity ?? 100;
        this.assignedColors[idx].opacity = Math.min(100, Math.max(0, current + delta));
        this.handleInputColor();
    }

    private updateChartView(): void {
        if (!this.panelChartComponent?.componentRef?.instance) {
            console.error('No hay componentRef disponible');
            return;
        }

        const chartInstance = this.panelChartComponent.componentRef.instance;

        // Update inject and force change detection
        chartInstance.inject = { ...this.chart };

        // Call the component's cheap partial-update method (no full destroy+recreate).
        if (chartInstance.updateChart) {
            chartInstance.updateChart();
        }
    }


    // Apply palette
    onPaletteSelected(): void {
        if (!this.selectedPalette) return;
        if (this.features?.family === 'live') {
            this.applyLivePalette();
            return;
        }
        const palette = this.selectedPalette.paleta;

        // Always update assignedColors
        this.assignedColors = this.assignedColors.map((item, index) => ({
            value: item.value,
            color: palette[index % palette.length]
        }));

        if (this.showUniqueColors) {
            // Also update uniqueBarColors and apply those colors
            this.uniqueBarColors = this.uniqueBarColors.map((item, index) => ({
                value: item.value,
                color: palette[index % palette.length]
            }));
            this.handleUniqueColorInput();
        } else {
            this.handleInputColor();
        }
    }

    // Traffic-light bar control methods
    get thresholdsValid(): boolean {
        if (!this.coloredBarsActive) return true;
        if (this.thresholdHigh === null || this.thresholdLow === null) return true;
        return this.thresholdHigh >= this.thresholdLow;
    }

    get coloredBarsColumnHeader(): string {
        const numericCol = this.controller?.params?.config?.query?.find((f: any) => f.column_type === 'numeric');
        if (!numericCol) return '';
        return typeof numericCol.display_name === 'object'
            ? (numericCol.display_name.default || numericCol.column_name)
            : (numericCol.display_name || numericCol.column_name);
    }

    applyColoredBars(): void {
        this.syncCustomFields();
        this.handleInputColor();
    }

    applyUseGradient(): void {
        if (this.features?.family === 'live') {
            this.applyOption();
            return;
        }
        this.syncCustomFields();
        this.chart['useGradient'] = this.useGradient;
        this.handleInputColor();
    }

    applyUseRoundedBars(): void {
        this.syncCustomFields();
        this.chart['useRoundedBars'] = this.useRoundedBars;
        this.handleInputColor();
    }

    // Unique colors only make sense for a single-series bar/horizontalBar chart - when true, the
    // colors tab bar grows a third "Colores Únicos" tab between "Colores" and "Colores por intervalo".
    get showUniqueColorsTab(): boolean {
        return ['bar', 'horizontalBar'].includes(this.chart?.['edaChart'] as string) && this.queryNumericColumns.length === 1;
    }

    // "Colores por intervalo" is always the last tab, whether or not the unique-colors tab is present.
    get intervalTabIndex(): number {
        return this.showUniqueColorsTab ? 2 : 1;
    }

    setActiveTab(index: number): void {
        this.markUnsaved();
        this.activeTabIndex = index;
        // edaChart, not chartType - chartType is always literally 'bar' for every bar subtype.
        if (!['bar', 'horizontalBar'].includes(this.chart['edaChart'] as string)) return;
        // Which coloring mode is active is now purely a function of which tab is selected - there's
        // no separate on/off switch inside the "Colores Únicos" tab, being on it IS "activated".
        this.coloredBarsActive = index === this.intervalTabIndex;
        this.showUniqueColors = this.showUniqueColorsTab && index === 1;

        this.syncCustomFields();
        this.panelChartConfig = new PanelChart(this.panelChartConfig);
        setTimeout(() => {
            this.chart = this.panelChartComponent.componentRef.instance.inject;
            this.load();
            this.applyColorsToChart();
            this.updateChartView();
        });
    }

    tabButtonClass(index: number): Record<string, boolean> {
        const active = this.activeTabIndex === index;
        return {
            'bg-[var(--corporate-primary)] text-white border-[var(--corporate-primary)]': active,
            'border-transparent hover:bg-gray-200/40': !active
        };
    }

    get isAreaOrRadarChart(): boolean {
        return ['area', 'kpiarea', 'radar'].includes(this.panelChartConfig?.edaChart);
    }

    // Save/cancel configuration methods

    saveChartConfig() {
        if (this.features.family === 'live') {
            this.onClose(EdaDialogCloseEvent.UPDATE, { family: 'live', chartType: this.liveChartType, ...this.buildLiveSaveResponse() });
            return;
        }
        // Apply final colors to the live preview
        this.applyColorsToChart();
        this.syncCustomFields();

        // Small typed response - assignedColors + this family's own fields, no Chart.js shape.
        this.onClose(EdaDialogCloseEvent.UPDATE, { family: 'axis', ...this.buildCustomFieldsPatch() });
    }

    resetChartConfig() {
        // Restore original label values
        this.addTrend = this.originalLabelValues.addTrend;
        this.showLabels = this.originalLabelValues.showLabels;
        this.showLabelsPercent = this.originalLabelValues.showLabelsPercent;
        this.labelColorMode = this.originalLabelValues.labelColorMode;
        this.labelCustomColor = this.originalLabelValues.labelCustomColor;
        this.showUniqueColors = this.originalLabelValues.showUniqueColors;
        this.showPointLines = this.originalLabelValues.showPointLines;
        this.secondAxis = this.originalLabelValues.secondAxis;
        this.showPredictionLines = this.originalLabelValues.showPredictionLines;
        this.numberOfColumns = this.originalLabelValues.numberOfColumns;
        this.addComparative = this.originalLabelValues.addComparative;
        this.chartLegend = this.originalLabelValues.chartLegend;
        this.showGridLines = this.originalLabelValues.showGridLines;
        this.useGradient = this.originalLabelValues.useGradient;
        this.useRoundedBars = this.originalLabelValues.useRoundedBars;
        this.chartAnimation = this.originalLabelValues.chartAnimation;
        this.assignedColors = _.cloneDeep(this.originalAssignedColors);
        this.uniqueBarColors = _.cloneDeep(this.originalUniqueBarColors);

        this.syncCustomFields();
    }

    closeChartConfig() {
        if (this.features.family === 'live') {
            this.restoreLive();
            this.onClose(EdaDialogCloseEvent.NONE);
            return;
        }
        // Restore original colors
        this.resetChartConfig();
        this.applyColorsToChart();
        this.onClose(EdaDialogCloseEvent.NONE);
    }

    onClose(event: EdaDialogCloseEvent, response?: any): void {
        return this.controller.close(event, response);
    }
}
