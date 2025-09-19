import { EdaDialogAbstract, EdaDialogCloseEvent, EdaDialog } from '@eda/shared/components/shared-components.index';
import { Component, ViewChild } from '@angular/core';
import { PanelChartComponent } from '../panel-charts/panel-chart.component';
import { PanelChart } from '../panel-charts/panel-chart';
import { MapUtilsService, StyleProviderService, ChartUtilsService } from "@eda/services/service.index";



@Component({
  selector: 'app-mapedit-dialog',
  templateUrl: './mapedit-dialog-v2.component.html'
})

export class MapEditDialogComponent extends EdaDialogAbstract {

   @ViewChild("PanelChartComponent", { static: false })
  myPanelChartComponent: PanelChartComponent;

  public dialog: EdaDialog;
  public panelChartConfig: PanelChart = new PanelChart();

  public color: string = "";
  public logarithmicScale: boolean = false;
  public baseLayer: boolean = true;
  public draggable: boolean;
  public legendPosition: string;

  // Memory ubication
  public zoom: number;
  public coordinates: Array<Array<number>>;

  // Styles
  public selectedPalette: { name: string; paleta: any } | null = null;
  public allPalettes: any = this.stylesProviderService.ChartsPalettes;

  public display: boolean = false;


  constructor(private mapUtilsService: MapUtilsService, private stylesProviderService: StyleProviderService, private ChartUtilsService: ChartUtilsService) {
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
      color: this.color,
      logarithmicScale: this.logarithmicScale,
      baseLayer: this.baseLayer,
      legendPosition: this.legendPosition,
      draggable: this.draggable,
      zoom: this.myPanelChartComponent.componentRef.instance.inject.zoom,
      coordinates:
        this.myPanelChartComponent.componentRef.instance.inject.coordinates,
    });
  }

  handleInputColor() {
    if (this.color.length > 6) {
      const leafletMap = this.myPanelChartComponent.componentRef.instance;
      leafletMap.reStyleGeoJsonLayer(this.color);
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

  modifyBaseLayer() {
    const leafletMap = this.myPanelChartComponent.componentRef.instance;
    leafletMap.modifyBaseLayer(this.baseLayer);
  }

  changeLegend(ubication: string) {
    this.legendPosition = ubication;
    const leafletMap = this.myPanelChartComponent.componentRef.instance;
    leafletMap.changeLegend(this.legendPosition);
  }

  closeChartConfig() {
    this.onClose(EdaDialogCloseEvent.NONE);
    this.mapUtilsService.cancelChartProps();
  }

  onShow(): void {
    //Funcion llamada al abrir el mapa edit
    this.zoom = this.controller.params.zoom;
    this.coordinates = this.controller.params.coordinates;
    this.legendPosition = this.controller.params.legendPosition;
    this.baseLayer = this.controller.params.baseLayer !== undefined ? this.controller.params.baseLayer :  true;
    this.color = this.controller.params.color;
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

    onPaletteSelected() { 
      // Saber numero de segmentos para interpolar colores
      
      // Recuperamos paleta seleccionada y creamos colores
      this.myPanelChartComponent['chartUtils'].MyPaletteColors = this.selectedPalette['paleta']; 
      const newColors = this.ChartUtilsService.generateRGBColorGradientScaleD3(1, this.myPanelChartComponent['chartUtils'].MyPaletteColors);
      
      // Actualizar los color pickers individuales al modificar la paleta
      this.color = newColors[0].color;
      
      // Actualizar los colores del chart
      const leafletMap = this.myPanelChartComponent.componentRef.instance;
      leafletMap.reStyleGeoJsonLayer(this.color);
    }
}