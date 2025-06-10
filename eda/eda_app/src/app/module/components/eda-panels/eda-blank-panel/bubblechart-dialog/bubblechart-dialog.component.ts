import { Component, ViewChild, AfterViewChecked } from '@angular/core';
import { EdaDialog, EdaDialogAbstract, EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import { PanelChart } from '../panel-charts/panel-chart';
import { PanelChartComponent } from '../panel-charts/panel-chart.component';
import { BubblechartConfig } from '../panel-charts/chart-configuration-models/bubblechart.config';
import { StyleProviderService,ChartUtilsService } from '@eda/services/service.index';

@Component({
  selector: 'app-bubblechart-dialog',
  templateUrl: './bubblechart-dialog.component.html'
})

export class BubblechartDialog extends EdaDialogAbstract implements AfterViewChecked {

  @ViewChild('PanelChartComponent', { static: false }) myPanelChartComponent: PanelChartComponent;

  public dialog: EdaDialog;
  public panelChartConfig: PanelChart = new PanelChart();
  public colors: Array<string> ;
  public labels: Array<number>;
  public display:boolean=false;
  public selectedPalette: string = this.stylesProviderService.DEFAULT_PALETTE_COLOR;
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
    
    if (!this.colors && this.myPanelChartComponent && this.myPanelChartComponent.componentRef) {
      //To avoid "Expression has changed after it was checked" warning
      setTimeout(() => {
        this.colors = this.myPanelChartComponent.componentRef.instance.colors.map(color => this.ChartUtilsService.rgb2hexD3(color));
        this.labels = this.myPanelChartComponent.componentRef.instance.firstColLabels;
      })
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
    this.onClose(EdaDialogCloseEvent.UPDATE, {colors : this.colors.map(color => this.ChartUtilsService.hex2rgbD3(color))});
  }

  closeChartConfig() {
    this.onClose(EdaDialogCloseEvent.NONE);
  }

  handleInputColor() {
    this.myPanelChartComponent.props.config.setConfig(new BubblechartConfig(this.colors.map(color => this.ChartUtilsService.hex2rgbD3(color))));
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