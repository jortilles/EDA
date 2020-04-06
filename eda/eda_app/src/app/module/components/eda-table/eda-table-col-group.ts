export class EdaTableColGroup {
    public id: string;
    public title: string;
    public visible: boolean = true;
    
    constructor(init: Partial<EdaTableColGroup>) {
        Object.assign(this, init);
    }
}