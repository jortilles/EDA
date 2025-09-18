import { Component, ViewChild, AfterViewChecked } from '@angular/core';
import { EdaDialog, EdaDialogAbstract, EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import { PanelChart } from '../panel-charts/panel-chart';
import { PanelChartComponent } from '../panel-charts/panel-chart.component';
import { ScatterConfig } from '../panel-charts/chart-configuration-models/scatter-config';
import { StyleProviderService,ChartUtilsService } from '@eda/services/service.index';


@Component({
  selector: 'app-scatter-plot-dialog',
  templateUrl: './scatter-plot-dialog.component.html'
})

export class ScatterPlotDialog extends EdaDialogAbstract implements AfterViewChecked {

  @ViewChild('PanelChartComponent', { static: false }) myPanelChartComponent: PanelChartComponent;

  public dialog: EdaDialog;
  public panelChartConfig: PanelChart = new PanelChart();
  public colors: Array<string>;
  private originalColors: string[] = [];
  public labels: Array<string>;
  public display: boolean = false;
  public selectedPalette: { name: string; paleta: any } | null = null;
  public allPalettes: any = this.stylesProviderService.ChartsPalettes;

  constructor(private stylesProviderService: StyleProviderService, private d3ChartUtils: ChartUtilsService) {

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
        this.colors =
          this.myPanelChartComponent.componentRef.instance.colors
         ;
        this.originalColors = [...this.colors]; // Guardamos la copia aquí
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
      colors: this.colors
    });
  }

  closeChartConfig() {
    this.myPanelChartComponent.props.config.setConfig(new ScatterConfig(this.originalColors));
    this.onClose(EdaDialogCloseEvent.NONE);
  }

  handleInputColor(): void {
    this.myPanelChartComponent.props.config.setConfig(new ScatterConfig(this.colors));
    this.myPanelChartComponent.changeChartType();
  }

  onPaletteSelected() { 
      // Saber numero de segmentos para interpolar colores
      const numberOfColors = this.myPanelChartComponent.componentRef.instance.colors.length;
      
      // Recuperamos paleta seleccionada y creamos colores
      this.myPanelChartComponent['chartUtils'].MyPaletteColors = this.selectedPalette['paleta']; 
      const newColors = this.d3ChartUtils.generateRGBColorGradientScaleD3(numberOfColors, this.myPanelChartComponent['chartUtils'].MyPaletteColors);
      
      // Actualizar los color pickers individuales al modificar la paleta
      this.colors = newColors.map(({ color }) => color);
      
      // Actualizar los colores del chart
      this.myPanelChartComponent.props.config.setConfig(new ScatterConfig(this.colors));
      this.myPanelChartComponent.changeChartType();
  }
    
    
}