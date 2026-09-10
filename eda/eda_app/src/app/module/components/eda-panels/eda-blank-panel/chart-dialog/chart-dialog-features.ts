import { DEFAULT_FRAME_DURATION_MS } from '@eda/components/eda-race-bar/eda-race-bar.component';

/**
 * Which of the two preview engines the unified chart dialog drives for a given chart type:
 *  - 'axis' : the series/axis charts (bar, line, area, radar...) - live preview rebuilds a
 *             `new PanelChart()`, trend/comparative/prediction re-run the panel query.
 *  - 'live' : everything else - the D3 part-to-whole / hierarchical charts (doughnut, sunburst,
 *             funnel, raceBar...) plus the knob gauge. Live preview just mutates the shared config
 *             and calls `changeChartType()`. Which fields exist is driven purely by the has* flags.
 */
export type ChartDialogFamily = 'axis' | 'live';

export type ColorEditorShape = 'per-series' | 'category-list' | 'start-end';

/**
 * Per-type capability descriptor: every option block in chart-dialog.component.html is gated on a
 * flag here instead of an inline `edaChart === ...` check, so adding/moving an option is a one-line
 * features edit. A flag that is irrelevant to a type is simply omitted (falsy).
 */
export interface ChartDialogFeatures {
    family: ChartDialogFamily;

    // Display-options section
    hasTrend?: boolean;
    hasComparative?: boolean;
    hasPrediction?: boolean;
    hasAnimation?: boolean;
    hasLegend?: boolean;
    hasGridLines?: boolean;
    hasPointLines?: boolean;
    hasRoundedBars?: boolean;
    hasSecondAxis?: boolean;
    hasNumberOfColumns?: boolean;
    hasLabels?: boolean;
    hasLabelsPercent?: boolean;

    // Colors section
    colorEditorShape: ColorEditorShape;
    hasUseGradient?: boolean;
    /** bar / horizontalBar: the "Colores por intervalo" threshold tab. */
    hasThresholdColors?: boolean;
    /** bar / horizontalBar with a single numeric series: the "Colores Únicos" tab. */
    hasUniqueColors?: boolean;
    /** area / radar: per-color opacity stepper. */
    hasOpacity?: boolean;

    // 'live' family extras
    hasInnerRadius?: boolean;      // doughnut
    hasTopNCount?: boolean;        // raceBar
    hasTransitionMs?: boolean;     // raceBar
    hasTimeline?: boolean;         // raceBar
    hasLimits?: boolean;           // knob - min/max numeric range of the gauge
    hasSemaphore?: boolean;        // knob - red→amber→green gradient toggle; when on it hides the manual colour editor
    hasIcons?: boolean;            // raceBar / bubblechart - assign a media-library image per category
}

const AXIS_BAR_COMMON: Partial<ChartDialogFeatures> = {
    family: 'axis',
    hasAnimation: true,
    hasLegend: true,
    hasRoundedBars: true,
    hasLabels: true,
    hasLabelsPercent: true,
    colorEditorShape: 'per-series',
    hasUseGradient: true,
};

export const CHART_DIALOG_FEATURES: Record<string, ChartDialogFeatures> = {
    // --- axis family ---------------------------------------------------------
    bar: {
        ...(AXIS_BAR_COMMON as ChartDialogFeatures),
        hasComparative: true,
        hasGridLines: true,
        hasThresholdColors: true,
        hasUniqueColors: true,
    },
    horizontalBar: {
        ...(AXIS_BAR_COMMON as ChartDialogFeatures),
        hasComparative: true,
        hasGridLines: true,
        hasThresholdColors: true,
        hasUniqueColors: true,
    },
    stackedbar: { ...(AXIS_BAR_COMMON as ChartDialogFeatures) },
    stackedbar100: { ...(AXIS_BAR_COMMON as ChartDialogFeatures) },
    pyramid: { ...(AXIS_BAR_COMMON as ChartDialogFeatures) },
    histogram: {
        ...(AXIS_BAR_COMMON as ChartDialogFeatures),
        hasNumberOfColumns: true,
    },
    line: {
        family: 'axis',
        hasTrend: true,
        hasComparative: true,
        hasPrediction: true,
        hasAnimation: true,
        hasLegend: true,
        hasGridLines: true,
        hasPointLines: true,
        hasLabels: true,
        hasLabelsPercent: true,
        colorEditorShape: 'per-series',
    },
    area: {
        family: 'axis',
        hasTrend: true,
        hasComparative: true,
        hasPrediction: true,
        hasAnimation: true,
        hasLegend: true,
        hasGridLines: true,
        hasPointLines: true,
        hasLabels: true,
        hasLabelsPercent: true,
        colorEditorShape: 'per-series',
        hasUseGradient: true,
        hasOpacity: true,
    },
    barline: {
        family: 'axis',
        hasAnimation: true,
        hasLegend: true,
        hasGridLines: true,
        hasPointLines: true,
        hasRoundedBars: true,
        hasSecondAxis: true,
        hasLabels: true,
        hasLabelsPercent: true,
        colorEditorShape: 'per-series',
        hasUseGradient: true,
    },
    radar: {
        family: 'axis',
        hasAnimation: true,
        hasLegend: true,
        hasGridLines: true,
        hasLabels: true,
        hasLabelsPercent: true,
        colorEditorShape: 'per-series',
        hasUseGradient: true,
        hasOpacity: true,
    },

    // --- live family (D3 category charts + knob) ----------------------------
    doughnut: {
        family: 'live',
        hasAnimation: true,
        hasLegend: true,
        hasLabels: true,
        hasLabelsPercent: true,
        colorEditorShape: 'category-list',
        hasUseGradient: true,
        hasInnerRadius: true,
    },
    polarArea: {
        family: 'live',
        hasAnimation: true,
        hasLegend: true,
        hasGridLines: true,
        hasLabels: true,
        hasLabelsPercent: true,
        colorEditorShape: 'category-list',
        hasUseGradient: true,
    },
    sunburst: {
        family: 'live',
        hasAnimation: true,
        hasLegend: true,
        colorEditorShape: 'category-list',
        hasUseGradient: true,
    },
    treeMap: {
        family: 'live',
        hasAnimation: true,
        hasLegend: true,
        colorEditorShape: 'category-list',
        hasUseGradient: true,
        hasIcons: true,
    },
    scatterPlot: {
        family: 'live',
        hasAnimation: true,
        hasLegend: true,
        colorEditorShape: 'category-list',
        hasUseGradient: true,
    },
    bubblechart: {
        family: 'live',
        hasAnimation: true,
        hasLegend: true,
        colorEditorShape: 'category-list',
        hasUseGradient: true,
        hasIcons: true,
    },
    parallelSets: {
        family: 'live',
        hasAnimation: true,
        hasLegend: true,
        colorEditorShape: 'category-list',
        hasUseGradient: true,
    },
    funnel: {
        family: 'live',
        hasAnimation: true,
        hasLegend: true,
        colorEditorShape: 'start-end',
        hasIcons: true,
    },
    raceBar: {
        family: 'live',
        hasAnimation: true,
        hasLegend: true,
        hasTimeline: true,
        colorEditorShape: 'category-list',
        hasUseGradient: true,
        hasTopNCount: true,
        hasTransitionMs: true,
        hasIcons: true,
    },

    knob: {
        family: 'live',
        hasAnimation: true,
        hasLimits: true,
        hasSemaphore: true,
        colorEditorShape: 'category-list',
    },
};

export const CATEGORY_TRANSITION_MS_DEFAULT = DEFAULT_FRAME_DURATION_MS;

/**
 * Resolves the features entry for a chart. `edaChart` wins when it names a known entry (bar subtypes
 * carry their variant there while `chartType` stays literally 'bar'); otherwise fall back to
 * `chartType` (the 'live' types are keyed by it).
 */
export function resolveChartDialogFeatures(edaChart: string | undefined, chartType: string | undefined): ChartDialogFeatures | undefined {
    if (edaChart && CHART_DIALOG_FEATURES[edaChart]) return CHART_DIALOG_FEATURES[edaChart];
    if (chartType && CHART_DIALOG_FEATURES[chartType]) return CHART_DIALOG_FEATURES[chartType];
    return undefined;
}
