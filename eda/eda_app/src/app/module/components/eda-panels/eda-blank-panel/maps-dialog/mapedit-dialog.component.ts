import { EdaDialogAbstract, EdaDialogCloseEvent, EdaDialog } from '@eda/shared/components/shared-components.index';
import { Component, ViewChild } from '@angular/core';
import { PanelChartComponent } from '../panel-charts/panel-chart.component';
import { PanelChart } from '../panel-charts/panel-chart';



@Component({
  selector: 'app-mapedit-dialog',
  templateUrl: './mapedit-dialog.component.html'
})

export class MapEditDialogComponent extends EdaDialogAbstract {

  @ViewChild('PanelChartComponent', { static: false }) myPanelChartComponent: PanelChartComponent;

  public dialog: EdaDialog;
  public panelChartConfig: PanelChart = new PanelChart();

  public color:string = '';
  public logarithmicScale :boolean = false;

  public legendPosition : string;

  constructor() {

    super();

    this.dialog = new EdaDialog({
      show: () => this.onShow(),
      hide: () => this.onClose(EdaDialogCloseEvent.NONE),
      title: $localize`:@@ChartProps:PROPIEDADES DEL GRAFICO`
    });
  }

  saveChartConfig() {
    this.onClose(EdaDialogCloseEvent.UPDATE, {color:this.color, logarithmicScale :  this.logarithmicScale, legendPosition : this.legendPosition});
  }

  handleInputColor() {
    if(this.color.length > 6){
      const leafletMap = this.myPanelChartComponent.componentRef.instance;
      leafletMap.reStyleGeoJsonLayer(this.color);
    }
  }

  renderMap(){
    const leafletMap = this.myPanelChartComponent.componentRef.instance;
    leafletMap.changeScale(this.logarithmicScale);
  }
  changeLegend(){
    const leafletMap = this.myPanelChartComponent.componentRef.instance;
    leafletMap.changeLegend(this.legendPosition);
  }

  closeChartConfig() {
    this.onClose(EdaDialogCloseEvent.NONE);
  }

  onShow(): void {
    this.legendPosition = this.controller.params.legendPosition;
    this.color= this.controller.params.color;
    this.logarithmicScale = this.controller.params.logarithmicScale;
    this.panelChartConfig = this.controller.params.panelChart;
  }
  onClose(event: EdaDialogCloseEvent, response?: any): void {
    return this.controller.close(event, response);
  }


  rgb2hex(rgb): string {
    rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
    return (rgb && rgb.length === 4) ? '#' +
      ('0' + parseInt(rgb[1], 10).toString(16)).slice(-2) +
      ('0' + parseInt(rgb[2], 10).toString(16)).slice(-2) +
      ('0' + parseInt(rgb[3], 10).toString(16)).slice(-2) : '';
  }

  hex2rgb(hex, opacity = 100): string {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return 'rgba(' + r + ',' + g + ',' + b + ',' + opacity / 100 + ')';
  }

}