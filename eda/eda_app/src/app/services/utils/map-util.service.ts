import { LinkedDashboardProps } from './../../module/components/eda-panels/eda-blank-panel/link-dashboards/link-dashboard-props';
import { Injectable, SecurityContext } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as L from 'leaflet';
import { Observable } from 'rxjs';
import { ApiService } from '../api/api.service';
import { shareReplay } from 'rxjs/operators';
import { LatLngExpression } from 'leaflet';
import { DomSanitizer } from '@angular/platform-browser';
import Supercluster from 'supercluster';

@Injectable({ providedIn: "root" })
export class MapUtilsService extends ApiService {
  private route = "/global/upload/readGeoJsonFile";
  private mapsObservables$: {} = {};
  private coordinates: Array<Array<number>>  = null;
  public auxCoordinates: Array<Array<number>> = null;
  private zoom: number = null;
  public auxZoom: number = null;
  public layerGroup = L.layerGroup([]);
  private labelGroup = L.layerGroup([]);
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

  // Cache of the last built spatial index, keyed by data array reference. Callers (eda-map.component.ts)
  // re-invoke clusterData on every zoomend/moveend with the same `validData` array reference, so this
  // lets pan/zoom reuse the already-built index instead of re-indexing the whole dataset each time.
  private clusterIndexCache: { data: Array<any>; index: Supercluster; numIdx: number; unparseable: Array<any> } = null;

  // Groups nearby points for rendering. Previously a hand-rolled O(n^2) pixel-distance comparison
  // (every point against every other point), redone from scratch on each zoom/pan — unusable past a
  // few hundred points. Supercluster builds a proper spatial index once and re-queries it in
  // O(log n), so panning/zooming stays fast regardless of dataset size.
  clusterData(map: L.Map, data: Array<any>, pixelRadius: number = 40): Array<any> {
    if (!data || data.length === 0) return data;

    let index: Supercluster, numIdx: number, unparseable: Array<any>;

    if (this.clusterIndexCache && this.clusterIndexCache.data === data) {
      ({ index, numIdx, unparseable } = this.clusterIndexCache);
    } else {
      // Same convention as before: the first numeric column after the coordinate pair is the
      // aggregated value (dataset shape is [lon, lat, [category], value, ...]).
      numIdx = -1;
      for (const d of data) {
        d.forEach((v: any, i: number) => {
          if (typeof v === 'number' && i > 1 && numIdx === -1) numIdx = i;
        });
        if (numIdx > -1) break;
      }

      unparseable = [];
      const points: Array<GeoJSON.Feature<GeoJSON.Point, { row: any }>> = [];
      for (const row of data) {
        const lon = parseFloat(row[0]);
        const lat = parseFloat(row[1]);
        if (isNaN(lon) || isNaN(lat)) { unparseable.push(row); continue; }
        points.push({
          type: 'Feature',
          properties: { row },
          geometry: { type: 'Point', coordinates: [lon, lat] },
        });
      }

      index = new Supercluster({
        radius: pixelRadius,
        maxZoom: 18,
        map: (props: any) => ({ sum: numIdx > -1 ? (props.row[numIdx] || 0) : 0 }),
        reduce: (accumulated: any, props: any) => { accumulated.sum += props.sum; },
      });
      index.load(points);

      this.clusterIndexCache = { data, index, numIdx, unparseable };
    }

    const zoom = Math.round(map.getZoom());
    const clusters = index.getClusters([-180, -85, 180, 85], zoom);

    const result: Array<any> = clusters.map((c: any) => {
      if (!c.properties.cluster) {
        return c.properties.row;
      }
      const [lon, lat] = c.geometry.coordinates;
      const leaf = index.getLeaves(c.properties.cluster_id, 1)[0];
      const aggregated: any = [...leaf.properties.row];
      aggregated[0] = lon;
      aggregated[1] = lat;
      if (numIdx > -1) aggregated[numIdx] = c.properties.sum;
      aggregated._clusterCount = c.properties.point_count;
      return aggregated;
    });

    return [...unparseable, ...result];
  }

  makeMarkers = (
    map: L.Map,
    data: Array<any>,
    labels: Array<any>,
    linkedDashboardProps: LinkedDashboardProps,
    mapActualConfig: any[],
  ): void => {
    // It may or may not have a category, so the dataset is longitude, latitude, [category], value.
    // Therefore, numericValue is used as a relative value.
    // We take the first numeric value found after lat/lng as the radius.
    let numericValue: number;
    let smallestValue: number = Infinity;
    mapActualConfig["groups"] = mapActualConfig["groups"].reverse().map(function (v) {return v / 10;});

    this.layerGroup.clearLayers();
    this.labelGroup.clearLayers();

    // Find numeric field and minimum value
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
      // Lower value case
      if (d[numericValue] === smallestValue) this.isSmallestValue = true;
      else this.isSmallestValue = false;

      // Circle configuration
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
        radius: d._clusterCount ? Math.min(radius * 1.4, 35) : radius,
        color: d._clusterCount ? "white" : "black",
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
        if (d._clusterCount) {
          const icon = L.divIcon({
            className: '',
            html: `<span style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#fff;font-weight:bold;font-size:11px;pointer-events:none">${d._clusterCount}</span>`,
            iconSize: [0, 0],
          });
          this.labelGroup.addLayer(L.marker([lon, lat] as LatLngExpression, { icon, interactive: false }));
        }
        this.layerGroup.addLayer(circle);
      }
    }
    this.layerGroup.addTo(map);
    this.labelGroup.addTo(map);
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
    if (data._clusterCount) {
      div += `<div><strong>${data._clusterCount} ${$localize`:@@mapClusteredPoints:puntos agrupados`}</strong></div>`;
    }
    for (let i = 2; i < 4; i++) {
      if (data[i] !== undefined) {
        const label = labels[i] !== undefined ? labels[i] : `Field ${i-1}`;
        div += `<div> ${me._sanitizer.sanitize(
          SecurityContext.HTML,
          label
        )} :  ${data[i]} </div>`;
      }
    }
    return `` + div;
  };
  // This function is to prevent crashes caused by null values row[labelIndex].toUpperCase().replace(/\s/g, '')
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
    // Generate the color array based on the number of data points and the initial & final color.
    if (this.isSmallestValue) return colorLimits[0];
    let colorArray: string[];
    colorArray = this.generateColorArray(length, colorLimits);
    return colorArray[Math.floor(25 / (radius + 0.000001)) % 10];
  };

  public getLogColor = (radius: number, colorLimits: string[], logScale: number[]) => {
    // Generate a logarithmic color array based on the number of data points and the initial & final color.
    const color: string = this.generateColorLogArray(colorLimits, radius, logScale);
    return color;
  };

  private generateColorLogArray(colors: string[], value: any, logScale: number[]) {    
    // Gradient array creation.
    const colorGradient: string[] = this.getArrayGradient(colors, logScale.length); 
    // Color assignment by values
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
    // We convert to RGB to obtain numeric values that can be divided by the number of data points.
    // After dividing, the corresponding RGB code is converted to HEX and returned (RGB could also be used directly).
    let gradient = [];

    for (let i = 0; i < length - 1; i++) {
      const factor = i / length;
      // RGB code construction using start color, end color, and a multiplier
      const r = this.interpolate(this.hexToRgb(colors[1]).r,this.hexToRgb(colors[0]).r,factor);
      const g = this.interpolate(this.hexToRgb(colors[1]).g,this.hexToRgb(colors[0]).g,factor);
      const b = this.interpolate(this.hexToRgb(colors[1]).b,this.hexToRgb(colors[0]).b,factor);
      //RGB to HEX
      gradient.push(this.rgbToHex(r, g, b));
    }
    // Returned value in HEX format
    return gradient;
  }

  // Conversion functions
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

  // Function to get intermediate value
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
    this.auxZoom = this.zoom;
  }
  public mapEditClose(): void {
    this.auxCoordinates = null;
  }
  cancelChartProps() {
    this.coordinates = this.auxCoordinates; 
    this.zoom = this.auxZoom; 
  }
}