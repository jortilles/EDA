import { Component, ViewChild, AfterViewChecked } from '@angular/core';
import { EdaDialog, EdaDialogAbstract, EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import { PanelChart } from '../panel-charts/panel-chart';
import { PanelChartComponent } from '../panel-charts/panel-chart.component';
import { TreeMapConfig } from '../panel-charts/chart-configuration-models/treeMap-config';


@Component({
  selector: 'app-treeMap-dialog',
  templateUrl: './treeMap-dialog.component.html'
})

export class TreeMapDialog extends EdaDialogAbstract implements AfterViewChecked {

  @ViewChild('PanelChartComponent', { static: false }) myPanelChartComponent: PanelChartComponent;

  public dialog: EdaDialog;
  public panelChartConfig: PanelChart = new PanelChart();
  public colors: Array<string>;
  private originalColors: string[] = [];
  public labels: Array<string>;
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
        const assignedColors = this.myPanelChartComponent.props.config.getConfig()['assignedColors'];
        const colorMap: { [key: string]: { value: string; color: string } } = {};
        assignedColors.forEach(item => colorMap[item.value] = item);

        // Asigna color y label a cada valor del chart
        const sortedAssignedColors = this.labels
          .map(label => colorMap[label])
          .filter((item): item is { value: string; color: string } => !!item);

        this.colors = sortedAssignedColors.map(c => this.rgb2hex(c.color));
        this.originalColors = [...this.colors]; // Guardar estado original aquí
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

  handleInputColor(): void {
    const rgbColors = this.colors.map(c => this.hex2rgb(c));
    const original = JSON.parse(JSON.stringify(this.myPanelChartComponent.props.config.getConfig()['assignedColors']));
    // Recuperar colores de assignedColor (chart)
    this.labels.forEach((label, i) => {
      const match = this.myPanelChartComponent.props.config.getConfig()['assignedColors'].find(c => c.value === label);
      if (match) match.color = rgbColors[i];
    });

    this.myPanelChartComponent.changeChartType();
    // Actualiza originalColors con el nuevo estado después de cambiar el tipo de gráfico
    this.originalColors = [...this.colors];
    // Actualiza el componente con los valores originales por si no se guarda la modif
    setTimeout(() => {
      this.myPanelChartComponent.props.config.getConfig()['assignedColors'] = original;
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

}