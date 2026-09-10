import { DEFAULT_FRAME_DURATION_MS } from '@eda/components/eda-race-bar/eda-race-bar.component';

/**
 * Which of the two engines the unified chart dialog drives for a given chart type:
 *  - 'axis'     : the series/axis charts (bar, line, area, radar...) - live preview rebuilds a
 *                 `new PanelChart()`, trend/comparative/prediction re-run the panel query.
 *  - 'category' : the D3 part-to-whole / hierarchical charts (doughnut, sunburst, funnel...) -
 *                 live preview mutates the shared config and calls `changeChartType()`.
 */
export type ChartDialogFamily = 'axis' | 'category';

export type ColorEditorShape = 'per-series' | 'category-list' | 'start-end';

/**
 * Per-type capability descriptor: every option block in chart-dialog.component.html is gated on a
 * flag here instead of an inline `edaChart === ...` check, so adding/moving an option is a one-line
 * spec edit. A flag that is irrelevant to a type is simply omitted (falsy).
 */
export interface ChartDialogSpec {
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

    // Category-only extras
    hasInnerRadius?: boolean;
    hasTopNCount?: boolean;
    hasTransitionMs?: boolean;
    hasTimeline?: boolean;
}

const AXIS_BAR_COMMON: Partial<ChartDialogSpec> = {
    family: 'axis',
    hasAnimation: true,
    hasLegend: true,
    hasRoundedBars: true,
    hasLabels: true,
    hasLabelsPercent: true,
    colorEditorShape: 'per-series',
    hasUseGradient: true,
};

export const CHART_DIALOG_SPECS: Record<string, ChartDialogSpec> = {
    // --- axis family ---------------------------------------------------------
    bar: {
        ...(AXIS_BAR_COMMON as ChartDialogSpec),
        hasComparative: true,
        hasGridLines: true,
        hasThresholdColors: true,
        hasUniqueColors: true,
    },
    horizontalBar: {
        ...(AXIS_BAR_COMMON as ChartDialogSpec),
        hasComparative: true,
        hasGridLines: true,
        hasThresholdColors: true,
        hasUniqueColors: true,
    },
    stackedbar: { ...(AXIS_BAR_COMMON as ChartDialogSpec) },
    stackedbar100: { ...(AXIS_BAR_COMMON as ChartDialogSpec) },
    pyramid: { ...(AXIS_BAR_COMMON as ChartDialogSpec) },
    histogram: {
        ...(AXIS_BAR_COMMON as ChartDialogSpec),
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

    // --- category family ----------------------------------------------------
    doughnut: {
        family: 'category',
        hasAnimation: true,
        hasLegend: true,
        hasLabels: true,
        hasLabelsPercent: true,
        colorEditorShape: 'category-list',
        hasUseGradient: true,
        hasInnerRadius: true,
    },
    polarArea: {
        family: 'category',
        hasAnimation: true,
        hasLegend: true,
        hasGridLines: true,
        hasLabels: true,
        hasLabelsPercent: true,
        colorEditorShape: 'category-list',
        hasUseGradient: true,
    },
    sunburst: {
        family: 'category',
        hasAnimation: true,
        hasLegend: true,
        colorEditorShape: 'category-list',
        hasUseGradient: true,
    },
    treeMap: {
        family: 'category',
        hasAnimation: true,
        hasLegend: true,
        colorEditorShape: 'category-list',
        hasUseGradient: true,
    },
    scatterPlot: {
        family: 'category',
        hasAnimation: true,
        hasLegend: true,
        colorEditorShape: 'category-list',
        hasUseGradient: true,
    },
    bubblechart: {
        family: 'category',
        hasAnimation: true,
        hasLegend: true,
        colorEditorShape: 'category-list',
        hasUseGradient: true,
    },
    parallelSets: {
        family: 'category',
        hasAnimation: true,
        hasLegend: true,
        colorEditorShape: 'category-list',
        hasUseGradient: true,
    },
    funnel: {
        family: 'category',
        hasAnimation: true,
        hasLegend: true,
        colorEditorShape: 'start-end',
    },
    raceBar: {
        family: 'category',
        hasAnimation: true,
        hasLegend: true,
        hasTimeline: true,
        colorEditorShape: 'category-list',
        hasUseGradient: true,
        hasTopNCount: true,
        hasTransitionMs: true,
    },
};

export const CATEGORY_TRANSITION_MS_DEFAULT = DEFAULT_FRAME_DURATION_MS;

/**
 * Resolves the spec key for a chart. `edaChart` wins when it names a known spec (bar subtypes carry
 * their variant there while `chartType` stays literally 'bar'); otherwise fall back to `chartType`
 * (category types are keyed by it).
 */
export function resolveChartDialogSpec(edaChart: string | undefined, chartType: string | undefined): ChartDialogSpec | undefined {
    if (edaChart && CHART_DIALOG_SPECS[edaChart]) return CHART_DIALOG_SPECS[edaChart];
    if (chartType && CHART_DIALOG_SPECS[chartType]) return CHART_DIALOG_SPECS[chartType];
    return undefined;
}
