export class KpiDeviationConfig {
    backgroundColor: string = '';
    kpiColor: string = '';
    positiveColor: string = '';
    negativeColor: string = '';
    prefixImage: string = '';
    modifiedFontPoints: number = 0;
    alertLimits: any[] = [];

    constructor(init?: Partial<KpiDeviationConfig>) {
        Object.assign(this, init);
    }
}
