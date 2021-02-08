export class KnobConfig {
  color:string;
  limits:Array<any>;

  constructor( color:string, limits:Array<any>){

    this.color = color;
    this.limits = limits;

  }
}