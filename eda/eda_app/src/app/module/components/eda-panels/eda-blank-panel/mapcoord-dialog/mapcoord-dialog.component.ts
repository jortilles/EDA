import {
  EdaDialogAbstract,
  EdaDialogCloseEvent,
  EdaDialog,
} from "@eda/shared/components/shared-components.index";
import { Component, ViewChild } from "@angular/core";
import { PanelChartComponent } from "../panel-charts/panel-chart.component";
import { PanelChart } from "../panel-charts/panel-chart";
import { MapUtilsService } from "@eda/services/service.index";

@Component({
  selector: "app-mapcoordedit-dialog",
  templateUrl: "./mapcoord-dialog.component.html",
})
export class MapCoordDialogComponent extends EdaDialogAbstract {
  @ViewChild("PanelChartComponent", { static: false })
  myPanelChartComponent: PanelChartComponent;

  public dialog: EdaDialog;
  public panelChartConfig: PanelChart = new PanelChart();

  public initialColor: string = "";
  public finalColor: string = "";
  public logarithmicScale: boolean = false;
  public draggable: boolean;

  //Marc
  public zoom: number;
  public coordinates: Array<Array<number>>;

  public display: boolean = false;

  constructor(private mapUtilsService: MapUtilsService) {
    super();

    this.dialog = new EdaDialog({
      show: () => this.onShow(),
      hide: () => this.onClose(EdaDialogCloseEvent.NONE),
      title: $localize`:@@ChartProps:PROPIEDADES DEL GRAFICO`,
    });
    this.dialog.style = {
      width: "80%",
      height: "70%",
      top: "-4em",
      left: "1em",
    };
  }

  ngOnInit() {
    this.mapUtilsService.mapEditOpen();
  }
  ngOnDestroy(): void {
    this.mapUtilsService.mapEditClose();
  }

  saveChartConfig() {
    this.onClose(EdaDialogCloseEvent.UPDATE, {
      initialColor: this.initialColor,
      finalColor: this.finalColor,
      logarithmicScale: this.logarithmicScale,
      draggable: this.draggable,
      zoom: this.myPanelChartComponent.componentRef.instance.inject.zoom,
      coordinates:this.myPanelChartComponent.componentRef.instance.inject.coordinates,
    });
  }

  handleInputColor() {
    if (this.initialColor.length > 6 && this.finalColor.length > 6) {
      const leafletMap = this.myPanelChartComponent.componentRef.instance;
      leafletMap.reDrawCircles([this.initialColor, this.finalColor]);
    }
  }

  renderMap() {
    const leafletMap = this.myPanelChartComponent.componentRef.instance;
    leafletMap.changeScale(this.logarithmicScale);
  }

  nullMouseOptions() {
    const leafletMap = this.myPanelChartComponent.componentRef.instance;
    leafletMap.switchNoMouse(this.draggable);
  }

  closeChartConfig() {
    this.onClose(EdaDialogCloseEvent.NONE);
    this.mapUtilsService.cancelChartProps();
  }

  onShow(): void {
    //Funcion llamada al abrir el mapa edit
    this.zoom = this.controller.params.zoom;
    this.coordinates = this.controller.params.coordinates;
    this.initialColor = this.controller.params.initialColor;
    this.finalColor = this.controller.params.finalColor;
    this.logarithmicScale = this.controller.params.logarithmicScale;
    this.draggable = this.controller.params.draggable;
    this.panelChartConfig = this.controller.params.panelChart;
    this.display = true;
  }
  onClose(event: EdaDialogCloseEvent, response?: any): void {
    return this.controller.close(event, response);
  }

  rgb2hex(rgb): string {
    rgb = rgb.match(
      /^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i
    );
    return rgb && rgb.length === 4
      ? "#" +
          ("0" + parseInt(rgb[1], 10).toString(16)).slice(-2) +
          ("0" + parseInt(rgb[2], 10).toString(16)).slice(-2) +
          ("0" + parseInt(rgb[3], 10).toString(16)).slice(-2)
      : "";
  }

  hex2rgb(hex, opacity = 100): string {
    hex = hex.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return "rgba(" + r + "," + g + "," + b + "," + opacity / 100 + ")";
  }
}
