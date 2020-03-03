
export class EdaPanel {
    public id: string;
    public title: string;
    public w: number;
    public h: number;
    public dragAndDrop: boolean;
    public resizable: boolean;
    public x: number;
    public y: number;
    public content: any[any];
    public inject: any;

    constructor(id, title, w, h, dragAndDrop, resizable, x?, y?, content?, inject?) {
        this.id = id;
        this.title = title;
        this.w = w;
        this.h = h;
        this.dragAndDrop = dragAndDrop; 
        this.resizable = resizable;
        this.x = x;
        this.y = y;
        this.content = content;
        this.inject = inject;
    }
}
