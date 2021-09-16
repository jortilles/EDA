export class MapConfig {
  coordinates: Array<number>;
  zoom: number;
  logarithmicScale : boolean;
  legendPosition: string;
  color: string;
  constructor(coordinates: Array<number>, zoom:number, logarithmicScale : boolean, legendPosition:string, color:string) {
    this.coordinates = coordinates;
    this.zoom = zoom;
    this.logarithmicScale = logarithmicScale;
    this.legendPosition= legendPosition;
    this.color = color;

  }
}