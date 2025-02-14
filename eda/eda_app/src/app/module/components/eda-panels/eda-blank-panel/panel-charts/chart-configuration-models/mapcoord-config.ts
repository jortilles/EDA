export class MapCoordConfig {
  coordinates: Array<number>;
  zoom: number;
  logarithmicScale : boolean;
  initialColor: string;
  finalColor: string;
  draggable: boolean;
  constructor(coordinates: Array<number>, zoom:number, logarithmicScale : boolean, legendPosition:string, initialColor:string,finalColor:string, draggable: boolean) {
    this.coordinates = coordinates;
    this.zoom = zoom;
    this.logarithmicScale = logarithmicScale;
    this.initialColor = initialColor;
    this.finalColor = finalColor;
    this.draggable = draggable;
  }
}