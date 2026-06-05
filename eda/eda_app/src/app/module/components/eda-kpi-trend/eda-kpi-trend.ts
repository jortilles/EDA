export interface TrendPeriodGroup {
    key: string;
    label: string;
    entries: { period: number; value: number }[];
}

export class EdaKpiTrend {
    header: string;
    // KPI display values
    kpiValue: number;
    spyValue: number | null;
    vsPercent: number | null;
    currentPeriodLabel: string;
    previousPeriodLabel: string;
    periodTitle: string;
    comparisonLabel: string;
    // Style
    sufix: string = '';
    decimals: number = 0;
    backgroundColor: string = '';
    kpiColor: string = '';
    currentYearColor: string = '';
    previousYearColor: string = '';
    // Dropdown / recalculation data
    dateFormat: string = 'month';
    currentKey: string;
    selectedComparisonKey: string;
    availableComparisons: { key: string; label: string }[];
    periodGroups: TrendPeriodGroup[];
    assignedColors: any[];
    // Chart
    edaChart: any;
    // Font size offset (from kpi-dialog)
    modifiedFontPoints: number = 0;
}
