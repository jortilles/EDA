export class PanelChart {
  public data : {labels:any[], values:any[]};
  public query : any;
  public chartType : string;
  public layout : any;
  public isBarline : boolean;

  constructor(init?: Partial<PanelChart>) {
    Object.assign(this, init);
  }
}
