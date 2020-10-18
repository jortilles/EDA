export class MapConfig {
  coordinates: Array<number>;
  zoom: number;
  constructor(coordinates: Array<number>, zoom:number) {
    this.coordinates = coordinates;
    this.zoom = zoom;
  }
}