export class KpiConfig {
  sufix: string;
  alertLimits : any;
  constructor(sufix: string, alertLimits:Array<{value:number, operand:string, color:string}>) {
    this.sufix = sufix;
    this.alertLimits = alertLimits;
  }
}