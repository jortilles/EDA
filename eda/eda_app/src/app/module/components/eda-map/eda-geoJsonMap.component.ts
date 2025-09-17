import {
  OnInit,
  Input,
  AfterViewChecked,
  SecurityContext,
  Output,
  EventEmitter,
} from "@angular/core";
import { Component, AfterViewInit } from "@angular/core";
import { MapUtilsService } from "@eda/services/service.index";
import { EdaMap } from "./eda-map";
import { Draggable, LatLngExpression } from "leaflet";
import { animate, style, transition, trigger } from "@angular/animations";
import { DomSanitizer } from "@angular/platform-browser";

const L = require("./topoJsonExtention");
@Component({
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
})
export class EdaGeoJsonMapComponent
  implements OnInit, AfterViewInit, AfterViewChecked
{
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
  public color: string = "#006400";
  public logarithmicScale: boolean;
  public baseLayerLayer: any;
  public baseLayer: boolean;
  public draggable: boolean;
  public BASE_COLOR: string = "#006400";
  public legendPosition: string;
  public loading: boolean;
  public isEditMap: boolean = false;
  public boundaries: Array<any> = [];

  constructor(
    private mapUtilsService: MapUtilsService,
    private _sanitizer: DomSanitizer
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
    this.labelIdx = this.inject.query.findIndex(
      (e) => e.column_type === "text" || e.column_type === "text"
    );
    this.dataIndex = this.inject.query.findIndex(
      (e) => e.column_type === "numeric"
    );
    if (this.inject.query) {
      this.serverMap = this.inject.maps.filter(
        (map) => map["mapID"] === this.inject.query[this.labelIdx].linkedMap
      )[0];
      this.mapUtilsService.initShapes(this.serverMap["mapID"]); /** to delete */
    }
    this.color = this.inject.color ? this.inject.color : this.BASE_COLOR;
    this.logarithmicScale = this.inject.logarithmicScale ? this.inject.logarithmicScale : false;
    this.baseLayer = this.inject.baseLayer === undefined ? true : this.inject.baseLayer;
    this.draggable = this.inject.draggable === undefined ? true : this.inject.draggable;
    this.legendPosition = this.inject.legendPosition
      ? this.inject.legendPosition
      : "bottomright";
    this.legend = new L.Control({ position: this.legendPosition });
    this.baseLayerLayer = L.tileLayer("https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png",
          {
            maxZoom: 19,
            attribution:'&copy; <a href="http://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
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

    this.geoJson = new L.TopoJSON(this.shapes, {
      style: (feature) => this.style(feature, this.color),
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
          this.openLinkedDashboard(layer.feature.properties.name)
        }
        else{
          //Passem aquestes dades
          const label = layer.feature.properties.name;
          const filterBy = this.inject.labels[this.inject.data[0].findIndex((element) => typeof element === 'string')]
          this.onClick.emit({ label, filterBy });
        }
      }
      );
    });
    if (this.map) {
      this.geoJson.addTo(this.map);
      if (this.inject.zoom) this.map.zoom = this.inject.zoom;
      else this.map.fitBounds(this.boundaries);
      this.map.setMaxBounds(this.boundaries);
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
      requestAnimationFrame(resolve); //faster than set time out
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
        center:
          this.mapUtilsService.getCoordinates() ??
          this.getCenter(this.inject.data),
        zoom:
          this.mapUtilsService.getZoom() ??
          this.inject.zoom ??
          12,
        dragging: this.draggable,
        baseLayer: this.inject.baseLayer,
        tap: !L.Browser.mobile,
        scrollWheelZoom: this.draggable,
      });

      if (this.baseLayer) {this.baseLayerLayer.addTo(this.map);}
      else {this.map.removeLayer(this.baseLayerLayer)}
      

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
      this.map.options.minZoom = 1;
      //tiles.addTo(this.map);
      this.initLegend(
        this.groups,
        this.inject.labels[this.dataIndex],
        this.color
      );
    } else {
      console.log("Div not yet ready");
    }
  };


  

  /*
  private setMinZoom(): number {
    let bounds = this.map.getBounds();
    let NE = bounds._northEast;
    let SW = bounds._southWest;
    let lng = NE.lng - SW.lng;

    // Zomm level for world map 
    let zoomLevel = 0;
    let bound = 200;

    if (lng > bound) return zoomLevel;
    else {
      while (lng < bound) {
        bound = bound / 2;
        zoomLevel++;
      }
      return zoomLevel;
    }
  }
  */

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

  /**
   * Get coordinates to center map
   * @param data
   */
  private getCenter(data: Array<any>) {
    let coordinates = this.inject.coordinates
      ? this.inject.coordinates
      : [this.serverMap.center[1], this.serverMap.center[0]];
    if (coordinates[0] === null || coordinates[1] === null) {
      let x: number, y: number;
      x = 41.97233;
      y = 2.8116391;
      coordinates[0] = x;
      coordinates[1] = y;
    }
    return coordinates as LatLngExpression;
  }

  private onEachFeature = (feature, layer) => {
    layer.on({
      /**Disabled cause pop up is displayed on hover  */
      //mouseover: this.highlightFeature,
      //mouseout: this.resetHighlight
    });
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

  private style = (feature, color) => {
    const field = this.serverMap["field"];
    let fillColor = this.getColor(
      this.groups,
      this.bindDataToProperties(feature.properties[field]),
      color
    );
    return {
      weight: 0.1,
      opacity: 1,
      color: "#FFFFFF",
      fillOpacity: 0.5,
      fillColor: fillColor, //'#6DB65B'
    };
  };

  /**
   * bind data to feature_property, returns one row
   * @param feature_property
   */
  private bindDataToProperties = (feature_property: string) => {
    const clean = (s: string) => (s ? s.toUpperCase().replace(/\s/g, "") : s);
    let data = this.inject.data
      .filter((row) => clean(row[this.labelIdx]) === clean(feature_property))
      .map((row) => row[this.dataIndex]);
    return data[0];
  };

  /**
   * Get color shade depending on wich group belongs value
   * @param groups
   * @param value
   */
  private getColor = (groups: Array<number>, value: number, color: string) => {
    if (!value) return "#eef0f3";
    let group = [value, ...groups].sort((a, b) => a - b).indexOf(value);
    let shade =
      group === 0
        ? 80
        : group === 1
        ? 40
        : group === 2
        ? 0
        : group == 3
        ? -40
        : -80;
    return this.colorShade(color, shade);
  };

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

  public reStyleGeoJsonLayer = (color: string) => {
    this.color = color;
    this.map.removeLayer(this.geoJson);
    this.initShapesLayer();
    this.initLegend(
      this.groups,
      this.inject.labels[this.dataIndex],
      this.color
    );
  };
  public changeScale = (logarithmicScale: boolean) => {
    this.logarithmicScale = logarithmicScale;
    this.map.removeLayer(this.geoJson);
    this.setGroups();
    this.initShapesLayer();
    this.initLegend(
      this.groups,
      this.inject.labels[this.dataIndex],
      this.color
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
    this.initShapesLayer();
    this.initLegend(
      this.groups,
      this.inject.labels[this.dataIndex],
      this.color
    );
  }

  public modifyBaseLayer(baseLayerActivated: boolean) {
    this.baseLayer = baseLayerActivated;
    if (this.baseLayer) {this.baseLayerLayer.addTo(this.map);}
    else {this.map.removeLayer(this.baseLayerLayer)}
  }

  public changeLegend = (legendPosition: string) => {
    // this.map.removeLayer(this.geoJson);
    this.map.removeControl(this.legend);
    // this.setGroups();
    //this.initShapesLayer();
    this.legend = new L.Control({ position: legendPosition });
    this.initLegend(
      this.groups,
      this.inject.labels[this.dataIndex],
      this.color
    );
  };

  public openLinkedDashboard(value: string) {
    if (this.inject.linkedDashboard) {
      const props = this.inject.linkedDashboard;
      const url =
        window.location.href.substr(
          0,
          window.location.href.indexOf("/dashboard")
        ) +
        `/dashboard/${props.dashboardID}?${props.table}.${props.col}=${value}`;
      window.open(url, "_blank");
    }
  }

  /**
   * Color shade, credit to https://stackoverflow.com/users/2012407/antoni :)
   * @param col
   * @param amt
   */
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

  private initLegend = (
    groups: Array<number>,
    label: string,
    color: string
  ): void => {
    let me = this;
    label = me._sanitizer.sanitize(SecurityContext.HTML, label);
    this.legend.onAdd = function (map) {
      var div = L.DomUtil.create("div", "legend");
      L.DomUtil.addClass(div, "map-legend");
      div.style.backgroundColor = "#ffffff38";
      div.style.borderRadius = "5%";
      div.innerHTML += `<h6 style="padding : 5px; padding-top:10px; padding-bottom:0px;font-weight:bold">
                        ${(
                          label.charAt(0).toUpperCase() + label.slice(1)
                        ).replace(new RegExp("_", "g"), " ")} </h6>`;
      var div2 = L.DomUtil.create("div", "innerlegend", div);
      div2.style.padding = "3px";
      div2.style.textAlign = "left";
      div2.style.lineHeight = "1";
      let g = [...groups];
      g.push(0);
      for (let i = g.length - 1; i > 0; i--) {
        let shade =
          i === 0 ? -80 : i === 1 ? -40 : i === 2 ? 0 : i === 3 ? 40 : 80;
        div2.innerHTML += `<span class="circle" style="color: ${me.colorShade(
          color,
          shade
        )}">
                          </span><span>&nbsp ${new Intl.NumberFormat(
                            "de-DE"
                          ).format(Math.floor(g[i]))} - 
                          ${new Intl.NumberFormat("de-DE").format(
                            Math.floor(g[i - 1])
                          )}</span><br>`;
      }
      return div;
    };

    this.legend.addTo(this.map);
  };
}
