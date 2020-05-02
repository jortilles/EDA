
export class EdaPanel {
    public id: string;
    public title: string;
    public w: number;
    public h: number;
    public dragAndDrop: boolean = true;
    public resizable: boolean = true;
    public x: number;
    public y: number;
    public content: any[any];
    public inject: any = {};
    public tamanyMobil: IMobileSizes = {x: 0, y: 0, w: 0, h: 0};
    public tamanyMig: IMidSizes = {x: 0, y: 0, w: 0, h: 0};
    constructor(init?: Partial<EdaPanel>) {
        Object.assign(this, init);
    }
}

interface IMobileSizes {
    x: number;
    y: number;
    w: number;
    h: number;
}
interface IMidSizes {
    x: number;
    y: number;
    w: number;
    h: number;
}
