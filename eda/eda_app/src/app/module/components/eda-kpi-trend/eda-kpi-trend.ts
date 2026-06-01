export class EdaKpiTrend {
    header: string;
    kpiValue: number;
    kpiYear: string;
    spyValue: number;
    spyYear: string;
    vsPercent: number | null;
    sufix: string = '';
    decimals: number = 0;
    backgroundColor: string = '';
    kpiColor: string = '';
    currentYearColor: string = '';
    previousYearColor: string = '';
    showChart: boolean = true;
    edaChart: any;
}
