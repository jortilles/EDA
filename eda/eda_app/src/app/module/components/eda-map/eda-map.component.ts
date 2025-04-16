import { OnInit, ChangeDetectorRef, Input, AfterViewChecked } from "@angular/core";
import { Component, AfterViewInit } from "@angular/core";
import * as L from "leaflet";
import { MapUtilsService } from "@eda/services/service.index";
import { EdaMap } from "./eda-map";
import { LatLngExpression } from "leaflet";

@Component({
  selector: 'eda-map',
  templateUrl: './eda-map.component.html',
  styleUrls: ['./eda-map.component.css']
})
export class EdaMapComponent implements OnInit, AfterViewInit, AfterViewChecked {

  @Input() inject: EdaMap;
  public loading: boolean;
  private map: any;
  private logarithmicScale: boolean;
  private initialColor: string = "#F4C501";
  private finalColor: string = "#FA0F25";
  public draggable: boolean;
  private dataIndex: number;
  private groups: Array<number>;
  private mapActualConfig = null;


  constructor(
    private mapUtilsService: MapUtilsService
  ) {

  }
  ngOnInit(): void {
    this.loading = true;
    this.dataIndex = this.inject.query.findIndex((e) => e.column_type === "numeric");
    this.initialColor = this.inject.initialColor ? this.inject.initialColor: this.initialColor;
    this.finalColor = this.inject.finalColor ? this.inject.finalColor : this.finalColor;
    this.logarithmicScale = this.inject.logarithmicScale ? this.inject.logarithmicScale : false;
    this.draggable = this.inject.draggable === undefined ? true : this.inject.draggable;
  }

  ngAfterViewInit(): void {

  this.initMap();    
}
  ngAfterViewChecked() {
    if (this.map) {
      this.map.invalidateSize();
    }

  }

  private initMap = (): void => {
    let validData = []; // Faig això per treure els nulls i resta de bruticia del dataset
    for (let i = 0; i < this.inject.data.length; i++) {
      if (this.inject.data[i][0] !== null && this.inject.data[i][1] !== null) {
        validData.push(this.inject.data[i]);
      }
    }
    if (L.DomUtil.get(this.inject.div_name) !== null) {
      this.map = L.map(this.inject.div_name, {
        //center: [41.38879, 2.15899],
        center:  this.mapUtilsService.getCoordinates() as unknown as LatLngExpression ??
          this.getCenter(validData),

        zoom: this.mapUtilsService.getZoom() ??
          this.inject.zoom ??
          12,
        dragging: this.draggable,
        tap: !L.Browser.mobile,
        scrollWheelZoom: this.draggable,
      });
      const tiles = L.tileLayer(
        "https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png",
//        "https://tile.openstreetmap.org/{z}/{x}/{y}.png", alternativa de openstreetmaps
        {
          maxZoom: 19,
          attribution:
            '&copy; <a href="http://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
        }
      );

      tiles.addTo(this.map);
      //Objeto que recoge datos para hacer mapa markers
      this.mapActualConfig = { colors: [this.initialColor, this.finalColor], logarithmicScale : this.logarithmicScale, groups: this.groups ??  this.getLogarithmicGroups(this.inject.data.map((row) => row[this.dataIndex])) }

      this.mapUtilsService.makeMarkers(
        this.map,
        validData,
        this.inject.labels,
        this.inject.linkedDashboard,
        this.mapActualConfig
      );
      // Check coords & zoom origin
      this.map.on("moveend", (event) => {
        let c = this.map.getCenter();
        this.inject.coordinates = [c.lat, c.lng];
        this.mapUtilsService.setCoordinates(this.inject.coordinates);
      });
      this.map.on("zoomend", (event) => {
        this.inject.zoom = this.map.getZoom();
          this.mapUtilsService.setZoom(this.inject.zoom);
      });
    }
  };

  setGroups(): void {
    if (this.logarithmicScale) {
      this.groups = this.getLogarithmicGroups(
        this.inject.data.map((row) => row[this.dataIndex])
      );
    } else {
      this.groups = this.getGroups(
        this.inject.data.map((row) => row[this.dataIndex])
      );
    }
  }

  /**
   * Divide data in n groups by value, and returns values limits f.e.[0, 20, 40, 60, 80, 100]
   * @param data
   * @param n
   */
  private getGroups = (data: any, n = 5) => {
    let max = data.reduce((a: number, b: number) => Math.max(a, b));
    let min = data.reduce((a: number, b: number) => Math.min(a, b));
    // El primer rang comença amb el número mes petit
    let div = (max - min) / n;
    let groups = [max];
    while (groups.length < 5) {
      max -= div;
      groups.push(max);
    }
    return groups;
  };

  private getLogarithmicGroups = (data: any, n = 5) => {
    let max = data.reduce((a: number, b: number) => Math.max(a, b));
    let order = Math.floor(Math.log(max) / Math.LN10 + 0.000000001);
    order = Math.pow(10, order) * 10;
    let groups = [order];
    while (groups.length < 5) {
      order /= 10;
      groups.push(order);
    }
    return groups;
  };

  public changeScale = (logarithmicScale: boolean) => {
    this.logarithmicScale = logarithmicScale;
    this.setGroups();
    this.reDrawCircles([this.initialColor, this.finalColor]);
  };

  private reDrawCircles = (colors: string[]) => {
    //Borrar actual layer
    this.map.removeLayer(this.mapUtilsService.layerGroup);
    //Guardar valores del colorPicker
    this.initialColor = colors[0];
    this.finalColor = colors[1];
    //Objeto que recoge datos para hacer mapa markers
    this.mapActualConfig = { colors: colors, logarithmicScale : this.logarithmicScale, groups: this.groups ??  this.getLogarithmicGroups(this.inject.data.map((row) => row[this.dataIndex]))}
    this.mapUtilsService.makeMarkers(
      this.map,
      this.inject.data,
      this.inject.labels,
      this.inject.linkedDashboard,
      this.mapActualConfig
    );
  };

  public switchNoMouse(option: boolean) {
    this.draggable = option;
    this.map.options.dragging = this.draggable;
    this.map.options.scrollWheelZoom = this.draggable;
    if (this.draggable) {
      this.map.dragging.enable();
      this.map.scrollWheelZoom.enable();
    } else {
      this.map.dragging.disable();
      this.map.scrollWheelZoom.disable();
    }
  }

  private getCenter(data: Array<any>) {
    let x: number, y: number;
    if (!this.inject.coordinates) {
      let minX = data.reduce((min, v) => min >= parseFloat(v[0]) ? parseFloat(v[0]) : min, Infinity);
      let minY = data.reduce((min, v) => min >= parseFloat(v[1]) ? parseFloat(v[1]) : min, Infinity);
      let maxX = data.reduce((max, v) => max >= parseFloat(v[0]) ? max : parseFloat(v[0]), -Infinity);
      let maxY = data.reduce((max, v) => max >= parseFloat(v[1]) ? max : parseFloat(v[1]), -Infinity);
      x = minX + ((maxX - minX) / 2);
      y = minY + ((maxY - minY) / 2);
    }
    let coordinates = this.inject.coordinates ? this.inject.coordinates : [y, x];
    return coordinates as LatLngExpression
  }
}
