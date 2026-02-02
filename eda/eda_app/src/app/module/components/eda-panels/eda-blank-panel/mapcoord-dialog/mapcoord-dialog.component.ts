import { EdaDialogCloseEvent } from "@eda/shared/components/shared-components.index";
import { Component, Input, ViewChild, OnInit, AfterViewChecked } from "@angular/core";
import { PanelChartComponent } from "../panel-charts/panel-chart.component";
import { PanelChart } from "../panel-charts/panel-chart";
import { MapUtilsService, StyleProviderService, ChartUtilsService } from "@eda/services/service.index";
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { EdaDialog2Component } from '@eda/shared/components/shared-components.index';
import { ColorPickerModule } from 'primeng/colorpicker';

@Component({
  standalone: true,
  selector: "app-mapcoordedit-dialog",
  templateUrl: "./mapcoord-dialog.component.html",
  imports: [CommonModule, FormsModule, EdaDialog2Component, ColorPickerModule, PanelChartComponent]
})
export class MapCoordDialogComponent implements OnInit, AfterViewChecked {
  @Input() controller: any;
  @ViewChild("PanelChartComponent", { static: false })
  myPanelChartComponent: PanelChartComponent;

  public panelChartConfig: PanelChart = new PanelChart();
  public assignedColors: Array<{value: string, color: string}> = [
    {value: 'start', color: '#000000'},
    {value: 'end', color: '#000000'}
  ];
  private originalAssignedColors: Array<{value: string, color: string}> = [];

  public logarithmicScale: boolean = false;
  public draggable: boolean;

  // Memory location
  public zoom: number;
  public coordinates: Array<Array<number>>;

  // Styles
  public selectedPalette: { name: string; paleta: any } | null = null;
  public allPalettes: any = this.stylesProviderService.ChartsPalettes;

  public display: boolean = false;
  public title: string = $localize`:@@ChartProps:PROPIEDADES DEL GRAFICO`;
  private colorsLoaded: boolean = false;

  // Getters para compatibilidad con el template
  get initialColor(): string {
    return this.assignedColors[0]?.color || '#000000';
  }
  set initialColor(value: string) {
    if (this.assignedColors[0]) {
      this.assignedColors[0].color = value;
    }
  }

  get finalColor(): string {
    return this.assignedColors[1]?.color || '#000000';
  }
  set finalColor(value: string) {
    if (this.assignedColors[1]) {
      this.assignedColors[1].color = value;
    }
  }

  constructor(
    private mapUtilsService: MapUtilsService, 
    private stylesProviderService: StyleProviderService, 
    private ChartUtilsService: ChartUtilsService
  ) {}

  ngOnInit() {
    this.mapUtilsService.mapEditOpen();
    this.setupMapDialog();
  }

  ngAfterViewChecked(): void {
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

  loadColors(): void {
    const leafletMap = this.myPanelChartComponent.componentRef.instance;
    
    if (leafletMap?.assignedColors && leafletMap.assignedColors.length >= 2) {
      this.assignedColors = [
        {value: 'start', color: leafletMap.assignedColors[0].color},
        {value: 'end', color: leafletMap.assignedColors[1].color}
      ];
    }
    
    this.originalAssignedColors = this.assignedColors.map(c => ({ ...c }));
  }

  setupMapDialog() {
    this.zoom = this.controller.params.zoom;
    this.coordinates = this.controller.params.coordinates;
    this.panelChartConfig = this.controller.params.panelChart;
    this.logarithmicScale = this.controller.params.logarithmicScale;
    this.draggable = this.controller.params.draggable;
    this.display = true;
  }

  saveChartConfig() {
    const colors = this.assignedColors.map(c => c.color);
    
    this.onClose(EdaDialogCloseEvent.UPDATE, {
      assignedColors: [...this.assignedColors],
      initialColor: colors[0], // Para compatibilidad
      finalColor: colors[1],   // Para compatibilidad
      logarithmicScale: this.logarithmicScale,
      draggable: this.draggable,
      zoom: this.myPanelChartComponent.componentRef.instance.inject.zoom,
      coordinates: this.myPanelChartComponent.componentRef.instance.inject.coordinates,
    });
  }

  closeChartConfig() {
    // Restaurar colores originales
    this.assignedColors = this.originalAssignedColors.map(c => ({ ...c }));
    const leafletMap = this.myPanelChartComponent.componentRef.instance;
    if (leafletMap?.reDrawCircles) {
      const colors = this.assignedColors.map(c => c.color);
      leafletMap.reDrawCircles(colors);
    }
    
    this.onClose(EdaDialogCloseEvent.NONE);
    this.mapUtilsService.cancelChartProps();
  }

  handleInputColor() {
    if (this.assignedColors[0]?.color?.length >= 6 && this.assignedColors[1]?.color?.length >= 6) {
      const leafletMap = this.myPanelChartComponent.componentRef.instance;
      const colors = this.assignedColors.map(c => c.color);
      leafletMap.reDrawCircles(colors);
    }
  }

  renderMap() {
    const leafletMap = this.myPanelChartComponent.componentRef.instance;
    leafletMap.changeScale(this.logarithmicScale);
  }

  nullMouseOptions() {
    const leafletMap = this.myPanelChartComponent.componentRef.instance;
    leafletMap.switchNoMouse(this.draggable);
  }

  onClose(event: EdaDialogCloseEvent, response?: any): void {
    return this.controller.close(event, response);
  }

  onPaletteSelected() { 
    if (!this.selectedPalette) return;
    const palette = this.selectedPalette.paleta;
    
    // Aplicar primer y último color de la paleta
    this.assignedColors = [
      {value: 'start', color: palette[palette.length - 1]},
      {value: 'end', color: palette[0]}
    ];

    // Actualizar colores del mapa
    this.handleInputColor();
  }
}