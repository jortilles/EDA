export class InjectEdaPanel {
    public dataSource: any;
    public dashboard_id: string;
    public applyToAllfilter: { present: boolean, refferenceTable: string, id: string};
    public isObserver:boolean;
/* SDA CUSTOM */    public canSave?: boolean;

    constructor() {}
}
