import { Component, ViewChild, AfterViewChecked } from '@angular/core';
import { EdaDialog, EdaDialogAbstract, EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import { PanelChart } from '../panel-charts/panel-chart';
import { PanelChartComponent } from '../panel-charts/panel-chart.component';
import { FunnelConfig } from '../panel-charts/chart-configuration-models/funnel.config';
import { StyleProviderService,ChartUtilsService } from '@eda/services/service.index';


@Component({
  selector: 'app-funnel-dialog',
  templateUrl: './funnel-dialog.component.html'
})

export class FunnelDialog extends EdaDialogAbstract implements AfterViewChecked {

  @ViewChild('PanelChartComponent', { static: false }) myPanelChartComponent: PanelChartComponent;

  public dialog: EdaDialog;
  public panelChartConfig: PanelChart = new PanelChart();
  public colors: Array<string>;
  public originalColors: string[];
  public labels: Array<number>;
  public display: boolean = false;
  public selectedPalette: { name: string; paleta: any } | null = null;
  public allPalettes: any = this.stylesProviderService.ChartsPalettes;

  constructor(private stylesProviderService: StyleProviderService, private ChartUtilsService: ChartUtilsService) {

    super();

    this.dialog = new EdaDialog({
      show: () => this.onShow(),
      hide: () => this.onClose(EdaDialogCloseEvent.NONE),
      title: $localize`:@@ChartProps:PROPIEDADES DEL GRAFICO`
    });
    this.dialog.style = { width: '80%', height: '70%', top: "-4em", left: '1em' };
  }

  ngAfterViewChecked(): void {
    if (!this.colors && this.myPanelChartComponent?.componentRef) {
      //To avoid "Expression has changed after it was checked" warning
      setTimeout(() => {
        this.colors = this.myPanelChartComponent.componentRef.instance.colors.map(c => this.ChartUtilsService.rgb2hexD3(c) || c);
        this.originalColors = [...this.colors]; // Guardar estado original aquí
        this.labels = [0, 1];
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
    this.onClose(EdaDialogCloseEvent.UPDATE, { colors: this.colors.map(color => this.ChartUtilsService.hex2rgbD3(color)) });
  }

  closeChartConfig() {
    this.myPanelChartComponent.props.config.setConfig(new FunnelConfig(this.originalColors.map(c => this.ChartUtilsService.hex2rgbD3(c))));
    this.onClose(EdaDialogCloseEvent.NONE);
  }

  handleInputColor(): void {
    this.myPanelChartComponent.props.config.setConfig(new FunnelConfig(this.colors.map(c => this.ChartUtilsService.rgb2hexD3(c) || this.ChartUtilsService.hex2rgbD3(c))));
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
    this.myPanelChartComponent.props.config.setConfig(new FunnelConfig(this.colors.map(color => this.ChartUtilsService.hex2rgbD3(color))));
    this.myPanelChartComponent.changeChartType();
  }
}