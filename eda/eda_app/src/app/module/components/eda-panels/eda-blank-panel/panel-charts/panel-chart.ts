import { ChartConfig } from './chart-configuration-models/chart-config';


export class PanelChart {
  public data : {labels:any[], values:any[]};
  public query : any;
  public chartType : string;
  public config : ChartConfig;
  public edaChart : string;
  public maps : Array<string>;

  constructor(init?: Partial<PanelChart>) {
    Object.assign(this, init);
  }
}
