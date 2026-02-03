import { EdaDialogCloseEvent, EdaDialog2Component } from '@eda/shared/components/shared-components.index';
import { AfterViewChecked, Component, Input, OnInit, ViewChild } from '@angular/core';
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
    imports: [FormsModule, CommonModule, EdaDialog2Component, ColorPickerModule, PanelChartComponent]
})
export class KpiEditDialogComponent implements OnInit, AfterViewChecked {
    @Input() controller: any;
    @ViewChild('PanelChartComponent', { static: false }) panelChartComponent: PanelChartComponent;
    @ViewChild('mailConfig', { static: false }) mailConfig: any;

    public panelChartConfig: PanelChart = new PanelChart();
    
    // Usar assignedColors en lugar de series
    public assignedColors: Array<{value: string, color: string}> = [];
    private originalAssignedColors: Array<{value: string, color: string}> = [];

    public value: number;
    public operand: string;
    public color: string = '#ff0000';
    public alerts: Array<any> = [];
    public alertInfo: string = $localize`:@@alertsInfo: Cuando el valor del kpi sea (=, <,>) que el valor definido cambiará el color del texto`;
    public ptooltipViewAlerts: string = $localize`:@@ptooltipViewAlerts:Configurar alertas`;

    public units: string;
    public quantity: number;
    public hours: any;
    public hoursSTR = $localize`:@@hours:Hora/s`;
    public daysSTR = $localize`:@@days:Día/s`;
    public mailMessage = '';
    public currentAlert = null;
    public users: any;
    public selectedUsers: any;
    public enabled: boolean;
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
        if (!this.colorsLoaded && this.panelChartComponent?.componentRef?.instance?.inject?.edaChart) {
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
        const config: any = this.panelChartConfig.config.getConfig();

        this.alerts = config.alertLimits || [];
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
            assignedColors: [...this.assignedColors]
        });
    }

    closeChartConfig() {
        // Restaurar colores originales
        this.assignedColors = this.originalAssignedColors.map(c => ({ ...c }));
        this.applyColorsToChart();
        
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
        this.panelChartComponent.componentRef?.instance.updateChart();
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

    openConfigDialog($event, alert) {
        this.userService.getUsers().subscribe(
            res => this.users = res.map(user => ({ label: user.name, value: user })),
            err => console.log(err)
        );

        this.enabled = alert.mailing.enabled;
        this.hours = `${alert.mailing.hours || '00'}:${alert.mailing.minutes || '00'}`;
        this.units = alert.mailing.units;
        this.quantity = alert.mailing.quantity;
        this.selectedUsers = alert.mailing.users;
        this.mailMessage = alert.mailing.mailMessage;
        this.currentAlert = alert;
        this.mailConfig.toggle($event);
    }

    saveMailingConfig() {
        const hours = this.hours && typeof this.hours === 'string' ? this.hours.slice(0, 2) :
            this.hours ? this.fillWithZeros(this.hours.getHours()) : null;
        const minutes = this.hours && typeof this.hours === 'string' ? this.hours.slice(3, 5) :
            this.hours ? this.fillWithZeros(this.hours.getMinutes()) : null;

        this.currentAlert.mailing = {
            units: this.units,
            quantity: this.quantity,
            hours: hours,
            minutes: minutes,
            users: this.selectedUsers,
            mailMessage: this.mailMessage,
            lastUpdated: '2000-01-01T00:00:01.000',
            enabled: this.enabled
        }

        this.currentAlert = null;
        this.units = null;
        this.quantity = null;
        this.hours = null;
        this.mailMessage = null;
        this.selectedUsers = [];
        this.mailConfig.hide();
    }

    closeMailingConfig() {
        this.currentAlert = null;
        this.units = null;
        this.quantity = null;
        this.hours = null;
        this.mailMessage = null;
        this.selectedUsers = [];
        this.mailConfig.hide();
    }

    fillWithZeros(n: number) {
        return n < 10 ? `0${n}` : `${n}`;
    }

    disableMailConfirm() {
        return (!this.quantity || !this.units || !(this.selectedUsers.length > 0) || !this.mailMessage)
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
}