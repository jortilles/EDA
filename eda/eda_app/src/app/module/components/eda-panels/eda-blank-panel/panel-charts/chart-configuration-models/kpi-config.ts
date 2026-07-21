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
    useGradient: boolean;
    useRoundedBars: boolean;
}

export class KpiConfig {
    sufix: string = '';
    assignedColors: any[] = [];
    alertLimits: any[] = [];
    edaChart: KpiEdaChart;
    modifiedFontPoints: number = 0;
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
            useGradient: init?.edaChart?.useGradient ?? true,
            useRoundedBars: init?.edaChart?.useRoundedBars ?? true,
        };

        Object.assign(this, init);


    }
}
