import { EdaDialogCloseEvent, EdaDialog2Component } from '@eda/shared/components/shared-components.index';
import { AfterViewChecked, Component, Input, OnInit, ViewChild } from '@angular/core';
import { KpiMailConfigModal } from '@eda/components/kpi-mail-config/kpi-mail-config.modal';
import { PanelChartComponent } from '../panel-charts/panel-chart.component';
import { PanelChart } from '../panel-charts/panel-chart';
import { UserService } from '@eda/services/service.index';
import { StyleProviderService, ChartUtilsService } from '@eda/services/service.index';
import * as _ from 'lodash';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ColorPickerModule } from 'primeng/colorpicker';

@Component({
    standalone: true,
    selector: 'app-kpi-dialog',
    templateUrl: './kpi-dialog.component.html',
    styleUrls: ['./kpi-dialog.component.css'],
    imports: [FormsModule, CommonModule, EdaDialog2Component, ColorPickerModule, PanelChartComponent, KpiMailConfigModal]
})
export class KpiEditDialogComponent implements OnInit, AfterViewChecked {
    @Input() controller: any;
    @ViewChild('PanelChartComponent', { static: false }) panelChartComponent: PanelChartComponent;
    public mailConfigOpen: boolean = false;

    public panelChartConfig: PanelChart = new PanelChart();
    
    // Usar assignedColors en lugar de series
    public assignedColors: Array<{value: string, color: string}> = [];
    private originalAssignedColors: Array<{value: string, color: string}> = [];

    public value: number;
    public operand: string;
    public color: string = '#ff0000';
    public alerts: Array<any> = [];
    private originalAlerts: Array<any> = [];
    public alertInfo: string = $localize`:@@alertsInfo: Cuando el valor del kpi sea (=, <,>) que el valor definido cambiará el color del texto`;
    public ptooltipViewAlerts: string = $localize`:@@ptooltipViewAlerts:Configurar alertas`;

    public modifiedFontPoints: number = 0;
    public panelBaseResultSize: number = 0;

    public currentAlert = null;
    public canIRunAlerts: boolean = false;
    public edaChart: any;
    public chartContent: any;
    public display: boolean = false;
    public activeTab: "colors" | "alerts" = "alerts";
    public selectedPalette: { name: string; paleta: any } | null = null;
    public allPalettes: any = this.stylesProviderService.ChartsPalettes;
    public title: string = $localize`:@@ChartProps:PROPIEDADES DEL GRAFICO`;
    private colorsLoaded: boolean = false;

    // Getter para compatibilidad con template (mantener series para no romper el HTML)
    get series() {
        return this.assignedColors;
    }

    constructor(
        private userService: UserService,
        private stylesProviderService: StyleProviderService,
        private ChartUtilsService: ChartUtilsService
    ) {
        this.canIRunAlerts = this.userService.user.name !== "edaanonim";
    }

    ngAfterViewChecked(): void {
        if (!this.colorsLoaded && this.panelChartComponent?.componentRef?.instance?.inject?.edaChart.chartType) {
            this.chartContent = this.panelChartComponent.componentRef.instance.inject.edaChart;
            if (this.assignedColors.length === 0) {
                setTimeout(() => {
                    this.loadChartColors();
                    this.colorsLoaded = true;
                }, 0);
            }
        }
    }

    ngOnInit(): void {
        this.panelChartConfig = this.controller.params.panelChart;
        this.edaChart = this.controller.params.panelChart.edaChart;
        this.panelBaseResultSize = this.controller.params.panelBaseResultSize || 0;
        const config: any = this.panelChartConfig.config.getConfig();

        this.originalAlerts = [...(config.alertLimits || [])];
        this.alerts = [...this.originalAlerts];
        this.modifiedFontPoints = config.modifiedFontPoints || 0;

        if (this.panelBaseResultSize > 0) {
        setTimeout(() => {
            const kpiInstance = this.panelChartComponent?.componentRef?.instance;
                if (kpiInstance) {
                    kpiInstance.baseResultSize = this.panelBaseResultSize;
                    this.panelChartComponent.componentRef.changeDetectorRef.detectChanges();
                }
            }, 100);
        }
    }

    setActiveTab(tab: "colors" | "alerts"): void {
        this.activeTab = tab;
    }

    saveChartConfig() {
        // Guardar assignedColors en el chart
        if (this.chartContent && this.assignedColors.length > 0) {
            this.applyColorsToChart();
        }

        this.onClose(EdaDialogCloseEvent.UPDATE, {
            alerts: this.alerts,
            sufix: this.panelChartComponent.componentRef.instance.inject.sufix,
            edaChart: this.edaChart,
            chartType: this.panelChartConfig.chartType,
            chartSubType: this.panelChartConfig.edaChart,
            assignedColors: [...this.assignedColors],
            modifiedFontPoints: this.modifiedFontPoints,
        });
    }

    closeChartConfig() {
        this.alerts = [...this.originalAlerts];

        try {
            this.assignedColors = this.originalAssignedColors.map(c => ({ ...c }));
            this.applyColorsToChart();
        } catch (_) {}

        this.onClose(EdaDialogCloseEvent.NONE);
    }

    loadChartColors() {
        if (!this.chartContent) return;

        const existingColors = this.panelChartConfig.config.getConfig()['assignedColors'] || [];
        const dataset = this.chartContent.chartDataset;

        // Crear assignedColors desde el dataset
        this.assignedColors = dataset.map((ds, index) => {
            const existingColor = existingColors.find(c => c.value === ds.label);
            const backgroundColor = this.rgb2hex(ds.backgroundColor) || ds.backgroundColor;
            
            return {
                value: ds.label,
                color: existingColor?.color || backgroundColor
            };
        });

        this.originalAssignedColors = this.assignedColors.map(c => ({ ...c }));
    }

    applyColorsToChart() {
        if (!this.chartContent) return;
        if (!this.panelChartComponent?.componentRef?.instance?.inject?.edaChart) return;

        const dataset = this.chartContent.chartDataset;

        for (let i = 0; i < dataset.length; i++) {
            const colorConfig = this.assignedColors.find(c => c.value === dataset[i].label);

            if (colorConfig) {
                dataset[i].backgroundColor = this.hex2rgb(colorConfig.color, 90);
                dataset[i].borderColor = this.hex2rgb(colorConfig.color, 100);
                this.chartContent.chartColors[i] = {
                    backgroundColor: dataset[i].backgroundColor,
                    borderColor: dataset[i].borderColor
                };
            }
        }

        this.panelChartComponent.componentRef.instance.inject.edaChart.chartDataset = [...dataset];
        this.panelChartComponent.componentRef.instance.updateChart();
    }

    onClose(event: EdaDialogCloseEvent, response?: any): void {
        return this.controller.close(event, response);
    }

    addAlert() {
        this.alerts.push({
            value: this.value ? this.value : 0,
            operand: this.operand,
            color: this.color,
            mailing: { units: null, quantity: null, hours: null, minutes: null, users: [], mailMessage: null, enabled: false }
        });
    }

    deleteAlert(item) {
        this.alerts = this.alerts.filter(alert =>
            alert.operand !== item.operand || alert.value !== item.value || alert.color !== item.color
        );
    }

    rgb2hex(rgb): string {
        if (rgb) {
            rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
            return (rgb && rgb.length === 4) ? '#' +
                ('0' + parseInt(rgb[1], 10).toString(16)).slice(-2) +
                ('0' + parseInt(rgb[2], 10).toString(16)).slice(-2) +
                ('0' + parseInt(rgb[3], 10).toString(16)).slice(-2) : '';
        }
    }

    hex2rgb(hex, opacity = 100): string {
        if (hex) {
            hex = hex.replace('#', '');
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);

            return 'rgba(' + r + ',' + g + ',' + b + ',' + opacity / 100 + ')';
        }
    }

    handleInputColor(item) {
        // Actualizar el color en assignedColors
        const colorConfig = this.assignedColors.find(c => c.value === item.value);
        if (colorConfig) {
            colorConfig.color = item.color;
        }

        // Aplicar al chart
        this.applyColorsToChart();
    }

    setColor(hex: string) {
        this.color = hex;
    }

    openConfigDialog(alert) {
        this.currentAlert = alert;
        this.mailConfigOpen = true;
    }

    onMailConfigApply(mailingConfig: any) {
        if (this.currentAlert) {
            this.currentAlert.mailing = mailingConfig;
        }
        this.mailConfigOpen = false;
        this.currentAlert = null;
    }

    closeMailingConfig() {
        this.currentAlert = null;
        this.mailConfigOpen = false;
    }

    onPaletteSelected() {
        if (!this.selectedPalette || !this.selectedPalette.paleta || !this.chartContent) return;

        const dataset = this.chartContent.chartDataset;
        const paletteColors = this.selectedPalette.paleta;
        let numColors = dataset.length;

        if (dataset.length > 0 && Array.isArray(dataset[0].backgroundColor)) {
            numColors = dataset[0].backgroundColor.length;
        }

        const interpolatedColors = this.ChartUtilsService.generateRGBColorGradientScaleD3(numColors, paletteColors);

        // Actualizar assignedColors con los nuevos colores
        this.assignedColors = dataset.map((d, i) => ({
            value: d.label,
            color: interpolatedColors[i % interpolatedColors.length].color
        }));

        // Aplicar colores
        this.applyColorsToChart();
    }

    modifyKpiSize(newValue?: number) {
        const min = -90;
        const max = 300;
        if (newValue !== undefined) {
            this.modifiedFontPoints = Math.min(max, Math.max(min, newValue || 0));
        } else {
            this.modifiedFontPoints = Math.min(max, Math.max(min, this.modifiedFontPoints));
        }
        const instance = this.panelChartComponent.componentRef.instance;
        instance.inject.modifiedFontPoints = this.modifiedFontPoints;
        this.panelChartComponent.componentRef.changeDetectorRef.detectChanges();
    }
}