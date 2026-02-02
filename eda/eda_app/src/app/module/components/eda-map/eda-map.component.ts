import { OnInit, Input, AfterViewChecked } from "@angular/core";
import { Component, AfterViewInit } from "@angular/core";
import * as L from "leaflet";
import { MapUtilsService, StyleProviderService } from "@eda/services/service.index";
import { EdaMap } from "./eda-map";
import { LatLngExpression } from "leaflet";

import { FormsModule } from '@angular/forms'; 
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'eda-map',
  templateUrl: './eda-map.component.html',
  styleUrls: ['./eda-map.component.css'],
  imports: [FormsModule, CommonModule]
})
export class EdaMapComponent implements OnInit, AfterViewInit, AfterViewChecked {

  @Input() inject: EdaMap;
  public loading: boolean;
  private map: any;
  private logarithmicScale: boolean;
  public assignedColors: Array<{value: string, color: string}> = [];
  public draggable: boolean;
  private dataIndex: number;
  private groups: Array<number>;
  private mapActualConfig = null;
  private paletaActual: string[];

  constructor(
    private mapUtilsService: MapUtilsService, 
    private styleProviderService: StyleProviderService
  ) {}
  
  ngOnInit(): void {
    this.loading = true;
    this.paletaActual = this.styleProviderService.ActualChartPalette['paleta'];

    this.dataIndex = this.inject.query.findIndex((e) => e.column_type === "numeric");

    // Cargar assignedColors
    if (this.inject.assignedColors && Array.isArray(this.inject.assignedColors) && this.inject.assignedColors.length >= 2) {
      this.assignedColors = this.inject.assignedColors;
    } else {
      // Crear colores por defecto
      this.assignedColors = [
        {value: 'start', color: this.paletaActual[this.paletaActual.length - 1]},
        {value: 'end', color: this.paletaActual[0]}
      ];
    }

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
    let validData = [];
    for (let i = 0; i < this.inject.data.length; i++) {
      if (this.inject.data[i][0] !== null && this.inject.data[i][1] !== null) {
        validData.push(this.inject.data[i]);
      }
    }

    if (L.DomUtil.get(this.inject.div_name) !== null) {
      this.map = L.map(this.inject.div_name, {
        center: this.mapUtilsService.getCoordinates() as unknown as LatLngExpression ?? 
                this.getCenter(validData),
        zoom: this.mapUtilsService.getZoom() ?? this.inject.zoom ?? 12,
        dragging: this.draggable,
        scrollWheelZoom: this.draggable,
      });

      const tiles = L.tileLayer(
        "https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png",
        {
          maxZoom: 19,
          attribution: '&copy; <a href="http://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
        }
      );

      tiles.addTo(this.map);

      const colors = this.assignedColors.map(c => c.color);
      this.mapActualConfig = { 
        colors: colors, 
        logarithmicScale: this.logarithmicScale, 
        groups: this.groups ?? this.getLogarithmicGroups(this.inject.data.map((row) => row[this.dataIndex])) 
      };

      this.mapUtilsService.makeMarkers(
        this.map,
        validData,
        this.inject.labels,
        this.inject.linkedDashboard,
        this.mapActualConfig
      );

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

  private getGroups = (data: any, n = 5) => {
    let max = data.reduce((a: number, b: number) => Math.max(a, b));
    let min = data.reduce((a: number, b: number) => Math.min(a, b));
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
    const colors = this.assignedColors.map(c => c.color);
    this.reDrawCircles(colors);
  };

  public reDrawCircles = (colors: string[]) => {
    // Borrar actual layer
    this.map.removeLayer(this.mapUtilsService.layerGroup);
    
    // Actualizar assignedColors
    this.assignedColors = [
      {value: 'start', color: colors[0]},
      {value: 'end', color: colors[1]}
    ];

    // Objeto que recoge datos para hacer mapa markers
    this.mapActualConfig = { 
      colors: colors, 
      logarithmicScale: this.logarithmicScale, 
      groups: this.groups ?? this.getLogarithmicGroups(this.inject.data.map((row) => row[this.dataIndex]))
    };

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
    return coordinates as LatLngExpression;
  }
}