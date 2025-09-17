import { Component,  ViewChild } from "@angular/core";
import { EdaDialog, EdaDialogAbstract, EdaDialogCloseEvent } from "@eda/shared/components/shared-components.index";
import { SunburstConfig } from "../panel-charts/chart-configuration-models/sunburst-config";
import { PanelChart } from "../panel-charts/panel-chart";
import { PanelChartComponent } from "../panel-charts/panel-chart.component";

@Component({
  selector: 'sunburst-dialog',
  templateUrl: './sunburst-dialog.component.html'
})

export class SunburstDialogComponent extends EdaDialogAbstract  {

  @ViewChild('PanelChartComponent', { static: false }) myPanelChartComponent: PanelChartComponent;

  public dialog: EdaDialog;
  public panelChartConfig: PanelChart = new PanelChart();
  public colors: Array<any>;
  public labels: Array<any>;
  public display:boolean=false;

  constructor() {

    super();

    this.dialog = new EdaDialog({
      show: () => this.onShow(),
      hide: () => this.onClose(EdaDialogCloseEvent.NONE),
      title: $localize`:@@ChartProps:PROPIEDADES DEL GRAFICO`
    });
    this.dialog.style = { width: '80%', height: '70%', top:"-4em", left:'1em'};
  }
  ngAfterViewChecked(): void {
    if (!this.colors && this.myPanelChartComponent?.componentRef) {
      //To avoid "Expression has changed after it was checked" warning
      setTimeout(() => {
        this.labels = this.myPanelChartComponent.componentRef.instance.firstColLabels;
        let colorMap: { [key: string]: { value: string; color: string } } = {};
        // Recuperamos valores de assignedColor {label: , color:}
        this.myPanelChartComponent.props.config.getConfig()['assignedColors'].forEach(item => {
          colorMap[item.value] = item;
        });
        // Asignamos el mismo color a los que tienen el mismo label
        const sortedAssignedColors = this.labels
          .map(label => colorMap[label])
          .filter((item): item is { value: string; color: string } => !!item);
        // Transformación para los colorPicker del dialog
        this.colors = sortedAssignedColors.map(color => this.rgb2hex(color.color));
      }, 0);
    }
  }

  onShow(): void {
    this.panelChartConfig = this.controller.params.panelChart;
    this.display = true;

  }
  onClose(event: EdaDialogCloseEvent, response?: any): void {
    return this.controller.close(event, response);
  }

  saveChartConfig() {
    this.onClose(EdaDialogCloseEvent.UPDATE, {colors : this.colors.map(color => this.hex2rgb(color))});
  }

  closeChartConfig() {
    this.onClose(EdaDialogCloseEvent.NONE);
  }

  handleInputColor() {
    // Mapeo colores únicos a valores repetidos en data.values (para sunburst)
    const colorMap: Record<string, string> = {};
    let colorIndex = 0;
    this.myPanelChartComponent.props.config.getConfig()['data'].values.forEach(item => {
      const value = item[0];
      if (!colorMap[value]) {
        colorMap[value] = this.colors[colorIndex++];
      }
    });
  
    // Guardar copia profunda de colores originales para restaurar luego
    const originalColors = JSON.parse(
      JSON.stringify(this.myPanelChartComponent.props.config.getConfig()['assignedColors'])
    );
  
    // Actualizar temporalmente los colores según colorMap
    this.myPanelChartComponent.props.config.getConfig()['assignedColors'].forEach(element => {
      if (colorMap[element.value]) {
        element.color = colorMap[element.value];
      }
    });
    this.myPanelChartComponent.changeChartType();
  
    // Restaurar colores originales tras refrescar el gráfico
    setTimeout(() => {
      this.myPanelChartComponent.props.config.getConfig()['assignedColors'] = originalColors;
    }, 0);
  }

  hex2rgb(hex, opacity = 100): string {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return 'rgba(' + r + ',' + g + ',' + b + ',' + opacity / 100 + ')';
  }

  rgb2hex(rgb): string {
    rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
    return (rgb && rgb.length === 4) ? '#' +
      ('0' + parseInt(rgb[1], 10).toString(16)).slice(-2) +
      ('0' + parseInt(rgb[2], 10).toString(16)).slice(-2) +
      ('0' + parseInt(rgb[3], 10).toString(16)).slice(-2) : '';
  }
  labePrettify(label){
    return label.replaceAll('|+-+|', ' - ') + ': ';
  }

}