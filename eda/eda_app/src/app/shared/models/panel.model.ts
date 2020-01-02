
export class Panel {

    constructor( public id: string,
                 public title: string,
                 public w: number,
                 public h: number,
                 public dragAndDrop: boolean,
                 public resizable: boolean,
                 public x?: number,
                 public y?: number,
                 public content?: any[ any ]) { }

}
