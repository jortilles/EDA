import { EdaDialogAbstract, EdaDialogCloseEvent, EdaDialog } from '@eda/shared/components/shared-components.index';
import { Component, EventEmitter, Output, ViewChild } from '@angular/core';
import { PanelChartComponent } from '../panel-charts/panel-chart.component';
import { PanelChart } from '../panel-charts/panel-chart';
import { UserService } from '@eda/services/service.index';
import { EdaChart } from '@eda/components/eda-chart/eda-chart';




@Component({
  selector: 'app-dynamicText-dialog',
  templateUrl: './dynamicText-dialog.component.html',
  styleUrls: ['./dynamicText-dialog.component.css']
})

export class dynamicTextDialogComponent extends EdaDialogAbstract {

  @ViewChild('PanelChartComponent', { static: false }) PanelChartComponent: PanelChartComponent;

  public dialog: EdaDialog;
  public panelChartConfig: PanelChart = new PanelChart();
  public chart: EdaChart;
  public value: number;
  public operand: string;
  @Output() color: any = '#000000';
  @Output() messageEvent = new EventEmitter<any>();
  public disabled:boolean;
  public display:boolean=false;

  constructor( private userService: UserService,) {

    super();

    this.dialog = new EdaDialog({
      show: () => this.onShow(),
      hide: () => this.onClose(EdaDialogCloseEvent.NONE),
      title: $localize`:@@ChartProps:PROPIEDADES DEL GRAFICO`
    });
    this.dialog.style = { width: '80%', height: '70%', top:"-4em", left:'1em'};

    
  }
  
  saveChartConfig() {
    this.PanelChartComponent.fontColor=this.color;
    this.messageEvent.emit(this.color)
    this.PanelChartComponent.props.config.getConfig["color"]=this.color
    this.onClose(EdaDialogCloseEvent.UPDATE,
      {
        color : this.color,
      });
  }
  closeChartConfig() {
    this.onClose(EdaDialogCloseEvent.NONE);
  }

  onShow(): void {
    this.panelChartConfig = this.controller.params.panelChart;
    if(this.controller.params.panelChart.config.config.color!==undefined){
      this.color= this.controller.params.panelChart.config.config.color;
    }else {
      this.color= this.controller.params.panelChart.config.config;
    }
    
    this.display = true;
  }
  onClose(event: EdaDialogCloseEvent, response?: any): void {
    return this.controller.close(event, response);
  }

  handleInputColor(){
    this.PanelChartComponent.props.config.setConfig( this.color )
    this.PanelChartComponent.changeChartType();
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

  fillWithZeros(n: number) {
    if (n < 10) return `0${n}`
    else return `${n}`;
  }
}