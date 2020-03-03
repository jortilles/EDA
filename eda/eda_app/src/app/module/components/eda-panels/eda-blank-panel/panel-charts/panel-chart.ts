export class PanelChart {
  public data : {labels:any[], values:any[]};
  public query : any;
  public chartType : string;
  public layout : any;

  constructor(init?: Partial<PanelChart>) {
    Object.assign(this, init);
  }
}
