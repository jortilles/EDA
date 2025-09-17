import { LinkedDashboardProps } from './../../module/components/eda-panels/eda-blank-panel/link-dashboards/link-dashboard-props';
import { Injectable, SecurityContext } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as L from 'leaflet';
import { Observable } from 'rxjs';
import { ApiService } from '../api/api.service';
import { shareReplay } from 'rxjs/operators';
import { LatLngExpression } from 'leaflet';
import { DomSanitizer } from '@angular/platform-browser';

@Injectable({ providedIn: "root" })
export class MapUtilsService extends ApiService {
  private route = "/global/upload/readGeoJsonFile";
  private mapsObservables$: {} = {};
  private coordinates: Array<Array<number>>  = null;
  public auxCoordinates: Array<Array<number>> = null;
  private zoom: number = null;
  public auxZoom: number = null;
  public layerGroup = L.layerGroup([]);
  private isSmallestValue: boolean;

  constructor(protected http: HttpClient, private _sanitizer: DomSanitizer) {
    super(http);
  }
  initShapes(mapID: string): void {
    if (!this.mapsObservables$[mapID]) {
      this.mapsObservables$[mapID] = this.get(`${this.route}/${mapID}`).pipe(
        shareReplay(1)
      );
    }
  }
  getShapes(mapID: string): Observable<any> {
    return this.mapsObservables$[mapID];
  }

  makeMarkers = (
    map: L.Map,
    data: Array<any>,
    labels: Array<any>,
    linkedDashboardProps: LinkedDashboardProps,
    mapActualConfig: any[],
  ): void => {
    //Puede tener categoría o no  por lo que el set de datos es longitud, latitutd, [Categoria] , valor.
    // por eso se pone el numericValue como un valor relativo.
    //Cogemos el primer valor numérico encontrado posterior a latlng como radio
    let numericValue: number;
    let smallestValue: number = Infinity;
    mapActualConfig["groups"] = mapActualConfig["groups"].reverse().map(function (v) {return v / 10;});
    //Encontrar campo numerico y menor valor
    for (const d of data) {
      let n = 0;
      d.forEach((label: any) => {
        if (typeof label === "number" && n > 1) {
          return (numericValue = n);
        }
        n++;
      });
      if (d[numericValue] < smallestValue) smallestValue = d[numericValue];
    }


    for (const d of data) {
      //Caso de Valor menor
      if (d[numericValue] === smallestValue) this.isSmallestValue = true;
      else this.isSmallestValue = false;

      //Configuración del circulo
      const maxValue = Math.max(...data.map((x) => x[numericValue]), 0);
      const radius =
        typeof d[numericValue] === "number"
          ? MapUtilsService.scaledRadius(d[numericValue], maxValue)
          : 20;
      let color: string;
      if (mapActualConfig['logarithmicScale']) {
        color = this.getLogColor(d[numericValue], mapActualConfig['colors'], mapActualConfig['groups']);
      } else {
        color = this.getColor(radius, data.length, mapActualConfig["colors"]);
      }
      const lat = parseFloat(d[0]); // / 1000000 / 2;
      const lon = parseFloat(d[1]); // / 10000;
      const properties = {
        weight: 1,
        radius: radius,
        color: "black",
        fillColor: color,
        fillOpacity: 0.8,
      };
      if (lat && lon) {
        const circle = L.circleMarker(
          [lon, lat] as LatLngExpression,
          properties
        );
        circle.bindPopup(this.makePopup(d, labels), {
          className: "custom",
          autoPan: false,
        });
        circle.on("mouseover", function (e) {
          this.openPopup();
        });
        circle.on("mouseout", function (e) {
          this.closePopup();
        });
        circle.on("click", () => {
          this.linkDashboard(d[2], linkedDashboardProps);
        });
        circle.addTo(map)
        //En vez de añadir cada circulo creamos un grupo de layers con todos los circulos.
        // Facilita el tratamiento de estos.
        this.layerGroup.addLayer(circle);
      }
    }
  };

  private linkDashboard = (value, linkedDashboard: LinkedDashboardProps) => {
    if (linkedDashboard) {
      const props = linkedDashboard;
      const url =
        window.location.href.substr(
          0,
          window.location.href.indexOf("/dashboard")
        ) +
        `/dashboard/${props.dashboardID}?${props.table}.${props.col}=${value}`;
      window.open(url, "_blank");
    }
  };

  private makePopup = (data: any, labels: Array<string>): string => {
    const me = this;
    let div = "";
    for (let i = 2; i < 4; i++) {
      if (data[i] !== undefined) {
        div += `<div> ${me._sanitizer.sanitize(
          SecurityContext.HTML,
          labels[i]
        )} :  ${data[i]} </div>`;
      }
    }
    return `` + div;
  };
  // Esta función es para evitar los petes del los nulos de  row[labelIndex].toUpperCase().replace(/\s/g, '')
  private labelProcessingHelper(val: any) {
    let res = "";
    try {
      res = val.toUpperCase().replace(/\s/g, "");
    } catch (e) {
      console.log(
        "Error processing value... probably a null. Try to avoid them..."
      );
      console.log(e);
      res = "";
    }
    return res;
  }

  public makeGeoJsonPopup = (
    layer_id: string,
    data: Array<number>,
    labels: Array<string>,
    labelIndex: number,
    totalSum: number
  ): string => {
    const me = this;
    let row = data.filter(
      (row) =>
        row[labelIndex] !== null &&
        this.labelProcessingHelper(row[labelIndex]) ===
          this.labelProcessingHelper(layer_id)
    )[0];
    let div = "";
    for (let i = 0; i < labels.length; i++) {
      if (row !== undefined) {
        let value =
          typeof row[i] === "number"
            ? `${parseFloat(row[i]).toLocaleString("de-DE", {
                maximumFractionDigits: 6,
              })} ( ${((parseFloat(row[i]) / totalSum) * 100).toFixed(2)}% )`
            : row[i];
        div += `<div> ${me._sanitizer.sanitize(
          SecurityContext.HTML,
          labels[i]
        )} :  ${value} </div>`;
      } else {
        div = `<div> No data </div>`;
      }
    }
    return `` + div;
  };

  public getColor = (radius: number, length: number, colorLimits: string[]) => {
    //Generamos la array de colores dependiendo del número de datos y el init & final color. 
    if (this.isSmallestValue) return colorLimits[0];
    let colorArray: string[];
    colorArray = this.generateColorArray(length, colorLimits);
    return colorArray[Math.floor(25 / (radius + 0.000001)) % 10];
  };

  public getLogColor = (radius: number, colorLimits: string[], logScale: number[]) => {
    //Generamos la array logaritmica de colores dependiendo del número de datos y el init & final color.
    const color: string = this.generateColorLogArray(colorLimits, radius, logScale);
    return color;
  };

  private generateColorLogArray(colors: string[], value: any, logScale: number[]) {    
    //Creación de array gradiente
    const colorGradient: string[] = this.getArrayGradient(colors, logScale.length); 
    //Asignación de colores por valores
    const index = this.getLogRange(value, logScale);
    return colorGradient[index];
  }

  getArrayGradient(colors: string[], intervals: number) {
    const gradient: string[] = [];
    for (let i = 0; i < intervals; i++) {
      const pos = i / (intervals - 1); // Normalización entre 0 y 1
      const r = Math.round(this.hexToRgb(colors[0]).r * (1 - pos) + this.hexToRgb(colors[1]).r * pos);
      const g = Math.round(this.hexToRgb(colors[0]).g * (1 - pos) + this.hexToRgb(colors[1]).g * pos);
      const b = Math.round(this.hexToRgb(colors[0]).b * (1 - pos) + this.hexToRgb(colors[1]).b * pos);
      gradient.push(this.rgbToHex(r, g, b));
    }
    return gradient;
  }

  getLogRange(value: number,logScale: number[]): number  {
    for (let i = 0; i <= logScale.length; i++) {
      if (value <= logScale[i] ||(value >= logScale[i] && value <= logScale[i + 1]) ||i === logScale.length - 1) 
        return i;
    }
    return logScale.length - 2;
  }

  private generateColorArray(length: number, colors: string[]) {
    //Transformamos a RGB para tener valores numéricos sobre los que dividir entre número de data.
    //Tras dividir, el codigo rgb correspondiente se transforma a HEX y se retorna (se podría trabajar con rgb)
    let gradient = [];

    for (let i = 0; i < length - 1; i++) {
      const factor = i / length;
      //Construcción codigo rgb con start color, final color y un múltiple
      const r = this.interpolate(this.hexToRgb(colors[1]).r,this.hexToRgb(colors[0]).r,factor);
      const g = this.interpolate(this.hexToRgb(colors[1]).g,this.hexToRgb(colors[0]).g,factor);
      const b = this.interpolate(this.hexToRgb(colors[1]).b,this.hexToRgb(colors[0]).b,factor);
      //RGB to HEX
      gradient.push(this.rgbToHex(r, g, b));
    }
    //Valor devuelto en codigo HEX
    return gradient;
  }

  //Funciones de conversión
  private hexToRgb(hex: string) {
    const bigint = parseInt(hex.slice(1), 16);
    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255,
    };
  }

  private rgbToHex(r: number, g: number, b: number) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  //Funcion para coger valor intermedio
  private interpolate(start: number, end: number, factor: number) {
    return Math.round(start + (end - start) * factor);
  }

  static scaledRadius = (val: number, maxVal: number): number => {
    return 20 * (val / maxVal) + 5;
  };

  public setCoordinates(coordinates: Array<Array<number>>): void {
    this.coordinates = coordinates;
  }
  public getCoordinates(): Array<Array<number>>{
    return this.coordinates;
  }
  public setZoom(zoom: number): void {
    this.zoom = zoom;
  }
  public getZoom(): number | null {
    return this.zoom;
  }
  public mapEditOpen(): void {
    this.auxCoordinates = this.coordinates;
  }
  public mapEditClose(): void {
    this.auxCoordinates = null;
  }
  cancelChartProps() {
    this.coordinates = this.auxCoordinates; 
    this.zoom = this.auxZoom; 
  }
}
