export class EdaKpiDeviation {
    header: string;
    value: number;
    referenceValue: number | null = null;
    vsPercent: number | null = null;
    sufix: string = '';
    decimals: number = 0;
    backgroundColor: string = '';
    kpiColor: string = '';
    positiveColor: string = '#22a55b';
    negativeColor: string = '#e53e3e';
}
