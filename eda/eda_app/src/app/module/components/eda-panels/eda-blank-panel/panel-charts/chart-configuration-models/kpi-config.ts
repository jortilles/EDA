export interface KpiEdaChart {
    colors: any[];
    chartType: string;
    addTrend: boolean;
    addComparative: boolean;
    showLabels: boolean;
    showLabelsPercent: boolean;
    labelColorMode: string;
    labelCustomColor: string;
    numberOfColumns: number;
    assignedColors: any[];
    showPointLines: boolean;
    showPredictionLines: boolean;
    chartLegend: boolean;
    showGridLines: boolean;
    /** X axis line, independent of showGridLines (which also controls the value axis). */
    showXAxis: boolean;
    /** X axis tick labels, independent of showGridLines. */
    showXAxisLabels: boolean;
    /** How many X axis labels to show, evenly spaced. 0 = legacy fixed-sample default. */
    xAxisLabelCount: number;
    /** Data label background color (halo behind the text). Empty = no background. */
    labelBackgroundColor: string;
    /** Main line's border width in px (kpiline/kpiarea only). */
    lineWidth: number;
    /** Main line's dash style (kpiline/kpiarea only). */
    lineStyle: 'solid' | 'dashed' | 'dotted';
    /** Line/border color override, independent of the series color (kpibar/kpiline/kpiarea). Empty = no override. */
    chartLineColor: string;
    /** Fill color override, independent of the series color (kpiarea only). Empty = no override. */
    chartFillColor: string;
    useGradient: boolean;
    useRoundedBars: boolean;
    chartAnimation: boolean;
}

export class KpiConfig {
    sufix: string = '';
    assignedColors: any[] = [];
    alertLimits: any[] = [];
    edaChart: KpiEdaChart;
    modifiedFontPoints: number = 0;
    /** Multiplicative font-size factor used in forks mode (hover +/- buttons). Only applies when KPI_CONFIG.USE_EDALITICS_SIZE_LOGIC is false. */
    fontScale: number = 1;
    /** Edalitics mode only (KPI_CONFIG.USE_EDALITICS_SIZE_LOGIC true). */
    imageScale?: number;
    valueFontScale?: number;
    sufixFontScale?: number;
    backgroundColor: string = '';
    kpiColor: string = '';
    prefixImage: string = '';
    constructor(init?: Partial<KpiConfig>) {
        this.edaChart = {
            colors: init?.edaChart?.colors || [],
            chartType: init?.edaChart?.chartType || '',
            addTrend: init?.edaChart?.addTrend || false,
            addComparative: init?.edaChart?.addComparative || false,
            showLabels: init?.edaChart?.showLabels || false,
            showLabelsPercent: init?.edaChart?.showLabelsPercent || false,
            labelColorMode: init?.edaChart?.labelColorMode || 'series',
            labelCustomColor: init?.edaChart?.labelCustomColor || '#000000',
            numberOfColumns: init?.edaChart?.numberOfColumns || 0,
            assignedColors: init?.edaChart?.assignedColors || [],
            showPointLines: init?.edaChart?.showPointLines || false,
            showPredictionLines: init?.edaChart?.showPredictionLines || false,
            chartLegend: init?.edaChart?.chartLegend ?? false,
            showGridLines: init?.edaChart?.showGridLines ?? false,
            showXAxis: init?.edaChart?.showXAxis ?? true,
            showXAxisLabels: init?.edaChart?.showXAxisLabels ?? true,
            xAxisLabelCount: init?.edaChart?.xAxisLabelCount || 0,
            labelBackgroundColor: init?.edaChart?.labelBackgroundColor || '',
            lineWidth: init?.edaChart?.lineWidth ?? 2,
            lineStyle: init?.edaChart?.lineStyle || 'solid',
            chartLineColor: init?.edaChart?.chartLineColor || '',
            chartFillColor: init?.edaChart?.chartFillColor || '',
            useGradient: init?.edaChart?.useGradient ?? true,
            useRoundedBars: init?.edaChart?.useRoundedBars ?? true,
            chartAnimation: init?.edaChart?.chartAnimation ?? true,
        };

        Object.assign(this, init);


    }
}
