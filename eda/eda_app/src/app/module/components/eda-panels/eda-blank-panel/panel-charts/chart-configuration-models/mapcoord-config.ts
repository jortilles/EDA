export class MapCoordConfig {
  coordinates: Array<number>;
  zoom: number;
  logarithmicScale : boolean;
  color: string;
  draggable: boolean;
  constructor(coordinates: Array<number>, zoom:number, logarithmicScale : boolean, legendPosition:string, color:string, draggable: boolean) {
    this.coordinates = coordinates;
    this.zoom = zoom;
    this.logarithmicScale = logarithmicScale;
    this.color = color;
    this.draggable = draggable;
  }
}