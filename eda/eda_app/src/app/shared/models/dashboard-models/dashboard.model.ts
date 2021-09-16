
export class Dashboard {
    public id: string;
    public title: string;
    public panel: any[];
    public user: string;
    public datasSource: any;
    public filters: any[];
    public applytoAllFilter: {present: boolean, refferenceTable: string, id: string};
    public visible: string;
    public onlyIcanEdit: boolean = false;

    constructor(init: Partial<Dashboard>) {
        Object.assign(this, init);
    }

}
