import { Component,  CUSTOM_ELEMENTS_SCHEMA,  ViewChild } from "@angular/core";
import { EdaDialog, EdaDialogAbstract, EdaDialogCloseEvent } from "@eda/shared/components/shared-components.index";
import { SunburstConfig } from "../panel-charts/chart-configuration-models/sunburst-config";
import { PanelChart } from "../panel-charts/panel-chart";
import { PanelChartComponent } from "../panel-charts/panel-chart.component";
import { StyleProviderService,ChartUtilsService } from '@eda/services/service.index';

import { FormsModule } from '@angular/forms'; 
import { CommonModule } from '@angular/common';
@Component({
  standalone: true,
  selector: 'sunburst-dialog',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './sunburst-dialog.component.html',
  imports: [FormsModule, CommonModule]
})

export class SunburstDialogComponent extends EdaDialogAbstract  {

  @ViewChild('PanelChartComponent', { static: false }) myPanelChartComponent: PanelChartComponent;

  public dialog: EdaDialog;
  public panelChartConfig: PanelChart = new PanelChart();
  public colors: Array<string>;
  private originalColors: string[] = [];
  public labels: Array<string>;
  public display:boolean=false;
  public selectedPalette: { name: string; paleta: any } | null = null;
  public allPalettes: any = this.stylesProviderService.ChartsPalettes;

  constructor(private stylesProviderService: StyleProviderService, private ChartUtilsService: ChartUtilsService) {

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
        this.colors = sortedAssignedColors.map(c => c.color.startsWith('rgb') ? this.ChartUtilsService.rgb2hexD3(c.color) : c.color);
        this.originalColors = [...this.colors]; // Guardar estado original aquí
      }, 0)
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
    this.onClose(EdaDialogCloseEvent.UPDATE, {
      colors: this.colors.map(c => c.startsWith('#') ? this.ChartUtilsService.hex2rgbD3(c) : c)
    });
  }

  closeChartConfig() {
    this.myPanelChartComponent.props.config.setConfig(new SunburstConfig(this.originalColors.map(c => this.ChartUtilsService.hex2rgbD3(c))));
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
   
    // Actualizar temporalmente los colores según colorMap
    this.myPanelChartComponent.props.config.getConfig()['assignedColors'].forEach(element => {
      if (colorMap[element.value]) {
        element.color = colorMap[element.value];
      }
    });
    this.myPanelChartComponent.changeChartType();
  }

  labePrettify(label){
    return label.replaceAll('|+-+|', ' - ') + ': ';
  } 

  onPaletteSelected() { 
        // Saber numero de segmentos para interpolar colores
        const numberOfColors = this.myPanelChartComponent.componentRef.instance.colors.length;
        
        // Recuperamos paleta seleccionada y creamos colores
        this.myPanelChartComponent['chartUtils'].MyPaletteColors = this.selectedPalette['paleta']; 
        const newColors = this.ChartUtilsService.generateRGBColorGradientScaleD3(numberOfColors, this.myPanelChartComponent['chartUtils'].MyPaletteColors);
        
        // Actualizar los color pickers individuales al modificar la paleta
        this.colors = newColors.map(({ color }) => color);
        
        // Actualizar los colores del chart
        this.myPanelChartComponent.props.config.setConfig(new SunburstConfig(this.colors.map(color => this.ChartUtilsService.hex2rgbD3(color))));
        this.myPanelChartComponent.changeChartType();
  }
}