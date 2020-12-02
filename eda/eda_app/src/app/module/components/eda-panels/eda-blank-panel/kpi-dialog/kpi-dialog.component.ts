import { EdaDialogAbstract, EdaDialogCloseEvent, EdaDialog } from '@eda/shared/components/shared-components.index';
import { Component, ViewChild } from '@angular/core';
import { PanelChartComponent } from '../panel-charts/panel-chart.component';
import { PanelChart } from '../panel-charts/panel-chart';



@Component({
  selector: 'app-kpi-dialog',
  templateUrl: './kpi-dialog.component.html',
  styleUrls: ['./kpi-dialog.component.css']
})

export class KpiEditDialogComponent extends EdaDialogAbstract {

  @ViewChild('PanelChartComponent', { static: false }) myPanelChartComponent: PanelChartComponent;

  public dialog: EdaDialog;
  public panelChartConfig: PanelChart = new PanelChart();

  public value: number;
  public operand: string;
  public color: string;
  public alerts: Array<any> = [];
  public alertInfo : string = $localize`:@@alertsInfo: Cuando el valor del kpi sea (=, <,>) que el valor definido cambiará el color del texto`

  constructor() {

    super();

    this.dialog = new EdaDialog({
      show: () => this.onShow(),
      hide: () => this.onClose(EdaDialogCloseEvent.NONE),
      title: $localize`:@@ChartProps:PROPIEDADES DEL GRAFICO`
    });
  }

  saveChartConfig() {
    this.onClose(EdaDialogCloseEvent.UPDATE,
      {
        alerts: this.alerts,
        sufix: this.myPanelChartComponent.componentRef.instance.inject.sufix
      });
  }
  closeChartConfig() {
    this.onClose(EdaDialogCloseEvent.NONE);
  }

  onShow(): void {
    this.panelChartConfig = this.controller.params.panelChart;
    const config: any = this.panelChartConfig.config.getConfig();
    this.alerts = [...config.alertLimits] //deepcopy
  }
  onClose(event: EdaDialogCloseEvent, response?: any): void {
    return this.controller.close(event, response);
  }

  addAlert() {
    this.alerts.push(
      {
        value: this.value ? this.value : 0,
        operand: this.operand,
        color: this.color
      });
  }
  deleteAlert(item) {
    this.alerts = this.alerts.filter(alert => {
      return alert.operand !== item.operand || alert.value !== item.value || alert.color !== item.color
    });
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