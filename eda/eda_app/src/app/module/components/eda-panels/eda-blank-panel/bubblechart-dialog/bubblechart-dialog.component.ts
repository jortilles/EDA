import { Component, ViewChild, OnInit, Input } from '@angular/core';
import { EdaDialog, EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import { PanelChart } from '../panel-charts/panel-chart';
import { PanelChartComponent } from '../panel-charts/panel-chart.component';
import { BubblechartConfig } from '../panel-charts/chart-configuration-models/bubblechart.config';
import { StyleProviderService,ChartUtilsService } from '@eda/services/service.index';
import { FormsModule } from '@angular/forms'; 
import { CommonModule } from '@angular/common';
import { EdaDialog2Component } from '@eda/shared/components/shared-components.index';
import { ColorPickerModule } from 'primeng/colorpicker';
@Component({
  standalone: true,
  selector: 'app-bubblechart-dialog',
  templateUrl: './bubblechart-dialog.component.html',
  imports: [FormsModule, EdaDialog2Component, PanelChartComponent, CommonModule, ColorPickerModule],
})

export class BubblechartDialog implements OnInit {

  @ViewChild('PanelChartComponent', { static: false }) myPanelChartComponent: PanelChartComponent;
  @Input() controller;
  public dialog: EdaDialog;
  public panelChartConfig: PanelChart = new PanelChart();
  public colors: Array<string>;
  public originalColors: string[];
  public labels: Array<number>;
  public selectedPalette: { name: string; paleta: any } | null = null;
  public allPalettes: any = this.stylesProviderService.ChartsPalettes;
  public title = $localize`:@@ChartProps:PROPIEDADES DEL GRAFICO`;

  constructor(private stylesProviderService: StyleProviderService, private ChartUtilsService: ChartUtilsService) { }
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

  ngOnInit(): void {
    this.panelChartConfig = this.controller.params.panelChart;
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