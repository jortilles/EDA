export class EdaTableHeaderGroup {
    public colspan: number = 1;
    public rowspan: number = 1;
    public title: string = '';

    constructor(init?: Partial<EdaTableHeaderGroup>) {
        if (init) {
            Object.assign(this, init);
        }
    }
}