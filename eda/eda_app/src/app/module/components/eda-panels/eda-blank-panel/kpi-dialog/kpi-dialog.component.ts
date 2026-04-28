import { EdaDialogAbstract, EdaDialogCloseEvent, EdaDialog } from '@eda/shared/components/shared-components.index';
import { Component, ViewChild } from '@angular/core';
import { PanelChartComponent } from '../panel-charts/panel-chart.component';
import { PanelChart } from '../panel-charts/panel-chart';
import { UserService } from '@eda/services/service.index';
import * as _ from 'lodash';


@Component({
    selector: 'app-kpi-dialog',
    templateUrl: './kpi-dialog.component.html',
    styleUrls: ['./kpi-dialog.component.css']
})

export class KpiEditDialogComponent extends EdaDialogAbstract {

    /* SDA CUSTOM */private static persistedSectionState: { appearance: boolean; axisScale: boolean; labelsValues: boolean } | null = null;

    @ViewChild('PanelChartComponent', { static: false }) panelChartComponent: PanelChartComponent;
    @ViewChild('mailConfig', { static: false }) mailConfig: any;

    public dialog: EdaDialog;
    public panelChartConfig: PanelChart = new PanelChart();
    /* SDA CUSTOM */ public previewAspectRatio: string = '16 / 9';

    public value: number;
    public operand: string;
    public color: string = '#ff0000';
    public alerts: Array<any> = [];
    public alertInfo: string = $localize`:@@alertsInfo: Cuando el valor del kpi sea (=, <,>) que el valor definido cambiará el color del texto`;
    public ptooltipViewAlerts: string = $localize`:@@ptooltipViewAlerts:Configurar alertas`;
    /* SDA CUSTOM */ public kpiColor: string = '';
    /* SDA CUSTOM */ public lineWidth: number = 2;
    /* SDA CUSTOM */ public lineStyle: string = 'solid';
    /* SDA CUSTOM */ public showLineSettings: boolean = false;
    /* SDA CUSTOM */ public showAxisSettings: boolean = false;
    /* SDA CUSTOM */ public showXAxis: boolean = true;
    /* SDA CUSTOM */ public showXAxisLabels: boolean = true;
    /* SDA CUSTOM */ public showAllXAxisLabels: boolean = true;
    /* SDA CUSTOM */ public xAxisLabelCount: number = 0;
    /* SDA CUSTOM */ // SDA CUSTOM - KPI chart label settings
    /* SDA CUSTOM */ public showLabelSettings: boolean = false;
    /* SDA CUSTOM */ public showLabels: boolean = false;
    /* SDA CUSTOM */ public showLabelsPercent: boolean = false;
    /* SDA CUSTOM */ public labelColor: string = '#000000';
    /* SDA CUSTOM */ public labelBackgroundColor: string = '';
    /* SDA CUSTOM */ public valueLabelsTooltip: string = $localize`:@@valueLabelsTooltip:Mostrar u ocultar los valores en el gráfico`;
    /* SDA CUSTOM */ public valueLabelsPercentTooltip: string = $localize`:@@valueLabelsPercentTooltip:Mostrar u ocultar los valores en porcentaje en el gráfico`;
    /* SDA CUSTOM */ // END SDA CUSTOM
    /* SDA CUSTOM */ public lineStyleOptions = [
        /* SDA CUSTOM */ { label: $localize`:@@lineStyleSolid:Sólida`, value: 'solid' },
        /* SDA CUSTOM */ { label: $localize`:@@lineStyleDashed:Discontinua`, value: 'dashed' },
        /* SDA CUSTOM */ { label: $localize`:@@lineStyleDotted:Punteada`, value: 'dotted' }
    /* SDA CUSTOM */ ];

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
    public display: boolean = false;
    /* SDA CUSTOM */ public isAppearanceExpanded: boolean = true;
    /* SDA CUSTOM */ public isAxisScaleExpanded: boolean = false;
    /* SDA CUSTOM */ public isLabelsValuesExpanded: boolean = false;
    /* SDA CUSTOM */ private previewRefreshTimer: any = null;
    /* SDA CUSTOM */ // SDA CUSTOM - KPI chart line color settings
    /* SDA CUSTOM */ public showChartLineColor: boolean = false;
    /* SDA CUSTOM */ public chartLineColor: string = '';
    /* SDA CUSTOM */ // END SDA CUSTOM
    /* SDA CUSTOM */ // SDA CUSTOM - KPI area fill color settings
    /* SDA CUSTOM */ public showChartFillColor: boolean = false;
    /* SDA CUSTOM */ public chartFillColor: string = '';
    /* SDA CUSTOM */ // END SDA CUSTOM
    /* SDA CUSTOM */ private initialAppearanceState: any = null;
    /* SDA CUSTOM */ private initialAxisScaleState: any = null;
    /* SDA CUSTOM */ private initialLabelsValuesState: any = null;
    /* SDA CUSTOM */ private initialChartStyleState: any = null;

    constructor(private userService: UserService,) {

        super();

        this.dialog = new EdaDialog({
            show: () => this.onShow(),
            hide: () => this.onClose(EdaDialogCloseEvent.NONE),
            title: $localize`:@@ChartProps:PROPIEDADES DEL GRAFICO`
        });

        this.dialog.style = { width: '80%', height: '70%', top: "-4em", left: '1em' };

        if (this.userService.user.name == "edaanonim") {
            this.canIRunAlerts = false;
        } else {
            this.canIRunAlerts = true;
        }

    }

    saveChartConfig() {
        /* SDA CUSTOM */ const kpiInject = this.panelChartComponent?.componentRef?.instance?.inject;
        /* SDA CUSTOM */ const config: any = this.panelChartConfig?.config?.getConfig?.() || {};
        /* SDA CUSTOM */ const sufix = kpiInject?.sufix ?? config.sufix ?? '';
        /* SDA CUSTOM */ const fontScale = kpiInject?.fontScale ?? config.fontScale ?? 1;
        /* SDA CUSTOM */ const chartType = this.panelChartConfig?.chartType || 'kpi';
        /* SDA CUSTOM */ const chartSubType = this.panelChartConfig?.edaChart;

        this.onClose(EdaDialogCloseEvent.UPDATE,
            {
                alerts: this.alerts,
                /* SDA CUSTOM */ sufix,
                /* SDA CUSTOM */ fontScale,
                /* SDA CUSTOM */ color: this.kpiColor,
                /* SDA CUSTOM */ lineWidth: this.lineWidth,
                /* SDA CUSTOM */ lineStyle: this.lineStyle,
                /* SDA CUSTOM */ showXAxis: this.showXAxis,
                /* SDA CUSTOM */ showXAxisLabels: this.showXAxisLabels,
                /* SDA CUSTOM */ xAxisLabelCount: this.xAxisLabelCount,
                /* SDA CUSTOM */ // SDA CUSTOM - KPI chart label settings
                /* SDA CUSTOM */ labelColor: this.labelColor,
                /* SDA CUSTOM */ labelBackgroundColor: this.labelBackgroundColor,
                /* SDA CUSTOM */ showLabels: this.showLabels,
                /* SDA CUSTOM */ showLabelsPercent: this.showLabelsPercent,
                /* SDA CUSTOM */ // END SDA CUSTOM
                edaChart: this.edaChart,
                /* SDA CUSTOM */ chartType,
                /* SDA CUSTOM */ chartSubType
            });
    }

    closeChartConfig() {
        this.onClose(EdaDialogCloseEvent.NONE);
    }

    onShow(): void {
        /* SDA CUSTOM*/ this.panelChartConfig = _.cloneDeep(this.controller.params.panelChart);
        /* SDA CUSTOM*/ this.panelChartConfig.canEdit = false;
        /* SDA CUSTOM*/ this.panelChartConfig.canSave = false;
        /* SDA CUSTOM*/ this.panelChartConfig.locked = true;
        this.edaChart = this.controller.params.edaChart;
        /* SDA CUSTOM */ this.setPreviewAspectRatio();

        const config: any = this.panelChartConfig.config.getConfig();

        this.loadChartColors();
        this.alerts = config.alertLimits || []; //deepcopy
        /* SDA CUSTOM */ this.kpiColor = this.normalizeHexColor(config.color || this.panelChartComponent?.componentRef?.instance?.color || '', '#67757c');
        /* SDA CUSTOM */ this.lineWidth = config.lineWidth ?? 2;
        /* SDA CUSTOM */ this.lineStyle = config.lineStyle ?? 'solid';
        /* SDA CUSTOM */ this.showLineSettings = ['kpiline', 'kpiarea'].includes(this.panelChartConfig?.chartType);
        /* SDA CUSTOM */ this.showAxisSettings = this.panelChartConfig?.chartType !== 'kpi';
        /* SDA CUSTOM */ this.showXAxis = config.showXAxis ?? true;
        /* SDA CUSTOM */ this.showXAxisLabels = config.showXAxisLabels ?? true;
        /* SDA CUSTOM */ this.xAxisLabelCount = config.xAxisLabelCount ?? 0;
        /* SDA CUSTOM */ this.showAllXAxisLabels = !this.xAxisLabelCount || this.xAxisLabelCount <= 0;
        /* SDA CUSTOM */ // SDA CUSTOM - KPI chart label settings
        /* SDA CUSTOM */ this.showLabelSettings = this.panelChartConfig?.chartType !== 'kpi';
        /* SDA CUSTOM */ this.showLabels = config.showLabels ?? config?.edaChart?.showLabels ?? false;
        /* SDA CUSTOM */ this.showLabelsPercent = config.showLabelsPercent ?? config?.edaChart?.showLabelsPercent ?? false;
        /* SDA CUSTOM */ this.labelColor = config.labelColor ?? this.getKpiLabelColor();
        /* SDA CUSTOM */ this.labelBackgroundColor = config.labelBackgroundColor ?? this.getKpiLabelBackgroundColor();
        /* SDA CUSTOM */ // END SDA CUSTOM
        /* SDA CUSTOM */ // SDA CUSTOM - KPI chart line color settings
        /* SDA CUSTOM */ this.showChartLineColor = ['kpibar', 'kpiarea'].includes(this.panelChartConfig?.chartType);
        /* SDA CUSTOM */ this.chartLineColor = this.getKpiChartLineColor();
        /* SDA CUSTOM */ // END SDA CUSTOM
        /* SDA CUSTOM */ // SDA CUSTOM - KPI area fill color settings
        /* SDA CUSTOM */ this.showChartFillColor = this.isKpiAreaChart();
        /* SDA CUSTOM */ this.chartFillColor = this.getKpiChartFillColor();
        /* SDA CUSTOM */ // END SDA CUSTOM
        /* SDA CUSTOM */ this.applyKpiColor();
        /* SDA CUSTOM */ this.applyLineStyle();
        /* SDA CUSTOM */ this.applyXAxisSettings();
        /* SDA CUSTOM */ this.applyKpiLabelColor();
        /* SDA CUSTOM */ this.captureInitialSectionState();
        /* SDA CUSTOM */ const persistedState = KpiEditDialogComponent.persistedSectionState;
        /* SDA CUSTOM */ if (persistedState) {
        /* SDA CUSTOM */     this.isAppearanceExpanded = persistedState.appearance;
        /* SDA CUSTOM */     this.isAxisScaleExpanded = persistedState.axisScale;
        /* SDA CUSTOM */     this.isLabelsValuesExpanded = persistedState.labelsValues;
        /* SDA CUSTOM */ } else {
        /* SDA CUSTOM */     this.isAppearanceExpanded = true;
        /* SDA CUSTOM */     this.isAxisScaleExpanded = false;
        /* SDA CUSTOM */     this.isLabelsValuesExpanded = false;
        /* SDA CUSTOM */ }
        this.display = true;
    }

    /* SDA CUSTOM */ toggleSection(section: 'appearance' | 'axisScale' | 'labelsValues'): void {
    /* SDA CUSTOM */     switch (section) {
    /* SDA CUSTOM */         case 'appearance':
    /* SDA CUSTOM */             this.isAppearanceExpanded = !this.isAppearanceExpanded;
    /* SDA CUSTOM */             break;
    /* SDA CUSTOM */         case 'axisScale':
    /* SDA CUSTOM */             this.isAxisScaleExpanded = !this.isAxisScaleExpanded;
    /* SDA CUSTOM */             break;
    /* SDA CUSTOM */         case 'labelsValues':
    /* SDA CUSTOM */             this.isLabelsValuesExpanded = !this.isLabelsValuesExpanded;
    /* SDA CUSTOM */             break;
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */     KpiEditDialogComponent.persistedSectionState = {
    /* SDA CUSTOM */         appearance: this.isAppearanceExpanded,
    /* SDA CUSTOM */         axisScale: this.isAxisScaleExpanded,
    /* SDA CUSTOM */         labelsValues: this.isLabelsValuesExpanded
    /* SDA CUSTOM */     };
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ private captureInitialSectionState(): void {
        /* SDA CUSTOM */ this.initialAppearanceState = {
            /* SDA CUSTOM */ kpiColor: this.kpiColor,
            /* SDA CUSTOM */ lineWidth: this.lineWidth,
            /* SDA CUSTOM */ lineStyle: this.lineStyle,
            /* SDA CUSTOM */ chartLineColor: this.chartLineColor,
            /* SDA CUSTOM */ chartFillColor: this.chartFillColor
        /* SDA CUSTOM */ };
        /* SDA CUSTOM */ this.initialAxisScaleState = {
            /* SDA CUSTOM */ showXAxis: this.showXAxis,
            /* SDA CUSTOM */ showXAxisLabels: this.showXAxisLabels,
            /* SDA CUSTOM */ showAllXAxisLabels: this.showAllXAxisLabels,
            /* SDA CUSTOM */ xAxisLabelCount: this.xAxisLabelCount
        /* SDA CUSTOM */ };
        /* SDA CUSTOM */ this.initialLabelsValuesState = {
            /* SDA CUSTOM */ showLabels: this.showLabels,
            /* SDA CUSTOM */ showLabelsPercent: this.showLabelsPercent,
            /* SDA CUSTOM */ labelColor: this.labelColor,
            /* SDA CUSTOM */ labelBackgroundColor: this.labelBackgroundColor
        /* SDA CUSTOM */ };
        /* SDA CUSTOM */ this.initialChartStyleState = {
            /* SDA CUSTOM */ chartDataset: _.cloneDeep(this.edaChart?.chartDataset || []),
            /* SDA CUSTOM */ chartColors: _.cloneDeep(this.edaChart?.chartColors || [])
        /* SDA CUSTOM */ };
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ resetAppearanceSection(): void {
        /* SDA CUSTOM */ if (!this.initialAppearanceState) {
            /* SDA CUSTOM */ return;
        /* SDA CUSTOM */ }
        /* SDA CUSTOM */ this.kpiColor = this.initialAppearanceState.kpiColor;
        /* SDA CUSTOM */ this.lineWidth = this.initialAppearanceState.lineWidth;
        /* SDA CUSTOM */ this.lineStyle = this.initialAppearanceState.lineStyle;
        /* SDA CUSTOM */ this.chartLineColor = this.initialAppearanceState.chartLineColor;
        /* SDA CUSTOM */ this.chartFillColor = this.initialAppearanceState.chartFillColor;

        /* SDA CUSTOM */ if (this.initialChartStyleState) {
            /* SDA CUSTOM */ this.edaChart.chartDataset = _.cloneDeep(this.initialChartStyleState.chartDataset);
            /* SDA CUSTOM */ this.edaChart.chartColors = _.cloneDeep(this.initialChartStyleState.chartColors);
            /* SDA CUSTOM */ this.loadChartColors();
        /* SDA CUSTOM */ }

        /* SDA CUSTOM */ this.applyKpiColor();
        /* SDA CUSTOM */ if (this.showLineSettings) {
            /* SDA CUSTOM */ this.applyLineStyle();
        /* SDA CUSTOM */ }
        /* SDA CUSTOM */ if (this.showChartLineColor) {
            /* SDA CUSTOM */ this.applyChartLineColor();
        /* SDA CUSTOM */ }
        /* SDA CUSTOM */ if (this.showChartFillColor) {
            /* SDA CUSTOM */ this.applyChartFillColor();
        /* SDA CUSTOM */ }
        /* SDA CUSTOM */ this.syncKpiLiveConfig();
        /* SDA CUSTOM */ this.schedulePreviewRefresh(false, 0);
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ resetAxisScaleSection(): void {
        /* SDA CUSTOM */ if (!this.initialAxisScaleState) {
            /* SDA CUSTOM */ return;
        /* SDA CUSTOM */ }
        /* SDA CUSTOM */ this.showXAxis = this.initialAxisScaleState.showXAxis;
        /* SDA CUSTOM */ this.showXAxisLabels = this.initialAxisScaleState.showXAxisLabels;
        /* SDA CUSTOM */ this.showAllXAxisLabels = this.initialAxisScaleState.showAllXAxisLabels;
        /* SDA CUSTOM */ this.xAxisLabelCount = this.initialAxisScaleState.xAxisLabelCount;
        /* SDA CUSTOM */ this.applyXAxisSettings();
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ resetLabelsValuesSection(): void {
        /* SDA CUSTOM */ if (!this.initialLabelsValuesState) {
            /* SDA CUSTOM */ return;
        /* SDA CUSTOM */ }
        /* SDA CUSTOM */ this.showLabels = this.initialLabelsValuesState.showLabels;
        /* SDA CUSTOM */ this.showLabelsPercent = this.initialLabelsValuesState.showLabelsPercent;
        /* SDA CUSTOM */ this.labelColor = this.initialLabelsValuesState.labelColor;
        /* SDA CUSTOM */ this.labelBackgroundColor = this.initialLabelsValuesState.labelBackgroundColor;
        /* SDA CUSTOM */ this.updateKpiChartLabels();
        /* SDA CUSTOM */ this.applyKpiLabelColor();
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ private setPreviewAspectRatio(): void {
        /* SDA CUSTOM */ const sizeX = this.panelChartConfig?.size?.x;
        /* SDA CUSTOM */ const sizeY = this.panelChartConfig?.size?.y;
        /* SDA CUSTOM */ if (sizeX && sizeY && sizeX > 0 && sizeY > 0) {
            /* SDA CUSTOM */ this.previewAspectRatio = `${sizeX} / ${sizeY}`;
        /* SDA CUSTOM */ } else {
            /* SDA CUSTOM */ this.previewAspectRatio = '16 / 9';
        /* SDA CUSTOM */ }
    /* SDA CUSTOM */ }

    loadChartColors() {
        if (this.edaChart) {

            /* SDA CUSTOM */ this.series = this.edaChart.chartDataset.map((dataset, index) => {
            /* SDA CUSTOM */     const chartColor = this.edaChart?.chartColors?.[index] || {};
            /* SDA CUSTOM */     const bg = this.normalizeHexColor(dataset.backgroundColor, this.normalizeHexColor(chartColor.backgroundColor, '#67757c'));
            /* SDA CUSTOM */     const border = this.normalizeHexColor(dataset.borderColor, this.normalizeHexColor(chartColor.borderColor, bg));
            /* SDA CUSTOM */     return {
            /* SDA CUSTOM */         label: dataset.label,
            /* SDA CUSTOM */         bg,
            /* SDA CUSTOM */         border
            /* SDA CUSTOM */     };
            /* SDA CUSTOM */ });

            /* SDA CUSTOM */ this.edaChart.chartColors = this.series.map(s => ({
            /* SDA CUSTOM */     backgroundColor: this.hex2rgb(s.bg, 90),
            /* SDA CUSTOM */     borderColor: this.hex2rgb(s.border || s.bg, 100)
            /* SDA CUSTOM */ }));
        }
    }

    onClose(event: EdaDialogCloseEvent, response?: any): void {
        /* SDA CUSTOM */ if (this.previewRefreshTimer) {
            /* SDA CUSTOM */ clearTimeout(this.previewRefreshTimer);
            /* SDA CUSTOM */ this.previewRefreshTimer = null;
        /* SDA CUSTOM */ }
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

    /* SDA CUSTOM */ handleInputColor(event, debounceMs: number = 0, softPreview: boolean = false) {
        /* SDA CUSTOM */ const isAreaBorderMode = this.showChartFillColor;
        if (this.edaChart.chartDataset) {
            const newDatasets = [];
            const dataset = this.edaChart.chartDataset;


            for (let i = 0, n = dataset.length; i < n; i += 1) {
                if (dataset[i].label === event.label) {
                    /* SDA CUSTOM */ if (!isAreaBorderMode) {
                        /* SDA CUSTOM */ dataset[i].backgroundColor = this.hex2rgb(event.bg, 90);
                    /* SDA CUSTOM */ }
                    dataset[i].borderColor = this.hex2rgb(event.bg, 100);
                    this.edaChart.chartColors[i] = _.pick(dataset[i], [ 'backgroundColor', 'borderColor']);
                } else {
                    if (!_.isArray(dataset[i].backgroundColor)) {
                        dataset[i].backgroundColor = this.edaChart.chartColors[i].backgroundColor;
                        /* SDA CUSTOM */ dataset[i].borderColor = this.edaChart.chartColors[i].borderColor || this.edaChart.chartColors[i].backgroundColor;
                        this.edaChart.chartColors[i] = _.pick(dataset[i], [  'backgroundColor', 'borderColor']);
                    } else {
                        if (this.edaChart.chartLabels) {
                            const labels = this.edaChart.chartLabels;
                            for (let label of labels) {
                                let inx = labels.indexOf(label);
                                if (label === event.label && inx > -1) {
                                    dataset[i].backgroundColor[inx] = this.hex2rgb(event.bg, 90);
                                    this.edaChart.chartColors[0].backgroundColor[inx] = this.hex2rgb(event.bg, 90);
                                }
                            }
                        }
                    }
                }

                newDatasets.push(dataset[i]);
            }

        } else {
            if (this.edaChart.chartLabels) {
                const labels = this.edaChart.chartLabels;
                for (let i = 0, n = labels.length; i < n; i += 1) {
                    if (labels[i] === event.label) {
                        this.edaChart.chartColors[0].backgroundColor[i] = this.hex2rgb(event.bg, 90);
                    }
                }
            }
        }

        /* SDA CUSTOM */ this.syncKpiLiveConfig();
        /* SDA CUSTOM */ if (softPreview) {
            /* SDA CUSTOM */ this.schedulePreviewUpdate(debounceMs);
        /* SDA CUSTOM */ } else {
            /* SDA CUSTOM */ this.schedulePreviewRefresh(false, debounceMs);
        /* SDA CUSTOM */ }
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ applyKpiColor(debounceMs: number = 0, softPreview: boolean = false) {
        /* SDA CUSTOM */ if (!this.panelChartComponent?.componentRef?.instance?.inject) {
            /* SDA CUSTOM */ return;
        /* SDA CUSTOM */ }
        /* SDA CUSTOM */ this.kpiColor = this.normalizeHexColor(this.kpiColor, this.kpiColor);
        /* SDA CUSTOM */ this.panelChartComponent.componentRef.instance.inject.color = this.kpiColor;
        /* SDA CUSTOM */ if (typeof this.panelChartComponent.componentRef.instance.setBaseColor === 'function') {
            /* SDA CUSTOM */ this.panelChartComponent.componentRef.instance.setBaseColor(this.kpiColor);
            /* SDA CUSTOM */ this.panelChartComponent.componentRef.instance.applyAlertColors?.();
        /* SDA CUSTOM */ }
        this.panelChartComponent.componentRef.instance.inject.edaChart = this.edaChart;
        /* SDA CUSTOM */ this.syncKpiLiveConfig();
        /* SDA CUSTOM */ if (softPreview) {
            /* SDA CUSTOM */ this.schedulePreviewUpdate(debounceMs);
        /* SDA CUSTOM */ } else {
            /* SDA CUSTOM */ this.schedulePreviewRefresh(false, debounceMs);
        /* SDA CUSTOM */ }
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ applyLineStyle(debounceMs: number = 0) {
        /* SDA CUSTOM */ if (!this.showLineSettings || !this.edaChart?.chartDataset) {
            /* SDA CUSTOM */ return;
        /* SDA CUSTOM */ }
        /* SDA CUSTOM */ if (this.panelChartComponent?.componentRef?.instance?.inject) {
            /* SDA CUSTOM */ this.panelChartComponent.componentRef.instance.inject.lineWidth = this.lineWidth;
            /* SDA CUSTOM */ this.panelChartComponent.componentRef.instance.inject.lineStyle = this.lineStyle;
            /* SDA CUSTOM */ this.panelChartComponent.componentRef.instance.inject.edaChart = this.edaChart;
        /* SDA CUSTOM */ }
        /* SDA CUSTOM */ this.updateLineDatasets(this.edaChart.chartDataset);
        /* SDA CUSTOM */ this.syncKpiLiveConfig();
        /* SDA CUSTOM */ this.schedulePreviewRefresh(false, debounceMs);
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ toggleAllXAxisLabels() {
        /* SDA CUSTOM */ if (this.showAllXAxisLabels) {
            /* SDA CUSTOM */ this.xAxisLabelCount = 0;
        /* SDA CUSTOM */ } else if (!this.xAxisLabelCount || this.xAxisLabelCount <= 0) {
            /* SDA CUSTOM */ this.xAxisLabelCount = this.getDefaultXAxisLabelCount();
        /* SDA CUSTOM */ }
        /* SDA CUSTOM */ this.applyXAxisSettings();
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ handleXAxisLabelCountInput(debounceMs: number = 0) {
        /* SDA CUSTOM */ if (this.xAxisLabelCount && this.xAxisLabelCount > 0) {
            /* SDA CUSTOM */ this.showAllXAxisLabels = false;
        /* SDA CUSTOM */ }
        /* SDA CUSTOM */ this.applyXAxisSettings(debounceMs);
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ applyXAxisSettings(debounceMs: number = 0) {
        /* SDA CUSTOM */ if (!this.showAxisSettings || !this.edaChart?.chartOptions) {
            /* SDA CUSTOM */ return;
        /* SDA CUSTOM */ }
        /* SDA CUSTOM */ if (this.panelChartComponent?.componentRef?.instance?.inject) {
            /* SDA CUSTOM */ this.panelChartComponent.componentRef.instance.inject.showXAxis = this.showXAxis;
            /* SDA CUSTOM */ this.panelChartComponent.componentRef.instance.inject.showXAxisLabels = this.showXAxisLabels;
            /* SDA CUSTOM */ this.panelChartComponent.componentRef.instance.inject.xAxisLabelCount = this.xAxisLabelCount;
            /* SDA CUSTOM */ this.panelChartComponent.componentRef.instance.inject.edaChart = this.edaChart;
        /* SDA CUSTOM */ }
        /* SDA CUSTOM */ this.updateXAxisOptions();
        /* SDA CUSTOM */ this.syncKpiLiveConfig();
        /* SDA CUSTOM */ this.schedulePreviewRefresh(false, debounceMs);
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ // SDA CUSTOM - KPI chart label handlers
    /* SDA CUSTOM */ setShowLabels() {
    /* SDA CUSTOM */     this.updateKpiChartLabels();
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ setShowLabelsPercent() {
    /* SDA CUSTOM */     this.updateKpiChartLabels();
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ setLabelColor(debounceMs: number = 0, softPreview: boolean = false) {
    /* SDA CUSTOM */     this.applyKpiLabelColor(debounceMs, softPreview);
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ setLabelBackgroundColor(debounceMs: number = 0, softPreview: boolean = false) {
    /* SDA CUSTOM */     this.applyKpiLabelColor(debounceMs, softPreview);
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ private updateKpiChartLabels() {
    /* SDA CUSTOM */     if (!this.panelChartConfig?.config) {
    /* SDA CUSTOM */         return;
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */     const config: any = this.panelChartConfig.config.getConfig();
    /* SDA CUSTOM */     config.showLabels = this.showLabels;
    /* SDA CUSTOM */     config.showLabelsPercent = this.showLabelsPercent;
    /* SDA CUSTOM */     if (config?.edaChart) {
    /* SDA CUSTOM */         config.edaChart.showLabels = this.showLabels;
    /* SDA CUSTOM */         config.edaChart.showLabelsPercent = this.showLabelsPercent;
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */     if (this.edaChart) {
    /* SDA CUSTOM */         this.edaChart.showLabels = this.showLabels;
    /* SDA CUSTOM */         this.edaChart.showLabelsPercent = this.showLabelsPercent;
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */     this.syncKpiLiveConfig();
    /* SDA CUSTOM */     this.refreshKpiPreview(true);
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ private applyKpiLabelColor(debounceMs: number = 0, softPreview: boolean = false): void {
    /* SDA CUSTOM */     if (!this.edaChart?.chartOptions) {
    /* SDA CUSTOM */         return;
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */     if (!this.edaChart.chartOptions.plugins) {
    /* SDA CUSTOM */         this.edaChart.chartOptions.plugins = {};
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */     if (!this.edaChart.chartOptions.plugins.datalabels) {
    /* SDA CUSTOM */         this.edaChart.chartOptions.plugins.datalabels = {};
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */     this.labelBackgroundColor = this.normalizeHexColor(this.labelBackgroundColor, '');
    /* SDA CUSTOM */     this.edaChart.chartOptions.plugins.datalabels.color = this.labelColor;
    /* SDA CUSTOM */     this.edaChart.chartOptions.plugins.datalabels.backgroundColor = this.labelBackgroundColor || null;
    /* SDA CUSTOM */     if (this.panelChartConfig?.chartType === 'kpibar') {
    /* SDA CUSTOM */         this.edaChart.chartOptions.plugins.datalabels.borderRadius = 4;
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */     this.syncKpiLiveConfig();
    /* SDA CUSTOM */     if (softPreview) {
    /* SDA CUSTOM */         this.schedulePreviewUpdate(debounceMs);
    /* SDA CUSTOM */     } else {
    /* SDA CUSTOM */         this.schedulePreviewRefresh(false, debounceMs);
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ private getKpiLabelColor(): string {
    /* SDA CUSTOM */     return this.normalizeHexColor(this.edaChart?.chartOptions?.plugins?.datalabels?.color, '#000000');
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ private getKpiLabelBackgroundColor(): string {
    /* SDA CUSTOM */     return this.normalizeHexColor(this.edaChart?.chartOptions?.plugins?.datalabels?.backgroundColor, '');
    /* SDA CUSTOM */ }
    /* SDA CUSTOM */ // END SDA CUSTOM

    /* SDA CUSTOM */ private updateXAxisOptions(): void {
        /* SDA CUSTOM */ const labelsLength = this.edaChart?.chartLabels?.length || 0;
        /* SDA CUSTOM */ const useAll = !this.xAxisLabelCount || this.xAxisLabelCount <= 0 || this.showAllXAxisLabels;
        /* SDA CUSTOM */ const maxTicksLimit = useAll ? labelsLength : this.xAxisLabelCount;

        /* SDA CUSTOM */ if (!this.edaChart.chartOptions.scales) {
            /* SDA CUSTOM */ this.edaChart.chartOptions.scales = {};
        /* SDA CUSTOM */ }
        /* SDA CUSTOM */ if (!this.edaChart.chartOptions.scales.x) {
            /* SDA CUSTOM */ this.edaChart.chartOptions.scales.x = {};
        /* SDA CUSTOM */ }
        /* SDA CUSTOM */ if (!this.edaChart.chartOptions.scales.x.ticks) {
            /* SDA CUSTOM */ this.edaChart.chartOptions.scales.x.ticks = {};
        /* SDA CUSTOM */ }
        /* SDA CUSTOM */ if (!this.edaChart.chartOptions.scales.x.grid) {
            /* SDA CUSTOM */ this.edaChart.chartOptions.scales.x.grid = {};
        /* SDA CUSTOM */ }
        /* SDA CUSTOM */ if (!this.edaChart.chartOptions.scales.x.border) {
            /* SDA CUSTOM */ this.edaChart.chartOptions.scales.x.border = {};
        /* SDA CUSTOM */ }

        /* SDA CUSTOM */ this.edaChart.chartOptions.scales.x.display = this.showXAxis || this.showXAxisLabels;
        /* SDA CUSTOM */ this.edaChart.chartOptions.scales.x.grid.drawBorder = this.showXAxis;
        /* SDA CUSTOM */ this.edaChart.chartOptions.scales.x.ticks.display = this.showXAxisLabels;
        /* SDA CUSTOM */ this.edaChart.chartOptions.scales.x.ticks.maxTicksLimit = maxTicksLimit || undefined;
        /* SDA CUSTOM */ this.edaChart.chartOptions.scales.x.ticks.autoSkip = false;
        /* SDA CUSTOM */ this.edaChart.chartOptions.scales.x.ticks.callback = this.buildXAxisTickCallback(
            /* SDA CUSTOM */ useAll,
            /* SDA CUSTOM */ labelsLength,
            /* SDA CUSTOM */ this.xAxisLabelCount,
            /* SDA CUSTOM */ this.edaChart.chartLabels
        /* SDA CUSTOM */ );
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ private buildXAxisTickCallback(
        /* SDA CUSTOM */ useAll: boolean,
        /* SDA CUSTOM */ labelsLength: number,
        /* SDA CUSTOM */ labelCount: number,
        /* SDA CUSTOM */ chartLabels: any[]
    /* SDA CUSTOM */ ): ((value: any, index: number) => string) | undefined {
        /* SDA CUSTOM */ if (labelsLength === 0) {
            /* SDA CUSTOM */ return undefined;
        /* SDA CUSTOM */ }
        /* SDA CUSTOM */ if (useAll || !labelCount || labelCount <= 0) {
            /* SDA CUSTOM */ return (value, index) => {
                /* SDA CUSTOM */ const label = Array.isArray(chartLabels)
                    /* SDA CUSTOM */ ? (chartLabels[index] ?? chartLabels[value])
                    /* SDA CUSTOM */ : value;
                /* SDA CUSTOM */ return `${label ?? ''}`;
            /* SDA CUSTOM */ };
        /* SDA CUSTOM */ }
        /* SDA CUSTOM */ const maxCount = Math.min(labelCount, labelsLength);
        /* SDA CUSTOM */ if (maxCount <= 1) {
            /* SDA CUSTOM */ return (value, index) => {
                /* SDA CUSTOM */ if (index !== 0) {
                    /* SDA CUSTOM */ return '';
                /* SDA CUSTOM */ }
                /* SDA CUSTOM */ const label = Array.isArray(chartLabels)
                    /* SDA CUSTOM */ ? (chartLabels[index] ?? chartLabels[value])
                    /* SDA CUSTOM */ : value;
                /* SDA CUSTOM */ return `${label ?? ''}`;
            /* SDA CUSTOM */ };
        /* SDA CUSTOM */ }
        /* SDA CUSTOM */ const indices = this.getAxisLabelIndices(labelsLength, maxCount);
        /* SDA CUSTOM */ return (value, index) => {
            /* SDA CUSTOM */ if (!indices.has(index)) {
                /* SDA CUSTOM */ return '';
            /* SDA CUSTOM */ }
            /* SDA CUSTOM */ const label = Array.isArray(chartLabels)
                /* SDA CUSTOM */ ? (chartLabels[index] ?? chartLabels[value])
                /* SDA CUSTOM */ : value;
            /* SDA CUSTOM */ return `${label ?? ''}`;
        /* SDA CUSTOM */ };
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ private getAxisLabelIndices(labelsLength: number, labelCount: number): Set<number> {
        /* SDA CUSTOM */ const indices = new Set<number>();
        /* SDA CUSTOM */ if (labelsLength <= 0) {
            /* SDA CUSTOM */ return indices;
        /* SDA CUSTOM */ }
        /* SDA CUSTOM */ if (labelCount <= 1) {
            /* SDA CUSTOM */ indices.add(0);
            /* SDA CUSTOM */ return indices;
        /* SDA CUSTOM */ }
        /* SDA CUSTOM */ const steps = labelCount - 1;
        /* SDA CUSTOM */ for (let i = 0; i < labelCount; i += 1) {
            /* SDA CUSTOM */ const index = Math.round((i * (labelsLength - 1)) / steps);
            /* SDA CUSTOM */ indices.add(index);
        /* SDA CUSTOM */ }
        /* SDA CUSTOM */ indices.add(0);
        /* SDA CUSTOM */ indices.add(labelsLength - 1);
        /* SDA CUSTOM */ return indices;
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ private getDefaultXAxisLabelCount(): number {
        /* SDA CUSTOM */ const labelsLength = this.edaChart?.chartLabels?.length || 0;
        /* SDA CUSTOM */ if (labelsLength === 0) {
            /* SDA CUSTOM */ return 5;
        /* SDA CUSTOM */ }
        /* SDA CUSTOM */ return Math.min(5, labelsLength);
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ private updateLineDatasets(datasets: any[]): void {
        /* SDA CUSTOM */ const dash = this.getLineDash(this.lineStyle);
        /* SDA CUSTOM */ datasets.forEach(dataset => {
            /* SDA CUSTOM */ dataset.borderWidth = this.lineWidth;
            /* SDA CUSTOM */ dataset.borderDash = dash;
        /* SDA CUSTOM */ });
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ // SDA CUSTOM - KPI chart line color handlers
    /* SDA CUSTOM */ applyChartLineColor(debounceMs: number = 0, softPreview: boolean = false) {
    /* SDA CUSTOM */     if (!this.showChartLineColor || !this.edaChart?.chartDataset) {
    /* SDA CUSTOM */         return;
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */     const borderColor = this.hex2rgb(this.chartLineColor, 100);
    /* SDA CUSTOM */     const borderWidth = 2;
    /* SDA CUSTOM */     this.edaChart.chartDataset.forEach(dataset => {
    /* SDA CUSTOM */         dataset.borderColor = borderColor;
    /* SDA CUSTOM */         dataset.borderWidth = dataset.borderWidth ?? borderWidth;
    /* SDA CUSTOM */     });
    /* SDA CUSTOM */     if (Array.isArray(this.edaChart.chartColors)) {
    /* SDA CUSTOM */         this.edaChart.chartColors = this.edaChart.chartColors.map(color => ({
    /* SDA CUSTOM */             backgroundColor: color.backgroundColor,
    /* SDA CUSTOM */             borderColor
    /* SDA CUSTOM */         }));
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */     if (this.panelChartComponent?.componentRef?.instance?.inject) {
    /* SDA CUSTOM */         this.panelChartComponent.componentRef.instance.inject.edaChart = this.edaChart;
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */     this.syncKpiLiveConfig();
    /* SDA CUSTOM */     if (softPreview) {
    /* SDA CUSTOM */         this.schedulePreviewUpdate(debounceMs);
    /* SDA CUSTOM */     } else {
    /* SDA CUSTOM */         this.schedulePreviewRefresh(false, debounceMs);
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ private getKpiChartLineColor(): string {
    /* SDA CUSTOM */     const chartColors = this.edaChart?.chartColors || [];
    /* SDA CUSTOM */     const border = chartColors[0]?.borderColor || this.edaChart?.chartDataset?.[0]?.borderColor;
    /* SDA CUSTOM */     return this.normalizeHexColor(border, '');
    /* SDA CUSTOM */ }
    /* SDA CUSTOM */ // END SDA CUSTOM

    /* SDA CUSTOM */ // SDA CUSTOM - KPI area fill color handlers
    /* SDA CUSTOM */ applyChartFillColor(debounceMs: number = 0, softPreview: boolean = false) {
    /* SDA CUSTOM */     if (!this.showChartFillColor || !this.edaChart?.chartDataset) {
    /* SDA CUSTOM */         return;
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */     const fillColor = this.hex2rgb(this.chartFillColor, 90);
    /* SDA CUSTOM */     this.edaChart.chartDataset.forEach(dataset => {
    /* SDA CUSTOM */         dataset.backgroundColor = fillColor;
    /* SDA CUSTOM */         dataset.fill = true;
    /* SDA CUSTOM */     });
    /* SDA CUSTOM */     if (Array.isArray(this.edaChart.chartColors)) {
    /* SDA CUSTOM */         this.edaChart.chartColors = this.edaChart.chartColors.map(color => ({
    /* SDA CUSTOM */             backgroundColor: fillColor,
    /* SDA CUSTOM */             borderColor: color.borderColor
    /* SDA CUSTOM */         }));
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */     if (this.panelChartComponent?.componentRef?.instance?.inject) {
    /* SDA CUSTOM */         this.panelChartComponent.componentRef.instance.inject.edaChart = this.edaChart;
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */     this.syncKpiLiveConfig();
    /* SDA CUSTOM */     if (softPreview) {
    /* SDA CUSTOM */         this.schedulePreviewUpdate(debounceMs);
    /* SDA CUSTOM */     } else {
    /* SDA CUSTOM */         this.schedulePreviewRefresh(false, debounceMs);
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ private getKpiChartFillColor(): string {
    /* SDA CUSTOM */     const chartColors = this.edaChart?.chartColors || [];
    /* SDA CUSTOM */     const background = chartColors[0]?.backgroundColor || this.edaChart?.chartDataset?.[0]?.backgroundColor;
    /* SDA CUSTOM */     return this.normalizeHexColor(background, '');
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ private isKpiAreaChart(): boolean {
    /* SDA CUSTOM */     const panelType = this.panelChartConfig?.chartType;
    /* SDA CUSTOM */     const panelSubType = this.panelChartConfig?.edaChart;
    /* SDA CUSTOM */     const edaChartType = this.edaChart?.chartType;
    /* SDA CUSTOM */     const kpiType = this.edaChart?.kpiChart;
    /* SDA CUSTOM */     return panelType === 'kpiarea' || panelSubType === 'kpiarea' || edaChartType === 'area' || kpiType === 'kpiarea';
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ private syncKpiLiveConfig(): void {
    /* SDA CUSTOM */     if (!this.panelChartConfig?.config) {
    /* SDA CUSTOM */         return;
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */     const config: any = this.panelChartConfig.config.getConfig();
    /* SDA CUSTOM */     config.lineWidth = this.lineWidth;
    /* SDA CUSTOM */     config.lineStyle = this.lineStyle;
    /* SDA CUSTOM */     config.color = this.kpiColor;
    /* SDA CUSTOM */     config.showXAxis = this.showXAxis;
    /* SDA CUSTOM */     config.showXAxisLabels = this.showXAxisLabels;
    /* SDA CUSTOM */     config.xAxisLabelCount = this.xAxisLabelCount;
    /* SDA CUSTOM */     config.labelColor = this.labelColor;
    /* SDA CUSTOM */     config.labelBackgroundColor = this.labelBackgroundColor;
    /* SDA CUSTOM */     config.showLabels = this.showLabels;
    /* SDA CUSTOM */     config.showLabelsPercent = this.showLabelsPercent;
    /* SDA CUSTOM */     if (this.edaChart?.chartColors) {
    /* SDA CUSTOM */         config.colors = this.edaChart.chartColors;
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */     if (config?.edaChart) {
    /* SDA CUSTOM */         config.edaChart.showLabels = this.showLabels;
    /* SDA CUSTOM */         config.edaChart.showLabelsPercent = this.showLabelsPercent;
    /* SDA CUSTOM */         config.edaChart.labelBackgroundColor = this.labelBackgroundColor;
    /* SDA CUSTOM */         if (this.edaChart?.chartColors) {
    /* SDA CUSTOM */             config.edaChart.colors = this.edaChart.chartColors;
    /* SDA CUSTOM */         }
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ private refreshKpiPreview(forceRebuild: boolean = false): void {
    /* SDA CUSTOM */     const refreshFromPanel = () => {
    /* SDA CUSTOM */         if (!this.panelChartComponent) {
    /* SDA CUSTOM */             return;
    /* SDA CUSTOM */         }
    /* SDA CUSTOM */         // Rebuild current chart in preview so every option change is reflected immediately.
    /* SDA CUSTOM */         this.panelChartComponent.changeChartType();
    /* SDA CUSTOM */         const nextEdaChart = this.panelChartComponent?.componentRef?.instance?.inject?.edaChart;
    /* SDA CUSTOM */         if (nextEdaChart) {
    /* SDA CUSTOM */             this.edaChart = nextEdaChart;
    /* SDA CUSTOM */             if (Array.isArray(this.edaChart?.chartDataset)) {
    /* SDA CUSTOM */                 this.loadChartColors();
    /* SDA CUSTOM */             }
    /* SDA CUSTOM */         }
    /* SDA CUSTOM */         this.panelChartComponent.updateComponent?.();
    /* SDA CUSTOM */     };

    /* SDA CUSTOM */     if (forceRebuild) {
    /* SDA CUSTOM */         this.panelChartConfig = new PanelChart(this.panelChartConfig);
    /* SDA CUSTOM */         setTimeout(_ => {
    /* SDA CUSTOM */             refreshFromPanel();
    /* SDA CUSTOM */         });
    /* SDA CUSTOM */         return;
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */     refreshFromPanel();
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ private schedulePreviewRefresh(forceRebuild: boolean = false, debounceMs: number = 0): void {
    /* SDA CUSTOM */     if (debounceMs <= 0) {
    /* SDA CUSTOM */         this.refreshKpiPreview(forceRebuild);
    /* SDA CUSTOM */         return;
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */     if (this.previewRefreshTimer) {
    /* SDA CUSTOM */         clearTimeout(this.previewRefreshTimer);
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */     this.previewRefreshTimer = setTimeout(() => {
    /* SDA CUSTOM */         this.previewRefreshTimer = null;
    /* SDA CUSTOM */         this.refreshKpiPreview(forceRebuild);
    /* SDA CUSTOM */     }, debounceMs);
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ // SDA CUSTOM - Soft preview update to keep color pickers opened while selecting
    /* SDA CUSTOM */ private schedulePreviewUpdate(debounceMs: number = 0): void {
    /* SDA CUSTOM */     const updateFromPanel = () => {
    /* SDA CUSTOM */         if (!this.panelChartComponent?.componentRef?.instance) {
    /* SDA CUSTOM */             return;
    /* SDA CUSTOM */         }
    /* SDA CUSTOM */         this.panelChartComponent.componentRef.instance.inject.edaChart = this.edaChart;
    /* SDA CUSTOM */         this.panelChartComponent.updateComponent?.();
    /* SDA CUSTOM */     };

    /* SDA CUSTOM */     if (debounceMs <= 0) {
    /* SDA CUSTOM */         updateFromPanel();
    /* SDA CUSTOM */         return;
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */     if (this.previewRefreshTimer) {
    /* SDA CUSTOM */         clearTimeout(this.previewRefreshTimer);
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */     this.previewRefreshTimer = setTimeout(() => {
    /* SDA CUSTOM */         this.previewRefreshTimer = null;
    /* SDA CUSTOM */         updateFromPanel();
    /* SDA CUSTOM */     }, debounceMs);
    /* SDA CUSTOM */ }
    /* SDA CUSTOM */ // END SDA CUSTOM
    /* SDA CUSTOM */ // END SDA CUSTOM

    /* SDA CUSTOM */ // SDA CUSTOM - Normalize color values for dialog inputs
    /* SDA CUSTOM */ private normalizeHexColor(color: any, fallback: string = ''): string {
    /* SDA CUSTOM */     const resolvedColor = Array.isArray(color) ? color[0] : color;
    /* SDA CUSTOM */     if (typeof resolvedColor !== 'string') {
    /* SDA CUSTOM */         return fallback;
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */     const trimmed = resolvedColor.trim();
    /* SDA CUSTOM */     const shortHexMatch = /^#([0-9a-fA-F]{3})$/.exec(trimmed);
    /* SDA CUSTOM */     if (shortHexMatch) {
    /* SDA CUSTOM */         const [r, g, b] = shortHexMatch[1].split('');
    /* SDA CUSTOM */         return `#${r}${r}${g}${g}${b}${b}`;
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */     if (/^#([0-9a-fA-F]{6})$/.test(trimmed)) {
    /* SDA CUSTOM */         return trimmed;
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */     if (/^rgba?\(/i.test(trimmed)) {
    /* SDA CUSTOM */         return this.rgb2hex(trimmed) || fallback;
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */     return fallback;
    /* SDA CUSTOM */ }
    /* SDA CUSTOM */ // END SDA CUSTOM

    /* SDA CUSTOM */ private getLineDash(style: string): number[] {
        /* SDA CUSTOM */ switch (style) {
            /* SDA CUSTOM */ case 'dashed':
                /* SDA CUSTOM */ return [8, 4];
            /* SDA CUSTOM */ case 'dotted':
                /* SDA CUSTOM */ return [2, 4];
            /* SDA CUSTOM */ case 'solid':
            /* SDA CUSTOM */ default:
                /* SDA CUSTOM */ return [];
        /* SDA CUSTOM */ }
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

}
