import { Component,  ViewChild } from "@angular/core";
import { EdaDialog, EdaDialogAbstract, EdaDialogCloseEvent } from "@eda/shared/components/shared-components.index";
import { PanelChart } from "../panel-charts/panel-chart";
import { PanelChartComponent } from "../panel-charts/panel-chart.component";

@Component({
  selector: 'knob-dialog',
  templateUrl: './knob-dialog.component.html'
})

export class KnobDialogComponent extends EdaDialogAbstract  {

  @ViewChild('PanelChartComponent', { static: false }) myPanelChartComponent: PanelChartComponent;

  public dialog: EdaDialog;
  public panelChartConfig: PanelChart = new PanelChart();
  public color:string = '';
  public min:number;
  public max: number; 
  public limitInQuery : boolean;

  constructor(){
    super();

    this.dialog = new EdaDialog({
      show: () => this.onShow(),
      hide: () => this.onClose(EdaDialogCloseEvent.NONE),
      title: $localize`:@@ChartProps:PROPIEDADES DEL GRAFICO`
    });
  }

  onShow(): void {

    this.panelChartConfig = this.controller.params.panelChart;
    setTimeout(_=> {
      this.color = this.myPanelChartComponent.componentRef.instance.color;
      const limits = this.myPanelChartComponent.componentRef.instance.limits;
      this.min = limits[0];
      this.max = limits[1];
    })
    this.limitInQuery = this.controller.params.panelChart.data.labels.length === 2 ? true : false;
  }
  onClose(event: EdaDialogCloseEvent, response?: any): void {
    return this.controller.close(event, response);
  }

  handleInputColor(){
    if(this.color.length > 6){
      this.myPanelChartComponent.componentRef.instance.color = this.color;
    }
  }

  saveChartConfig(){

    const properties = {
      color:this.color,
      limits:[this.min, this.max]
    }
    this.onClose(EdaDialogCloseEvent.UPDATE,properties)

  }

  closeChartConfig(){
    this.onClose(EdaDialogCloseEvent.NONE);
  }



}