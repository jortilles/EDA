import { EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import { Component, Input, ViewChild, OnInit, AfterViewChecked } from '@angular/core';
import { PanelChartComponent } from '../panel-charts/panel-chart.component';
import { PanelChart } from '../panel-charts/panel-chart';
import { MapUtilsService, StyleProviderService } from "@eda/services/service.index";
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { EdaDialog2Component } from '@eda/shared/components/eda-dialogs/eda-dialog2/eda-dialog2.component';
import { ColorPickerModule } from 'primeng/colorpicker';

@Component({
  standalone: true,
  selector: 'app-mapedit-dialog',
  templateUrl: './mapedit-dialog.component.html',
  imports: [CommonModule, FormsModule, EdaDialog2Component, ColorPickerModule, PanelChartComponent],
})
export class MapEditDialogComponent implements OnInit, AfterViewChecked {
  @Input() controller: any;
  @ViewChild(PanelChartComponent, { static: false })
  myPanelChartComponent: PanelChartComponent;

  public panelChartConfig: PanelChart = new PanelChart();

  // assignedColors para seguir el patrón estándar
  public assignedColors: Array<{ value: string, color: string }> = [{ value: 'Color', color: '#000000' }];
  private originalAssignedColors: Array<{ value: string, color: string }> = [];

  public logarithmicScale: boolean = false;
  public baseLayer: boolean = false;
  public draggable: boolean;
  public legendPosition: string;
  public title: string = $localize`:@@ChartProps:PROPIEDADES DEL GRAFICO`;

  // Memory location
  public zoom: number;
  public coordinates: Array<Array<number>>;

  // Styles
  public selectedPalette: { name: string; paleta: any } | null = null;
  public allPalettes: any = this.stylesProviderService.ChartsPalettes;

  public display: boolean = false;
  private colorsLoaded: boolean = false;

  constructor(private mapUtilsService: MapUtilsService, private stylesProviderService: StyleProviderService) { }

  ngOnInit(): void {
    this.mapUtilsService.mapEditOpen();
    this.setupMapDialog();
  }

  ngAfterViewChecked(): void {
    // Cargar colores cuando el componente esté listo
    if (!this.colorsLoaded && this.assignedColors[0].color === '#000000' && this.myPanelChartComponent?.componentRef) {
      setTimeout(() => {
        this.loadColors();
        this.colorsLoaded = true;
      }, 0);
    }
  }

  ngOnDestroy(): void {
    this.mapUtilsService.mapEditClose();
  }

  // Setup del dialog con sus elementos
  setupMapDialog() {
    this.zoom = this.controller.params.zoom;
    this.coordinates = this.controller.params.coordinates;
    this.legendPosition = this.controller.params.legendPosition;
    this.baseLayer = this.controller.params.panelChart?.config?.config?.baseLayer !== undefined ? this.controller.params.panelChart.config.config.baseLayer : true;
    this.logarithmicScale = this.controller.params.logarithmicScale;
    this.draggable = this.controller.params.draggable;
    this.panelChartConfig = this.controller.params.panelChart;
    this.display = true;
  }

  renderMap() {
    const leafletMap = this.myPanelChartComponent.componentRef.instance;
    leafletMap.changeScale(this.logarithmicScale);
  }

  loadColors(): void {
    const leafletMap = this.myPanelChartComponent.componentRef.instance;

    // Obtener colores del componente del mapa
    if (leafletMap?.assignedColors && leafletMap.assignedColors.length >= 1) {
      this.assignedColors = [
        { value: 'Color', color: leafletMap.assignedColors[0].color },
      ];
    }
    this.originalAssignedColors = this.assignedColors.map(c => ({ ...c }));
  }

  // Configuración switchs dialog
  nullMouseOptions() {
    const leafletMap = this.myPanelChartComponent.componentRef.instance;
    leafletMap.switchNoMouse(this.draggable);
  }

  modifyBaseLayer() {
    const leafletMap = this.myPanelChartComponent.componentRef.instance;
    leafletMap.modifyBaseLayer(this.baseLayer);
  }

  changeLegend(ubication: string) {
    this.legendPosition = ubication;
    const leafletMap = this.myPanelChartComponent.componentRef.instance;
    leafletMap.legendPosition = this.legendPosition;
    leafletMap.changeLegend(this.legendPosition);
  }

  // Metodos de modificacion de de colores  
  onPaletteSelected() {
    if (!this.selectedPalette) return;
    const palette = this.selectedPalette.paleta;

    // Aplicar primer y último color de la paleta
    this.assignedColors = [{ value: 'Color', color: palette[0] }];
    // Actualizar colores del mapa
    this.handleInputColor();
  }

  handleInputColor() {
    if (this.assignedColors[0]?.color?.length >= 6) {
      const leafletMap = this.myPanelChartComponent.componentRef.instance;
      if (leafletMap?.updateMapColors) {
        const colors = this.assignedColors.map(c => c.color);
        leafletMap.updateMapColors(colors);
      }
    }
  }

  saveChartConfig() {
      this.onClose(EdaDialogCloseEvent.UPDATE, {
          assignedColors: [...this.assignedColors],
          color: this.assignedColors[0].color, // Para codigo legacy
          logarithmicScale: this.logarithmicScale,
          baseLayer: this.baseLayer,
          legendPosition: this.legendPosition,
          draggable: this.draggable,
          zoom: this.myPanelChartComponent.componentRef.instance.inject.zoom,
          coordinates: this.myPanelChartComponent.componentRef.instance.inject.coordinates,
      });
  }

  closeChartConfig() {
    // Restaurar colores originales
    this.assignedColors = this.originalAssignedColors.map(c => ({ ...c }));
    const leafletMap = this.myPanelChartComponent.componentRef.instance;
    if (leafletMap?.updateMapColors) {
      const colors = this.assignedColors.map(c => c.color);
      leafletMap.updateMapColors(colors);
    }

    this.onClose(EdaDialogCloseEvent.NONE);
    this.mapUtilsService.cancelChartProps();
  }

  onClose(event: EdaDialogCloseEvent, response?: any): void {
    return this.controller.close(event, response);
  }
}