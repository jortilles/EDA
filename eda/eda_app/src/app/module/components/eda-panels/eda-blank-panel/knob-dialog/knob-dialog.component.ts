import { Component, Input, OnInit, ViewChild } from "@angular/core";
import { EdaDialogCloseEvent } from "@eda/shared/components/shared-components.index";
import { PanelChart } from "../panel-charts/panel-chart";
import { PanelChartComponent } from "../panel-charts/panel-chart.component";
import { StyleProviderService } from '@eda/services/service.index';
import { FormsModule } from '@angular/forms'; 
import { CommonModule } from '@angular/common';
import { EdaDialog2Component } from "@eda/shared/components/shared-components.index";
import { ColorPickerModule } from "primeng/colorpicker";

@Component({
    standalone: true,
    selector: 'knob-dialog',
    templateUrl: './knob-dialog.component.html',
    imports: [FormsModule, CommonModule, EdaDialog2Component, ColorPickerModule, PanelChartComponent],
})
export class KnobDialogComponent implements OnInit {
    @Input() controller: any;
    @ViewChild('PanelChartComponent', { static: false }) myPanelChartComponent: PanelChartComponent;

    public panelChartConfig: PanelChart = new PanelChart();
    public assignedColors: { value: string; color: string }[] = [{ value: 'Color', color: '#000000' }];
    public originalAssignedColors: Array<{ value: string, color: string }> = [];
    public min: number;
    public max: number;
    public label: string;
    public display: boolean = false;
    public title: string = $localize`:@@ChartProps:PROPIEDADES DEL GRAFICO`;

    constructor(private styleProviderService: StyleProviderService) {}

    ngOnInit(): void {
    this.panelChartConfig = this.controller.params.panelChart;
    this.display = true;
    }

    ngAfterViewChecked(): void {
        // Solo actualizar si los colores aún son los valores por defecto
        if (this.assignedColors[0].color === '#000000' && this.myPanelChartComponent?.componentRef) {

            setTimeout(() => {
                const chartAssignedColors = this.myPanelChartComponent.props.config.getConfig()['assignedColors'] || [];

                /* Actualizar con los colores reales del chart */
                if (chartAssignedColors.length >= 1) {
                    this.assignedColors = [
                        { value: 'Color', color: chartAssignedColors[0]?.color }
                    ];
                    this.originalAssignedColors = this.assignedColors.map(c => ({ ...c }));
                }

                this.label = this.panelChartConfig.data?.labels[0];
                const currentColor = this.myPanelChartComponent.componentRef.instance.color;
                const limits = this.myPanelChartComponent.componentRef.instance.limits;

                this.min = limits[0];
                this.max = limits[1];

                // Cargar assignedColors
                this.loadChartColors(this.label, currentColor);
            }, 100);
        }
    }

    loadChartColors(label: string, currentColor: string) {
        const existingColors = this.panelChartConfig.config.getConfig()['assignedColors'] || [];
        
        // Crear assignedColors con el formato estándar
        this.assignedColors = [{
            value: label,
            color: existingColors[0]?.color || currentColor
        }];
        
        // Guardar copia para cancelar
        this.originalAssignedColors = this.assignedColors.map(c => ({ ...c }));
        
        // Aplicar color al componente
        this.applyColorToChart();
    }

    applyColorToChart() {
        if (this.assignedColors[0]) {
            this.myPanelChartComponent.componentRef.instance.color = this.assignedColors[0].color;
        }
    }

    handleInputColor() {
        if (this.assignedColors[0]?.color?.length >= 6) {
            this.applyColorToChart();
        }
    }

    saveChartConfig() {
        // Aplicar colores finales
        this.applyColorToChart();
        
        // Guardar assignedColors en config
        this.panelChartConfig.config.getConfig()['assignedColors'] = [...this.assignedColors];
        
        // Guardar límites
        const properties = {
            limits: [this.min, this.max],
            assignedColors: this.assignedColors
        };
        
        this.styleProviderService.palKnob = false;
        this.onClose(EdaDialogCloseEvent.UPDATE, properties);
    }

    closeChartConfig() {
        this.onClose(EdaDialogCloseEvent.NONE);
    }

    onClose(event: EdaDialogCloseEvent, response?: any): void {
        return this.controller.close(event, response);
    }
}