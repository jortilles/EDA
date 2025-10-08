import { Component, ViewChild, AfterViewChecked } from '@angular/core';
import { EdaDialog, EdaDialogAbstract, EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import { PanelChart } from '../panel-charts/panel-chart';
import { PanelChartComponent } from '../panel-charts/panel-chart.component';
import { TreeMapConfig } from '../panel-charts/chart-configuration-models/treeMap-config';
import { StyleProviderService,ChartUtilsService } from '@eda/services/service.index';

@Component({
  selector: 'app-tree-map-dialog',
  templateUrl: './tree-map-dialog.component.html'
})

export class TreeMapDialog extends EdaDialogAbstract implements AfterViewChecked {

  @ViewChild('PanelChartComponent', { static: false }) myPanelChartComponent: PanelChartComponent;

  public dialog: EdaDialog;
  public panelChartConfig: PanelChart = new PanelChart();
  public colors: Array<string>;
  private originalColors: string[] = [];
  public labels: Array<string>;
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
    this.dialog.style = { width: '80%', height: '70%', top:"-4em", left:'1em'};
  }
  ngAfterViewChecked(): void {
    if (!this.colors && this.myPanelChartComponent?.componentRef) {
      //To avoid "Expression has changed after it was checked" warning
      setTimeout(() => {
        //this.colors = this.myPanelChartComponent.componentRef.instance.colors.map(color => this.ChartUtilsService.rgb2hexD3(color));
        this.labels = this.myPanelChartComponent.componentRef.instance.firstColLabels;
        const assignedColors = this.myPanelChartComponent.props.config.getConfig()['assignedColors'];
        const colorMap: { [key: string]: { value: string; color: string } } = {};
        assignedColors.forEach(item => colorMap[item.value] = item);

        // Asigna color y label a cada valor del chart
        const sortedAssignedColors = this.labels
          .map(label => colorMap[label])
          .filter((item): item is { value: string; color: string } => !!item);

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
    this.myPanelChartComponent.props.config.setConfig(new TreeMapConfig(this.originalColors.map(c => this.ChartUtilsService.hex2rgbD3(c))));
    this.onClose(EdaDialogCloseEvent.NONE);
  }

  handleInputColor(): void {
    // Recuperar colores de assignedColor (chart)
    const rgbColors = this.colors.map(c => this.ChartUtilsService.hex2rgbD3(c));
    this.labels.forEach((label, i) => {
      const match = this.myPanelChartComponent.props.config.getConfig()['assignedColors'].find(c => c.value === label);
      if (match) match.color = rgbColors[i];
    });
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
    this.myPanelChartComponent.props.config.setConfig(new TreeMapConfig(this.colors.map(color => this.ChartUtilsService.hex2rgbD3(color))));
    this.myPanelChartComponent.changeChartType();
  }
}