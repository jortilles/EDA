import { Component, ViewChild, AfterViewChecked, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { EdaDialog, EdaDialogAbstract, EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import { PanelChart } from '../panel-charts/panel-chart';
import { PanelChartComponent } from '../panel-charts/panel-chart.component';
import { BubblechartConfig } from '../panel-charts/chart-configuration-models/bubblechart.config';
import { StyleProviderService,ChartUtilsService } from '@eda/services/service.index';
import { FormsModule } from '@angular/forms'; 
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-bubblechart-dialog',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './bubblechart-dialog.component.html',
  imports: [FormsModule, CommonModule]
})

export class BubblechartDialog extends EdaDialogAbstract implements AfterViewChecked {

  @ViewChild('PanelChartComponent', { static: false }) myPanelChartComponent: PanelChartComponent;

  public dialog: EdaDialog;
  public panelChartConfig: PanelChart = new PanelChart();
  public colors: Array<string>;
  public originalColors: string[];
  public labels: Array<number>;
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
      this.colors = this.myPanelChartComponent.componentRef.instance.colors
        .map(c => c.startsWith('rgb') ? this.ChartUtilsService.rgb2hexD3(c) : c);
        this.originalColors = [...this.colors];
        this.labels = this.myPanelChartComponent.componentRef.instance.firstColLabels;
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
    this.onClose(EdaDialogCloseEvent.UPDATE, {
      colors: this.colors.map(c => c.startsWith('#') ? this.ChartUtilsService.hex2rgbD3(c) : c)
    });
  }

  closeChartConfig() {
    this.myPanelChartComponent.props.config.setConfig(new BubblechartConfig(this.originalColors.map(c => this.ChartUtilsService.hex2rgbD3(c))));
    this.onClose(EdaDialogCloseEvent.NONE);
  }

  handleInputColor(): void {
    this.myPanelChartComponent.props.config.setConfig(new BubblechartConfig(this.colors.map(c => this.ChartUtilsService.hex2rgbD3(c))));
    this.myPanelChartComponent.changeChartType();
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
        this.myPanelChartComponent.props.config.setConfig(new BubblechartConfig(this.colors.map(color => this.ChartUtilsService.hex2rgbD3(color))));
        this.myPanelChartComponent.changeChartType();
  }
}