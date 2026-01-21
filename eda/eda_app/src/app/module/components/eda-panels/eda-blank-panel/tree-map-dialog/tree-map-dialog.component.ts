import { Component, ViewChild, AfterViewChecked, OnInit, Input } from '@angular/core';
import { EdaDialog, EdaDialogAbstract, EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import { PanelChart } from '../panel-charts/panel-chart';
import { PanelChartComponent } from '../panel-charts/panel-chart.component';
import { TreeMapConfig } from '../panel-charts/chart-configuration-models/treeMap-config';
import { StyleProviderService, ChartUtilsService } from '@eda/services/service.index';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { EdaDialog2Component } from '@eda/shared/components/shared-components.index';
import { ColorPickerModule } from 'primeng/colorpicker';
@Component({
  standalone: true,
  selector: 'app-tree-map-dialog',
  templateUrl: './tree-map-dialog.component.html',
  imports: [FormsModule, CommonModule, EdaDialog2Component, PanelChartComponent, ColorPickerModule],
})
export class TreeMapDialog implements OnInit, AfterViewChecked {
  @Input() controller: any;
  @ViewChild('PanelChartComponent', { static: false }) myPanelChartComponent: PanelChartComponent;

  public dialog: EdaDialog;
  public panelChartConfig: PanelChart = new PanelChart();
  public assignedColors: { value: string; color: string }[] = [];
  private originalAssignedColors: { value: string; color: string }[] = [];
  public labels: string[] = [];
  public display: boolean = false;
  public selectedPalette: { name: string; paleta: any } | null = null;
  public allPalettes: any = this.stylesProviderService.ChartsPalettes;
  public title: string = $localize`:@@ChartProps:PROPIEDADES DEL GRAFICO`;

  constructor(
    private stylesProviderService: StyleProviderService,
    private ChartUtilsService: ChartUtilsService
  ) { }

  ngOnInit(): void {
    this.panelChartConfig = this.controller.params.panelChart;
    this.display = true;
  }

  ngAfterViewChecked(): void {
    if (this.assignedColors.length === 0 && this.myPanelChartComponent?.componentRef) {
      setTimeout(() => {
        this.labels = this.myPanelChartComponent.componentRef.instance.firstColLabels;

        const chartAssignedColors: { value: string; color: string }[] =
          this.myPanelChartComponent.props.config.getConfig()['assignedColors'];

        const colorMap: Record<string, { value: string; color: string }> = {};
        chartAssignedColors.forEach(item => (colorMap[item.value] = item));

        // Ordenar por label
        this.assignedColors = this.labels
          .map(label => colorMap[label])
          .filter((item): item is { value: string; color: string } => !!item)
          .map(c => ({
            value: c.value,
            color: c.color.startsWith('rgb') ? this.ChartUtilsService.rgb2hexD3(c.color) : c.color
          }));

        // Guardar estado inicial para cancelación
        this.originalAssignedColors = this.assignedColors.map(c => ({ ...c }));
      }, 0);
    }
  }

  onClose(event: EdaDialogCloseEvent, response?: any): void {
    this.controller.close(event, response);
  }

  saveChartConfig(): void {
    // Convertir assignedColors a string[] de colores hex o rgb para TreeMapConfig
    const colorsForConfig = this.assignedColors.map(c =>
      c.color.startsWith('#') ? this.ChartUtilsService.hex2rgbD3(c.color) : c.color
    );

    this.myPanelChartComponent.props.config.setConfig(
      new TreeMapConfig(colorsForConfig)
    );

    this.onClose(EdaDialogCloseEvent.UPDATE, { colors: colorsForConfig });
  }

  closeChartConfig(): void {
    // Restaurar estado inicial
    this.assignedColors = this.originalAssignedColors.map(c => ({ ...c }));

    const colorsForConfig = this.assignedColors.map(c =>
      c.color.startsWith('#') ? this.ChartUtilsService.hex2rgbD3(c.color) : c.color
    );

    this.myPanelChartComponent.props.config.setConfig(
      new TreeMapConfig(colorsForConfig)
    );

    this.myPanelChartComponent.changeChartType();
    this.onClose(EdaDialogCloseEvent.NONE);
  }

  handleInputColor(): void {
    // Actualizar assignedColors desde el color picker
    const rgbColors = this.assignedColors.map(c =>
      c.color.startsWith('#') ? this.ChartUtilsService.hex2rgbD3(c.color) : c.color
    );

    // Actualizar el config del chart
    this.myPanelChartComponent.props.config.setConfig(
      new TreeMapConfig(rgbColors)
    );

    this.myPanelChartComponent.changeChartType();
  }

  onPaletteSelected(): void {
    if (!this.selectedPalette) return;

    const length = this.labels.length; // Número de colores que necesitamos

    // Mapear paleta a la longitud exacta de labels
    const newColors: string[] = [];
    for (let i = 0; i < length; i++) {
      newColors.push(this.selectedPalette.paleta[i % this.selectedPalette.paleta.length]);
    }

    // Actualizar assignedColors directamente
    this.assignedColors = this.labels.map((label, i) => ({
      value: label,
      color: newColors[i]
    }));

    // Actualizar config con string[] de colores
    const colorsForConfig = this.assignedColors.map(c => c.color);
    this.myPanelChartComponent.props.config.setConfig(new TreeMapConfig(colorsForConfig));

    this.myPanelChartComponent.changeChartType();
  }

}
