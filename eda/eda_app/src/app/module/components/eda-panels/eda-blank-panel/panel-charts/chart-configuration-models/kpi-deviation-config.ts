export class KpiDeviationConfig {
    sufix: string = '';
    backgroundColor: string = '';
    kpiColor: string = '';
    positiveColor: string = '';
    negativeColor: string = '';

    constructor(init?: Partial<KpiDeviationConfig>) {
        Object.assign(this, init);
    }
}
