import { OnInit, Input, AfterViewChecked, SecurityContext, Output, EventEmitter } from "@angular/core";
import { Component, AfterViewInit } from "@angular/core";
import { MapUtilsService, StyleProviderService } from "@eda/services/service.index";
import { EdaMap } from "./eda-map";
import { LatLngExpression } from "leaflet";
import { animate, style, transition, trigger } from "@angular/animations";
import { DomSanitizer } from "@angular/platform-browser";

import * as L from 'leaflet';
import { feature } from "topojson-client";

import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: "eda-geomap",
  templateUrl: "./eda-geojson-map.component.html",
  styleUrls: ["./eda-map.component.css"],
  animations: [
    trigger("inOutAnimation", [
      transition(":leave", [
        style({ height: 500, opacity: 1 }),
        animate("1s ease-in", style({ height: 0, opacity: 0 })),
      ]),
    ]),
  ],
  imports: [FormsModule, CommonModule]
})
export class EdaGeoJsonMapComponent implements OnInit, AfterViewInit, AfterViewChecked {
  @Input() inject: EdaMap;
  @Output() onClick: EventEmitter<any> = new EventEmitter<any>();

  private map: any;
  private geoJson: any;
  private shapes: any;
  private groups: Array<number>;
  private customOptions: any;
  private legend: any;
  private labelIdx: number;
  private dataIndex: number;
  private serverMap: any = null;

  // Usar assignedColors en lugar de color individual
  public assignedColors: Array<{ value: string, color: string }> = [];

  public logarithmicScale: boolean;
  public baseLayerLayer: any;
  public baseLayer: boolean;
  public draggable: boolean;
  public legendPosition: string;
  public loading: boolean;
  public isEditMap: boolean = false;
  public boundaries: Array<any> = [];
  private paletaActual: string[];

  constructor(
    private mapUtilsService: MapUtilsService,
    private _sanitizer: DomSanitizer,
    public styleProviderService: StyleProviderService
  ) {
    this.customOptions = {
      className: "custom",
      offset: [-20, -20],
      autoPan: false,
      closeButton: false,
    };
  }

  ngOnInit(): void {
    this.loading = true;
    this.paletaActual = this.styleProviderService.ActualChartPalette['paleta'];
    this.labelIdx = this.inject.query.findIndex((e) => e.column_type === "text" || e.column_type === "text");
    this.dataIndex = this.inject.query.findIndex((e) => e.column_type === "numeric");

    if (this.inject.query) {
      this.serverMap = this.inject.maps.filter(
        (map) => map["mapID"] === this.inject.query[this.labelIdx].linkedMap)[0];
      this.mapUtilsService.initShapes(this.serverMap["mapID"]);
    }

    // CARGAR assignedColors del inject
    if (this.inject.assignedColors && Array.isArray(this.inject.assignedColors) && this.inject.assignedColors.length > 0) {
      this.assignedColors = this.inject.assignedColors;
    } else {
      // Crear colores por defecto
      this.assignedColors = [
        { value: 'Color', color: this.paletaActual[0] }
      ];
    }

    this.logarithmicScale = this.inject.logarithmicScale ? this.inject.logarithmicScale : false;
    this.baseLayer = this.inject.baseLayer === undefined ? true : this.inject.baseLayer;
    this.draggable = this.inject.draggable === undefined ? true : this.inject.draggable;
    this.legendPosition = this.inject.legendPosition ? this.inject.legendPosition : "bottomright";
    this.legend = new (L.Control.extend({ options: { position: this.legendPosition } }))();
    this.baseLayerLayer = L.tileLayer(
      "https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
      }
    );
  }
  ngAfterViewInit(): void {
    if (this.serverMap) {
      this.setGroups();
      this.checkElement("#" + this.inject.div_name).then((element) => {
        this.initMap();
        this.mapUtilsService
          .getShapes(this.serverMap["mapID"])
          .subscribe((shapes) => {
            this.shapes = shapes.file;
            this.initShapesLayer();
          });
      });
    }
  }

  private initShapesLayer = () => {
    const field = this.serverMap["field"];
    const totalSum = this.inject.data
      .map((row) => row[this.dataIndex])
      .reduce((a, b) => a + b);

    const geoJsonData = feature(this.shapes, this.shapes.objects.foo);

    this.geoJson = L.geoJson(geoJsonData, {
      style: (feature) => this.style(feature),
      onEachFeature: this.onEachFeature,
    });

    this.geoJson.eachLayer((layer) => {
      this.boundaries.push(layer._bounds);
      layer.bindPopup(
        this.mapUtilsService.makeGeoJsonPopup(
          layer.feature.properties[field],
          this.inject.data,
          this.inject.labels,
          this.labelIdx,
          totalSum
        ),
        this.customOptions
      );
      layer.on("mouseover", function () {
        layer.openPopup();
      });
      layer.on("mouseout", function () {
        layer.closePopup();
      });
      layer.on("click", (mouseevent, data) => {
        if (this.inject.linkedDashboard) {
          this.openLinkedDashboard(layer.feature.properties.name);
        } else {
          const label = layer.feature.properties.name;
          const filterBy = this.inject.labels[this.inject.data[0].findIndex((element) => typeof element === 'string')];
          this.onClick.emit({ label, filterBy });
        }
      });
    });

    if (this.map) {
      this.geoJson.addTo(this.map);
      if (this.inject.zoom) this.map.zoom = this.inject.zoom;
      else this.map.fitBounds(this.boundaries);
    } else {
      console.log("map not yet ready");
    }

    this.geoJson.on("add", this.onloadLayer());
  };

  private onloadLayer = () => {
    setTimeout(() => {
      this.loading = false;
    }, 0);
  };

  private rafAsync() {
    return new Promise((resolve) => {
      requestAnimationFrame(resolve);
    });
  }

  private checkElement(selector) {
    if (document.querySelector(selector) === null) {
      return this.rafAsync().then(() => this.checkElement(selector));
    } else {
      return Promise.resolve(true);
    }
  }

  private initMap = (): void => {
    if (L.DomUtil.get(this.inject.div_name) !== null) {
      this.map = L.map(this.inject.div_name, {
        minZoom: 0,
        maxZoom: 16,
        center: this.getCenter(this.inject.data),
        zoom: this.mapUtilsService.getZoom() ?? this.inject.zoom ?? 12,
        dragging: this.draggable,
        scrollWheelZoom: this.draggable,
      });

      if (this.baseLayer) {
        this.baseLayerLayer.addTo(this.map);
      } else {
        this.map.removeLayer(this.baseLayerLayer);
      }

      this.map.on("moveend", (event) => {
        let c = this.map.getCenter();
        this.inject.coordinates = [c.lat, c.lng];
        this.mapUtilsService.setCoordinates(this.inject.coordinates);
      });

      this.map.on("zoomend", (event) => {
        this.inject.zoom = this.map.getZoom();
        this.mapUtilsService.setZoom(this.inject.zoom);
      });

      this.map.options.minZoom = 1;
      this.initLegend(this.groups, this.inject.labels[this.dataIndex]);
    } else {
      console.log("Div not yet ready");
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

  ngAfterViewChecked() {
    if (this.map) {
      this.map.invalidateSize();
    }
  }

  private getCenter(data: Array<any>) {
    let coordinates = this.inject.coordinates
      ? this.inject.coordinates
      : [this.serverMap.center[1], this.serverMap.center[0]];
    if (coordinates[0] === null || coordinates[1] === null) {
      coordinates[0] = 41.97233;
      coordinates[1] = 2.8116391;
    }
    return coordinates as LatLngExpression;
  }

  private onEachFeature = (feature, layer) => {
    layer.on({});
  };

  private highlightFeature = (e) => {
    let layer = e.target;
    layer.setStyle({
      weight: 2,
      color: "#FFFF",
      dashArray: "",
      fillOpacity: 0.7,
    });

    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
      layer.bringToFront();
    }
  };

  private resetHighlight = (e) => {
    this.geoJson.resetStyle(e.target);
  };

  private style = (feature) => {
    const field = this.serverMap["field"];
    let fillColor = this.getColor(
      this.groups,
      this.bindDataToProperties(feature.properties[field])
    );
    return {
      weight: 0.1,
      opacity: 1,
      color: "#FFFFFF",
      fillOpacity: 0.5,
      fillColor: fillColor,
    };
  };

  private bindDataToProperties = (feature_property: string) => {
    const clean = (s: string) => (s ? s.toUpperCase().replace(/\s/g, "") : s);
    let data = this.inject.data
      .filter((row) => clean(row[this.labelIdx]) === clean(feature_property))
      .map((row) => row[this.dataIndex]);
    return data[0];
  };

  private getColor = (groups: Array<number>, value: number) => {
    if (!value) return "#eef0f3";

    // Obtener el color base de assignedColors
    const baseColor = this.assignedColors[0]?.color || this.paletaActual[0];
    let group = [value, ...groups].sort((a, b) => a - b).indexOf(value);
    let shade = group === 0 ? 80 : group === 1 ? 40 : group === 2 ? 0 : group == 3 ? -40 : -80;

    return this.colorShade(baseColor, shade);
  };

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

  // Método público para actualizar colores desde el dialog
  public updateMapColors = (colors: string[]) => {
      this.assignedColors = [
        { value: 'Color', color: colors[0] }
      ];
    this.reRenderMap();
  };

  public reStyleGeoJsonLayer = (color: string) => {
    // Mantener compatibilidad con código legacy
    this.assignedColors[0].color = color;
    this.reRenderMap();
  };

  private reRenderMap = () => {
    this.map.removeLayer(this.geoJson);
    this.initShapesLayer();
    this.initLegend(this.groups, this.inject.labels[this.dataIndex]);
  };

  public changeScale = (logarithmicScale: boolean) => {
    this.logarithmicScale = logarithmicScale;
    this.map.removeLayer(this.geoJson);
    this.setGroups();
    this.initShapesLayer();
    this.initLegend(this.groups, this.inject.labels[this.dataIndex]);
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
    this.initShapesLayer();
    this.initLegend(this.groups, this.inject.labels[this.dataIndex]);
  }

  public modifyBaseLayer(baseLayerActivated: boolean) {
    this.baseLayer = baseLayerActivated;
    if (this.baseLayer) {
      this.baseLayerLayer.addTo(this.map);
    } else {
      this.map.removeLayer(this.baseLayerLayer);
    }
  }

  public changeLegend = (legendPosition: string) => {
    this.map.removeControl(this.legend);
    this.legend = new (L.Control.extend({ options: { position: this.legendPosition } }))();
    this.initLegend(this.groups, this.inject.labels[this.dataIndex]);
  };

  public openLinkedDashboard(value: string) {
    if (this.inject.linkedDashboard) {
      const props = this.inject.linkedDashboard;
      const url =
        window.location.href.substr(0, window.location.href.indexOf("/dashboard")) +
        `/dashboard/${props.dashboardID}?${props.table}.${props.col}=${value}`;
      window.open(url, "_blank");
    }
  }

  private colorShade = (col, amt) => {
    col = col.replace(/^#/, "");
    if (col.length === 3)
      col = col[0] + col[0] + col[1] + col[1] + col[2] + col[2];

    let [r, g, b] = col.match(/.{2}/g);
    [r, g, b] = [
      parseInt(r, 16) + amt,
      parseInt(g, 16) + amt,
      parseInt(b, 16) + amt,
    ];

    r = Math.max(Math.min(255, r), 0).toString(16);
    g = Math.max(Math.min(255, g), 0).toString(16);
    b = Math.max(Math.min(255, b), 0).toString(16);

    const rr = (r.length < 2 ? "0" : "") + r;
    const gg = (g.length < 2 ? "0" : "") + g;
    const bb = (b.length < 2 ? "0" : "") + b;
    return `#${rr}${gg}${bb}`;
  };

  private initLegend = (groups: Array<number>, label: string): void => {
    let me = this;
    label = me._sanitizer.sanitize(SecurityContext.HTML, label);
    const baseColor = this.assignedColors[0].color;

    this.legend.onAdd = function (map) {
      var div = L.DomUtil.create("div", "legend");
      L.DomUtil.addClass(div, "map-legend");
      div.style.backgroundColor = "#ffffff38";
      div.style.borderRadius = "5%";
      div.innerHTML += `<h6 style="padding : 5px; padding-top:10px; padding-bottom:0px;font-weight:bold">
                        ${(label.charAt(0).toUpperCase() + label.slice(1)).replace(new RegExp("_", "g"), " ")} </h6>`;
      var div2 = L.DomUtil.create("div", "innerlegend", div);
      div2.style.padding = "3px";
      div2.style.textAlign = "left";
      div2.style.lineHeight = "1";
      let g = [...groups];
      g.push(0);
      for (let i = g.length - 1; i > 0; i--) {
        let shade = i === 0 ? -80 : i === 1 ? -40 : i === 2 ? 0 : i === 3 ? 40 : 80;
        div2.innerHTML += `<span class="circle" style="color: ${me.colorShade(baseColor, shade)}">
                          </span><span>&nbsp ${new Intl.NumberFormat("de-DE").format(Math.floor(g[i]))} - 
                          ${new Intl.NumberFormat("de-DE").format(Math.floor(g[i - 1]))}</span><br>`;
      }
      return div;
    };

    this.legend.addTo(this.map);
  };
}