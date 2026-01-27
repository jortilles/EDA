import { Component, ViewChild, OnInit, Input, AfterViewChecked } from '@angular/core';
import { EdaDialog, EdaDialogAbstract, EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import { PanelChart } from '../panel-charts/panel-chart';
import { PanelChartComponent } from '../panel-charts/panel-chart.component';
import { FunnelConfig } from '../panel-charts/chart-configuration-models/funnel.config';
import { StyleProviderService, ChartUtilsService } from '@eda/services/service.index';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { EdaDialog2Component } from '@eda/shared/components/shared-components.index';
import { ColorPickerModule } from 'primeng/colorpicker';

@Component({
  standalone: true,
  selector: 'app-funnel-dialog',
  templateUrl: './funnel-dialog.component.html',
  imports: [FormsModule, CommonModule, EdaDialog2Component, ColorPickerModule, PanelChartComponent],
})

export class FunnelDialog implements OnInit, AfterViewChecked {

  @Input() controller: any;
  @ViewChild('PanelChartComponent', { static: false })
  myPanelChartComponent: PanelChartComponent;

  public panelChartConfig: PanelChart = new PanelChart();

  public assignedColors: { value: string; color: string }[] = [
    { value: 'start', color: '#000000' },
    { value: 'end', color: '#000000' }
  ];
  private originalAssignedColors: { value: string; color: string }[] = [];

  public selectedPalette: { name: string; paleta: string[] } | null = null;
  public allPalettes: any = this.stylesProviderService.ChartsPalettes;

  public title = $localize`:@@ChartProps:PROPIEDADES DEL GRAFICO`;
  public display = false;

  constructor(
    private stylesProviderService: StyleProviderService,
    private chartUtils: ChartUtilsService
  ) { }

  ngOnInit(): void {
    this.panelChartConfig = this.controller.params.panelChart;
    this.display = true;
  }

  ngAfterViewChecked(): void {
    // Solo actualizar si los colores aún son los valores por defecto
    if (this.assignedColors[0].color === '#000000' && this.assignedColors[1].color === '#000000' && this.myPanelChartComponent?.componentRef) {

      setTimeout(() => {
        /* Obtener colores existentes del chart */
        const chartAssignedColors = this.myPanelChartComponent.props.config.getConfig()['assignedColors'] || [];

        /* Actualizar con los colores reales del chart */
        if (chartAssignedColors.length >= 2) {
          this.assignedColors = [
            { value: 'Inicio', color: chartAssignedColors[0]?.color },
            { value: 'Fin', color: chartAssignedColors[1]?.color }
          ];
          this.originalAssignedColors = this.assignedColors.map(c => ({ ...c }));
        }

      }, 0);
    }
  }

  onClose(event: EdaDialogCloseEvent, response?: any): void {
    this.controller.close(event, response);
  }

  /* GUARDAR */
  saveChartConfig(): void {
    // Guardar assignedColors en el config
    const config = this.myPanelChartComponent.props.config.getConfig();
    config['assignedColors'] = [...this.assignedColors];
    this.myPanelChartComponent.changeChartType();

    // Enviar tanto colors como assignedColors en el response
    this.onClose(EdaDialogCloseEvent.UPDATE, { assignedColors: [...this.assignedColors] });
  }


  /* CANCELAR */
  closeChartConfig(): void {
    this.assignedColors = this.originalAssignedColors.map(c => ({ ...c }));

    const colorsForConfig = this.assignedColors.map(c => c.color);
    this.myPanelChartComponent.props.config.setConfig(new FunnelConfig(colorsForConfig));
    this.myPanelChartComponent.props.config.getConfig()['assignedColors'] = [...this.assignedColors];
    this.myPanelChartComponent.changeChartType();
    this.onClose(EdaDialogCloseEvent.NONE);
  }

  /* COLOR PICKER */
  handleInputColor(): void {
    const colorsForConfig = this.assignedColors.map(c => c.color);

    this.myPanelChartComponent.props.config.setConfig(new FunnelConfig(colorsForConfig));
    this.myPanelChartComponent.props.config.getConfig()['assignedColors'] = [...this.assignedColors];
    this.myPanelChartComponent.changeChartType();
  }

  /* PALETA */
  onPaletteSelected(): void {
    if (!this.selectedPalette) return;
    const palette = this.selectedPalette.paleta;

    /* Aplicar primer y último color de la paleta */
    this.assignedColors = [
      { value: 'start', color: palette[0] },
      { value: 'end', color: palette[palette.length - 1] }
    ];

    // Actualizar color del chart
    this.myPanelChartComponent.props.config.getConfig()['assignedColors'] = [...this.assignedColors];
    this.myPanelChartComponent.changeChartType();
  }
}