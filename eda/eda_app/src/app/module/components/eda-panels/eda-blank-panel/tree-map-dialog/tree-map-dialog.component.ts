import { Component, ViewChild, AfterViewChecked } from '@angular/core';
import { EdaDialog, EdaDialogAbstract, EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import { PanelChart } from '../panel-charts/panel-chart';
import { PanelChartComponent } from '../panel-charts/panel-chart.component';
import { TreeMapConfig } from '../panel-charts/chart-configuration-models/treeMap-config';
import { StyleProviderService } from '@eda/services/service.index';
import { ChartUtilsService } from '@eda/services/service.index';

@Component({
  selector: 'app-tree-map-dialog',
  templateUrl: './tree-map-dialog.component.html'
})

export class TreeMapDialog extends EdaDialogAbstract implements AfterViewChecked {

  @ViewChild('PanelChartComponent', { static: false }) myPanelChartComponent: PanelChartComponent;

  public dialog: EdaDialog;
  public panelChartConfig: PanelChart = new PanelChart();
  public colors: Array<string>;
  public labels: Array<string>;
  public display: boolean = false;
  public selectedPalette: string = this.stylesProviderService.DEFAULT_PALETTE_COLOR;
  public allPalettes: any = this.stylesProviderService.ChartsPalettes;

  constructor(private stylesProviderService: StyleProviderService, private chartUtilsService: ChartUtilsService) {

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
        this.colors = this.myPanelChartComponent.componentRef.instance.colors.map(color => this.rgb2hex(color));
        this.labels = this.myPanelChartComponent.componentRef.instance.firstColLabels;
      }, 0)
    }
  }

  onShow(): void {
    console.log('show treemap')
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
    this.myPanelChartComponent.props.config.setConfig(new TreeMapConfig(this.colors.map(color => this.hex2rgb(color))));
    this.myPanelChartComponent.changeChartType();
  }

  hex2rgb(hex, opacity = 100): string {
    console.log(hex)
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    console.log(r)
    return 'rgba(' + r + ',' + g + ',' + b + ',' + opacity / 100 + ')';
  }

  rgb2hex(rgb): string {
    rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
    return (rgb && rgb.length === 4) ? '#' +
      ('0' + parseInt(rgb[1], 10).toString(16)).slice(-2) +
      ('0' + parseInt(rgb[2], 10).toString(16)).slice(-2) +
      ('0' + parseInt(rgb[3], 10).toString(16)).slice(-2) : '';
  }

  onPaletteSelected() { 
    // Saber numero de segmentos para interpolar colores
    const numberOfColors = this.myPanelChartComponent.componentRef.instance.colors.length;
    
    // Recuperamos paleta seleccionada y creamos colores
    this.myPanelChartComponent['chartUtils'].MyPaletteColors = this.selectedPalette['paleta']; 
    const newColors = this.generateRGBColorGradientScale(numberOfColors, this.myPanelChartComponent['chartUtils'].MyPaletteColors);
    
    // Actualizar los color pickers individuales al modificar la paleta
    this.colors = newColors.map(({ color }) => color);
    
    // Actualizar los colores del chart
    this.myPanelChartComponent.props.config.setConfig(new TreeMapConfig(this.colors.map(color => this.hex2rgb(color))));
    this.myPanelChartComponent.changeChartType();
  }
  


  // METODOS PARA HACER LA GENERACIÓN DE COLORES DEL TREEMAP CON PALETA, REVISAR SI SE PUEDE UNIFICAR EN UN SERVICE 
  private generateRGBColorGradientScale(
    numberOfColors: number,
    baseColors: string[]
  ): Array<{ color: string }> {
    // Charts de un único color
    if (numberOfColors === 1) {
        const color = baseColors[0].toUpperCase();
        return [{ color: color }];
    }
    const colorList: Array<{ color: string }> = [];
    const numSegments = baseColors.length - 1;
    const baseRgbColors = baseColors.map(hex => this.hex2rgbNumeric(hex));
    //Generamos lista en rgb y pasamos a hex
    for (let i = 0; i < numberOfColors; i++) {
        const globalFactor = i / (numberOfColors - 1);
        let segmentIndex = Math.floor(globalFactor * numSegments);
        if (segmentIndex >= numSegments) {
            segmentIndex = numSegments - 1;
        }
      
        const [r1, g1, b1] = baseRgbColors[segmentIndex];
        const [r2, g2, b2] = baseRgbColors[segmentIndex + 1];

        const localFactor = (globalFactor * numSegments) - segmentIndex;
        const t = (i === numberOfColors - 1) ? 1 : localFactor;

        const r_interp = r1 + t * (r2 - r1);
        const g_interp = g1 + t * (g2 - g1);
        const b_interp = b1 + t * (b2 - b1);
        const interpolatedColorHex = this.rgbToHex(r_interp, g_interp, b_interp).toUpperCase();
        colorList.push({ color: interpolatedColorHex });
      }
    return colorList;
  }
  
  public rgbToHex(r: number, g: number, b: number): string {
    return `#${this.toHex(r)}${this.toHex(g)}${this.toHex(b)}`;
  }
  private toHex(c: number): string {
    const hex = Math.max(0, Math.min(255, Math.round(c))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }

  public hex2rgbNumeric(hex: string): [number, number, number] {
    const cleanHex = hex.replace(/^#/, '');
    const fullHex = cleanHex.length === 3 ?
        cleanHex[0] + cleanHex[0] + cleanHex[1] + cleanHex[1] + cleanHex[2] + cleanHex[2] :
        cleanHex;
    if (fullHex.length !== 6) { return [0, 0, 0]; }
    const bigint = parseInt(fullHex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return [r, g, b];
  }
  
  


}