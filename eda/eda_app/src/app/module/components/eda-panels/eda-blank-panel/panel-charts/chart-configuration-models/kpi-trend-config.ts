export class KpiTrendConfig {
    sufix: string = '';
    backgroundColor: string = '';
    kpiColor: string = '';
    assignedColors: any[] = [];

    constructor(init?: Partial<KpiTrendConfig>) {
        Object.assign(this, init);
    }
}
