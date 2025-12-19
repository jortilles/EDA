import { EdaDialogCloseEvent, EdaDialog, EdaDialog2Component } from '@eda/shared/components/shared-components.index';
import { Component, Input, OnInit, ViewChild } from '@angular/core';
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

export class KpiEditDialogComponent implements OnInit{
    @Input() controller: any;
    @ViewChild('PanelChartComponent', { static: false }) panelChartComponent: PanelChartComponent;
    @ViewChild('mailConfig', { static: false }) mailConfig: any;

    public panelChartConfig: PanelChart = new PanelChart();

    public value: number;
    public operand: string;
    public color: string = '#ff0000';
    public originalColors: string[];
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
    public series: any[] = [];
    public edaChart: any;
    public chartContent: any;
    public display: boolean = false;
    public activeTab: "colors" | "alerts" = "alerts";
    public selectedPalette: { name: string; paleta: any } | null = null;
    public allPalettes: any = this.stylesProviderService.ChartsPalettes;
    public title : string = $localize`:@@ChartProps:PROPIEDADES DEL GRAFICO`;

    constructor(private userService: UserService, private stylesProviderService: StyleProviderService, private ChartUtilsService: ChartUtilsService) {


        if (this.userService.user.name == "edaanonim") {
            this.canIRunAlerts = false;
        } else {
            this.canIRunAlerts = true;
        }

    }

    ngOnInit(): void {
        this.panelChartConfig = this.controller.params.panelChart;
        this.edaChart = this.controller.params.panelChart.edaChart;
        console.log(this)
        const config: any = this.panelChartConfig.config.getConfig();

        this.loadChartColors();
        this.alerts = config.alertLimits || []; //deepcopy
    }

    setActiveTab(tab: "colors" | "alerts"): void {
        this.activeTab = tab
    }

    saveChartConfig() {
        this.onClose(EdaDialogCloseEvent.UPDATE,
            {
                alerts: this.alerts,
                sufix: this.panelChartComponent.componentRef.instance.inject.sufix,
                edaChart: this.edaChart,
                chartType: this.panelChartConfig.chartType,
                chartSubType: this.panelChartConfig.edaChart
            });
    }

    closeChartConfig() {
        this.chartContent = this.panelChartComponent.componentRef.instance.inject.edaChart;
        // Modificación a datasetoriginal si este se modifica y no se guarda

        this.onClose(EdaDialogCloseEvent.NONE);
    }



    loadChartColors() {
        if (this.panelChartComponent?.componentRef.instance.inject.edaChart) {
            this.series = this.chartContent.chartDataset.map(dataset => ({
                label: dataset.label,
                bg: this.rgb2hex(dataset.backgroundColor) || dataset.backgroundColor,
                border: dataset.borderColor
            }));

            this.chartContent.chartColors = this.series.map(s => ({ backgroundColor: this.hex2rgb(s.bg, 90), borderColor: s.border }));
        }
    }

    onClose(event: EdaDialogCloseEvent, response?: any): void {
        return this.controller.close(event, response);
    }

    addAlert() {
        this.alerts.push(
            {
                value: this.value ? this.value : 0,
                operand: this.operand,
                color: this.color,
                mailing: { units: null, quantity: null, hours: null, minutes: null, users: [], mailMessage: null, enabled: false }
            });
    }

    deleteAlert(item) {
        this.alerts = this.alerts.filter(alert => {
            return alert.operand !== item.operand || alert.value !== item.value || alert.color !== item.color
        });
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

    handleInputColor(event) {
                this.chartContent = this.panelChartComponent.componentRef.instance.inject.edaChart;

        if (this.chartContent.chartDataset) {
            const newDatasets = [];
            const dataset = this.chartContent.chartDataset;

            for (let i = 0, n = dataset.length; i < n; i += 1) {
                if (dataset[i].label === event.label) {
                    dataset[i].backgroundColor = this.hex2rgb(event.bg, 90);
                    dataset[i].borderColor = this.hex2rgb(event.bg, 100);
                    this.chartContent.chartColors[i] = _.pick(dataset[i], ['backgroundColor', 'borderColor']);
                } else {
                    if (!_.isArray(dataset[i].backgroundColor)) {
                        dataset[i].backgroundColor = this.chartContent.chartColors[i].backgroundColor;
                        dataset[i].borderColor = this.chartContent.chartColors[i].backgroundColor;
                        this.chartContent.chartColors[i] = _.pick(dataset[i], ['backgroundColor', 'borderColor']);
                    } else {
                        if (this.chartContent.chartLabels) {
                            const labels = this.chartContent.chartLabels;
                            for (let label of labels) {
                                let inx = labels.indexOf(label);
                                if (label === event.label && inx > -1) {
                                    dataset[i].backgroundColor[inx] = this.hex2rgb(event.bg, 90);
                                    this.chartContent.chartColors[0].backgroundColor[inx] = this.hex2rgb(event.bg, 90);
                                }
                            }
                        }
                    }
                }

                newDatasets.push(dataset[i]);
            }

        } else {
            if (this.chartContent.chartLabels) {
                const labels = this.chartContent.chartLabels;
                for (let i = 0, n = labels.length; i < n; i += 1) {
                    if (labels[i] === event.label) {
                        this.chartContent.chartColors[0].backgroundColor[i] = this.hex2rgb(event.bg, 90);
                    }
                }
            }
        }

        this.panelChartComponent.componentRef.instance.inject.edaChart = this.chartContent;
        this.panelChartComponent.componentRef.instance.updateChart();
    }

    // Función para cambiar el color con los botones
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
        if (n < 10) return `0${n}`
        else return `${n}`;
    }

    disableMailConfirm() {
        return (!this.quantity || !this.units || !(this.selectedUsers.length > 0) || !this.mailMessage)
    }

    onPaletteSelected() {
        this.chartContent = this.panelChartComponent.componentRef.instance.inject.edaChart;

        const dataset = this.chartContent.chartDataset;

        // Obtener paleta seleccionada
        this.panelChartComponent['chartUtils'].MyPaletteColors = this.selectedPalette['paleta'];

        // Generar escala (un solo color para kpi)
        const newColors = this.ChartUtilsService.generateRGBColorGradientScaleD3(
            1,this.panelChartComponent['chartUtils'].MyPaletteColors
        );

        const newColor = newColors[0].color;

        // Actualizamos los pickers 
        this.series = dataset.map(d => ({label: d.label, bg: newColor, border: newColor }));

        for (let i = 0; i < dataset.length; i++) {

            // Caso 1: backgroundColor NO es array --> se asigna color directo
            if (!Array.isArray(dataset[i].backgroundColor)) {

                dataset[i].backgroundColor = this.hex2rgb(newColor, 90);
                dataset[i].borderColor = this.hex2rgb(newColor, 100);

                this.chartContent.chartColors[i] = _.pick(dataset[i], [
                    'backgroundColor', 'borderColor'
                ]);

            } else {
                // Caso 2: backgroundColor ES array --> gráfico por categorías
                if (this.chartContent.chartLabels) {
                    const labels = this.chartContent.chartLabels;

                    for (let j = 0; j < labels.length; j++) {
                        dataset[i].backgroundColor[j] = this.hex2rgb(newColor, 90);
                        dataset[i].borderColor[j] = this.hex2rgb(newColor, 100);

                        this.chartContent.chartColors[i].backgroundColor[j] =
                            this.hex2rgb(newColor, 90);
                    }
                }
            }
        }

        // Actualizar gráfico
        this.panelChartComponent.componentRef.instance.inject.edaChart = this.chartContent;
        this.panelChartComponent.componentRef.instance.updateChart();
    }

}