import { OnInit, Input, AfterViewChecked } from '@angular/core';
import { Component, AfterViewInit } from '@angular/core';
import * as L from 'leaflet';
import { MapUtilsService } from '@eda/services/service.index';
import { EdaMap } from './eda-map';
import { LatLngExpression } from 'leaflet';

@Component({
  selector: 'eda-map',
  templateUrl: './eda-map.component.html',
  styleUrls: ['./eda-map.component.css']
})
export class EdaMapComponent implements OnInit, AfterViewInit, AfterViewChecked {

  @Input() inject: EdaMap;

  private map: any;

  constructor(
    private mapUtilsService: MapUtilsService
  ) {

  }
  ngOnInit(): void {
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
    let validData = [];// Faig això per treure els nulls i resta de bruticia del dataset
    for(let i = 0; i < this.inject.data.length; i++ ) { 
      if(    this.inject.data[i][0]  !== null   &&  this.inject.data[i][1]  !== null  ) {
        validData.push(this.inject.data[i]);
      }
    }  
    if (L.DomUtil.get(this.inject.div_name) !== null) {
      this.map = L.map(this.inject.div_name, {
        //center: [41.38879, 2.15899],
        center: this.getCenter(validData),
        zoom: this.inject.zoom ? this.inject.zoom : 12,
        dragging: !L.Browser.mobile,
        tap: !L.Browser.mobile
      });
      const tiles = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
      });

      tiles.addTo(this.map);
      this.mapUtilsService.makeMarkers(this.map, validData, this.inject.labels, this.inject.linkedDashboard);
      this.map.on('moveend', (event) => {
        let c = this.map.getCenter();
        this.inject.coordinates = [c.lat, c.lng];
      });
      this.map.on('zoomend', (event) => {
        this.inject.zoom = this.map.getZoom();
      });
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



