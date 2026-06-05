export class KpiTrendConfig {
    sufix: string = '';
    backgroundColor: string = '';
    kpiColor: string = '';
    assignedColors: any[] = [];
    modifiedFontPoints: number = 0;

    constructor(init?: Partial<KpiTrendConfig>) {
        Object.assign(this, init);
    }
}
