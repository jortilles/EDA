import { Component, ViewChild, OnInit, Input, AfterViewChecked } from '@angular/core';
import { PanelChartComponent } from '../panel-charts/panel-chart.component';
import { TreeMapConfig } from '../panel-charts/chart-configuration-models/treeMap-config';
import { StyleProviderService, ChartUtilsService } from '@eda/services/service.index';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { EdaDialog2Component } from '@eda/shared/components/shared-components.index';
import { ColorPickerModule } from 'primeng/colorpicker';
import { EdaDialog, EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import { PanelChart } from '../panel-charts/panel-chart';

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

  /** Fuente de verdad de los colores por label */
  public assignedColors: { value: string; color: string }[] = [];
  private originalAssignedColors: { value: string; color: string }[] = [];

  public labels: string[] = [];
  public display: boolean = false;
  public selectedPalette: { name: string; paleta: string[] } | null = null;
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
    if (!this.assignedColors.length && this.myPanelChartComponent?.componentRef) {
      setTimeout(() => {
        // Recuperar labels del chart
        this.labels = this.myPanelChartComponent.componentRef.instance.firstColLabels;

        // Recuperar assignedColors del chart si existen
        const chartAssignedColors: { value: string; color: string }[] =
          this.myPanelChartComponent.props.config.getConfig()['assignedColors'] || [];

        // Mapear labels a assignedColors existentes
        this.assignedColors = this.labels.map((label, i) => {
          const match = chartAssignedColors.find(c => c.value === label);
          return {
            value: label,
            color: match.color,
          };
        });

        // Guardar copia para cancelación
        this.originalAssignedColors = this.assignedColors.map(c => ({ ...c }));
      }, 0);
    }
  }

  /** Cierra el diálogo */
  onClose(event: EdaDialogCloseEvent, response?: any): void {
    this.controller.close(event, response);
  }

  /** Guardar configuración de colores */
  saveChartConfig(): void {
    const colorsForConfig = this.assignedColors.map(c => c.color);

    // Actualizar TreeMapConfig y assignedColors en el config
    this.myPanelChartComponent.props.config.setConfig(new TreeMapConfig(colorsForConfig));
    this.myPanelChartComponent.props.config.getConfig()['assignedColors'] = [...this.assignedColors];

    this.myPanelChartComponent.changeChartType();

    this.onClose(EdaDialogCloseEvent.UPDATE, { colors: colorsForConfig });
  }

  /** Cancelar cambios y restaurar estado inicial */
  closeChartConfig(): void {
    this.assignedColors = this.originalAssignedColors.map(c => ({ ...c }));

    // Actualizar TreeMapConfig y assignedColors en el config
    const colorsForConfig = this.assignedColors.map(c => c.color);
    this.myPanelChartComponent.props.config.setConfig(new TreeMapConfig(colorsForConfig));
    this.myPanelChartComponent.props.config.getConfig()['assignedColors'] = [...this.assignedColors];

    this.myPanelChartComponent.changeChartType();
    this.onClose(EdaDialogCloseEvent.NONE);
  }

  /** Cuando el usuario edita un color individual */
  handleInputColor(): void {
    const colorsForConfig = this.assignedColors.map(c => c.color.toUpperCase());

    // Actualizar TreeMapConfig y sincronizar assignedColors
    this.myPanelChartComponent.props.config.setConfig(new TreeMapConfig(colorsForConfig));
    this.myPanelChartComponent.props.config.getConfig()['assignedColors'] = [...this.assignedColors];

    this.myPanelChartComponent.changeChartType();
  }

  /** Aplicar paleta completa al chart */
  onPaletteSelected(): void {
    if (!this.selectedPalette) return;

    const length = this.labels.length;

    // Mapear paleta al número de labels
    const newColors: string[] = [];
    for (let i = 0; i < length; i++) {
      newColors.push(this.selectedPalette.paleta[i % this.selectedPalette.paleta.length]);
    }

    // Actualizar assignedColors
    this.assignedColors = this.labels.map((label, i) => ({
      value: label,
      color: newColors[i]
    }));

    // Actualizar TreeMapConfig y assignedColors en el config
    const colorsForConfig = this.assignedColors.map(c => c.color);
    this.myPanelChartComponent.props.config.setConfig(new TreeMapConfig(colorsForConfig));
    this.myPanelChartComponent.props.config.getConfig()['assignedColors'] = [...this.assignedColors];

    this.myPanelChartComponent.changeChartType();
  }
}
