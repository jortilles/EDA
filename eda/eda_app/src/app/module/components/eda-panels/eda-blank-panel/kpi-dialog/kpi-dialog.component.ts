import { EdaDialogCloseEvent, EdaDialog2Component } from '@eda/shared/components/shared-components.index';
import { AfterViewChecked, AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { KpiMailConfigModal } from '@eda/components/kpi-mail-config/kpi-mail-config.modal';
import { PanelChartComponent } from '../panel-charts/panel-chart.component';
import { PanelChart } from '../panel-charts/panel-chart';
import { UserService } from '@eda/services/service.index';
import { StyleProviderService, ChartUtilsService } from '@eda/services/service.index';
import * as _ from 'lodash';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ColorPickerModule } from 'primeng/colorpicker';
import { DropdownModule } from 'primeng/dropdown';

@Component({
    standalone: true,
    selector: 'app-kpi-dialog',
    templateUrl: './kpi-dialog.component.html',
    styleUrls: ['./kpi-dialog.component.css'],
    imports: [FormsModule, CommonModule, EdaDialog2Component, ColorPickerModule, PanelChartComponent, KpiMailConfigModal, DropdownModule]
})
export class KpiEditDialogComponent implements OnInit, AfterViewInit, AfterViewChecked, OnDestroy {
    @Input() controller: any;
    @ViewChild('PanelChartComponent', { static: false }) panelChartComponent: PanelChartComponent;
    @ViewChild('mailConfig', { static: false }) mailConfig: any;
    @ViewChild('previewContainer', { static: false }) previewContainer: ElementRef;
    public mailConfigOpen: boolean = false;

    public panelChartConfig: PanelChart = new PanelChart();
    
    // Use assignedColors instead of series
    public assignedColors: Array<{value: string, color: string, opacity?: number}> = [];
    private originalAssignedColors: Array<{value: string, color: string, opacity?: number}> = [];

    public value: number;
    public operand: string;
    public color: string = '#ff0000';
    public alerts: Array<any> = [];
    private originalAlerts: Array<any> = [];
    public alertInfo: string = $localize`:@@alertsInfo: Cuando el valor del kpi sea (=, <,>) que el valor definido cambiará el color del texto`;
    public ptooltipViewAlerts: string = $localize`:@@ptooltipViewAlerts:Configurar alertas`;

    public modifiedFontPoints: number = 0;
    public panelBaseResultSize: number = 0;
    public previewAspectRatio: string = '4/3';
    public previewBoxStyle: any = {};
    public panelTitle: string = '';
    private panelWidth: number = 400;
    private panelHeight: number = 300;
    private resizeObserver: ResizeObserver;

    public kpiBackgroundColor: string = '';
    public kpiTextColor: string = '';
    public prefixImage: string = '';

    public currentAlert = null;
    public canIRunAlerts: boolean = false;
    public edaChart: any;
    public chartContent: any;
    public display: boolean = false;
    public activeTab: "aspecto" | "grafico" | "alerts" = "aspecto";
    public isKpiTrend: boolean = false;
    public isKpiDeviation: boolean = false;
    public selectedPalette: { name: string; paleta: any } | null = null;
    public allPalettes: any = this.stylesProviderService.ChartsPalettes;
    public title: string = $localize`:@@ChartProps:PROPIEDADES DEL GRAFICO`;
    private colorsLoaded: boolean = false;

    // Chart tab (kpibar/kpiline/kpiarea only) - same fields as chart-dialog.component.ts's
    // bar/line/area family, applied to the compact mini-chart.
    public showGraphTab: boolean = false;
    public isKpiBar: boolean = false;
    public showTrendComparative: boolean = false;
    public chartLegend: boolean = true;
    public showGridLines: boolean = true;
    public useGradient: boolean = true;
    public useRoundedBars: boolean = true;
    public showLabels: boolean = false;
    public showLabelsPercent: boolean = false;
    public showPointLines: boolean = false;
    public addTrend: boolean = false;
    public addComparative: boolean = false;

    // Getter for template compatibility (keep series to avoid breaking the HTML)
    get series() {
        return this.assignedColors;
    }

    get tabCount(): number {
        return 1 + (this.showGraphTab ? 1 : 0) + (!this.isKpiTrend ? 1 : 0);
    }

    constructor(
        private userService: UserService,
        private stylesProviderService: StyleProviderService,
        private ChartUtilsService: ChartUtilsService
    ) {
        this.canIRunAlerts = this.userService.user.name !== "edaanonim";
    }

    ngAfterViewInit(): void {
        setTimeout(() => this.computePreviewBox(), 50);
        this.resizeObserver = new ResizeObserver(() => this.computePreviewBox());
        if (this.previewContainer) {
            this.resizeObserver.observe(this.previewContainer.nativeElement);
        }
    }

    ngOnDestroy(): void {
        this.resizeObserver?.disconnect();
    }

    private computePreviewBox(): void {
        if (!this.previewContainer) return;
        const el = this.previewContainer.nativeElement;
        const padding = 48; // 1.5rem * 2 sides * 16px
        const cw = el.offsetWidth - padding;
        const ch = el.offsetHeight - padding;
        if (cw <= 0 || ch <= 0) return;
        const scale = Math.min(cw / this.panelWidth, ch / this.panelHeight);
        this.previewBoxStyle = {
            width: `${Math.round(this.panelWidth * scale)}px`,
            height: `${Math.round(this.panelHeight * scale)}px`,
        };
    }

    ngAfterViewChecked(): void {
        if (!this.colorsLoaded && this.panelChartComponent?.componentRef?.instance?.inject?.edaChart?.chartType) {
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
        this.panelWidth = this.controller.params.panelWidth || 400;
        this.panelHeight = this.controller.params.panelHeight || 300;
        this.panelTitle = this.controller.params.panelTitle || '';
        this.previewAspectRatio = `${this.panelWidth} / ${this.panelHeight}`;
        const config: any = this.panelChartConfig.config.getConfig();

        this.originalAlerts = [...(config.alertLimits || [])];
        this.alerts = [...this.originalAlerts];
        this.modifiedFontPoints = config.modifiedFontPoints || 0;
        // '' would show as red in p-colorPicker (its default hue when no valid hex is bound) -
        // fall back to the same defaults the KPI itself actually renders with when unset.
        this.kpiBackgroundColor = config.backgroundColor || '#ffffff';
        this.kpiTextColor = config.kpiColor || '#000000';
        this.prefixImage = config.prefixImage || '';
        this.isKpiTrend = this.panelChartConfig.chartType === 'kpitrend';
        this.isKpiDeviation = this.panelChartConfig.chartType === 'kpideviation';
        this.activeTab = 'aspecto';

        this.showGraphTab = ['kpibar', 'kpiline', 'kpiarea'].includes(this.edaChart);
        this.isKpiBar = this.edaChart === 'kpibar';
        this.showTrendComparative = this.edaChart === 'kpiline' || this.edaChart === 'kpiarea';
        const edaCfg: any = config.edaChart || {};
        this.chartLegend = edaCfg.chartLegend ?? false;
        this.showGridLines = edaCfg.showGridLines ?? false;
        this.useGradient = edaCfg.useGradient ?? true;
        this.useRoundedBars = edaCfg.useRoundedBars ?? true;
        this.showLabels = edaCfg.showLabels ?? false;
        this.showLabelsPercent = edaCfg.showLabelsPercent ?? false;
        this.showPointLines = edaCfg.showPointLines ?? false;
        this.addTrend = edaCfg.addTrend ?? false;
        this.addComparative = edaCfg.addComparative ?? false;

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

    setActiveTab(tab: "aspecto" | "grafico" | "alerts"): void {
        this.activeTab = tab;
    }

    private buildGraphFieldsPatch(): any {
        return {
            chartLegend: this.chartLegend,
            showGridLines: this.showGridLines,
            useGradient: this.useGradient,
            useRoundedBars: this.useRoundedBars,
            showLabels: this.showLabels,
            showLabelsPercent: this.showLabelsPercent,
            showPointLines: this.showPointLines,
            addTrend: this.addTrend,
            addComparative: this.addComparative,
        };
    }

    saveChartConfig() {
        // Save assignedColors in the chart
        if (this.chartContent && this.assignedColors.length > 0) {
            this.applyColorsToChart();
        }

        this.onClose(EdaDialogCloseEvent.UPDATE, {
            alerts: this.alerts,
            sufix: this.panelChartComponent.componentRef.instance.inject.sufix || '',
            edaChart: this.edaChart,
            chartType: this.panelChartConfig.chartType,
            chartSubType: this.panelChartConfig.edaChart,
            assignedColors: [...this.assignedColors],
            modifiedFontPoints: this.modifiedFontPoints,
            backgroundColor: this.kpiBackgroundColor,
            kpiColor: this.kpiTextColor,
            prefixImage: this.prefixImage,
            graphOptions: this.showGraphTab ? this.buildGraphFieldsPatch() : undefined,
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
        const liveAssigned = this.chartContent.assignedColors || [];
        const dataset = this.chartContent.chartDataset;

        // Create assignedColors from the dataset, saved config, or whatever's already live.
        // Trend rows default to their source series' color (and, for area, a lighter 25% default
        // opacity) instead of the next palette slot - still fully editable afterwards.
        this.assignedColors = dataset.map((ds, index) => {
            const saved = existingColors.find(c => c.value === ds.label);
            const live = liveAssigned.find(c => c.value === ds.label);
            const isDerived = !!ds.isTrend;
            const sourceColor = isDerived
                ? (existingColors.find(c => c.value === ds.sourceLabel)?.color || liveAssigned.find(c => c.value === ds.sourceLabel)?.color)
                : undefined;
            const entry: any = {
                value: ds.label,
                color: saved?.color || live?.color || sourceColor || this.getDefaultColor(index)
            };
            if (this.edaChart === 'kpiarea') entry.opacity = saved?.opacity ?? live?.opacity ?? (isDerived ? 25 : 100);
            return entry;
        });

        this.originalAssignedColors = this.assignedColors.map(c => ({ ...c }));
    }

    private getDefaultColor(index: number): string {
        const palette = this.stylesProviderService.ActualChartPalette?.['paleta'] || this.stylesProviderService.DEFAULT_PALETTE_COLOR?.['paleta'] || [];
        return palette.length ? palette[index % palette.length] : '#4472c4';
    }

    // eda-bar-d3/eda-line-d3/eda-area-d3 resolve color directly from assignedColors - just keep
    // it live-synced and call the cheap partial update, no more Chart.js-shaped dataset mutation.
    applyColorsToChart() {
        if (!this.chartContent) return;
        if (!this.panelChartComponent?.componentRef?.instance?.inject?.edaChart) return;

        this.chartContent.assignedColors = [...this.assignedColors];
        this.panelChartComponent.componentRef.instance.updateChart();
    }

    stepOpacity(idx: number, delta: number): void {
        const current = this.assignedColors[idx].opacity ?? 100;
        this.assignedColors[idx].opacity = Math.min(100, Math.max(0, current + delta));
        this.handleInputColor(this.assignedColors[idx]);
    }

    private syncGraphFields(): void {
        const cfg = this.panelChartConfig.config.getConfig();
        cfg.edaChart = { ...(cfg.edaChart || {}), ...this.buildGraphFieldsPatch() };
    }

    // Toggles like Tendencia/Comparativa add or remove a dataset (and its label) on the fly - keeps
    // assignedColors' row list matching the chart's current labels immediately, without waiting
    // for a dialog close/reopen. Existing rows (and their colors/opacity) are preserved untouched.
    private syncAssignedColorsWithChart(): void {
        if (!this.chartContent) return;
        const dataset = this.chartContent.chartDataset || [];
        const existingByLabel = new Map(this.assignedColors.map(c => [c.value, c]));
        this.assignedColors = dataset.map((ds: any, index: number) => {
            const existing = existingByLabel.get(ds.label);
            if (existing) return existing;
            const isDerived = !!ds.isTrend;
            const sourceColor = isDerived ? existingByLabel.get(ds.sourceLabel)?.color : undefined;
            const entry: any = { value: ds.label, color: sourceColor || this.getDefaultColor(index) };
            if (this.edaChart === 'kpiarea') entry.opacity = isDerived ? 25 : 100;
            return entry;
        });
        this.applyColorsToChart();
    }

    private refreshGraphPreview(): void {
        this.syncGraphFields();
        this.panelChartConfig = new PanelChart(this.panelChartConfig);
        setTimeout(() => {
            this.chartContent = this.panelChartComponent?.componentRef?.instance?.inject?.edaChart;
            this.syncAssignedColorsWithChart();
        });
    }

    setChartLegend(): void { this.refreshGraphPreview(); }
    setShowGridLines(): void { this.refreshGraphPreview(); }
    setUseGradient(): void { this.refreshGraphPreview(); }
    setUseRoundedBars(): void { this.refreshGraphPreview(); }
    setShowLabels(): void { this.refreshGraphPreview(); }
    setShowLabelsPercent(): void { this.refreshGraphPreview(); }
    setShowPointLines(): void { this.refreshGraphPreview(); }
    setAddTrend(): void { this.refreshGraphPreview(); }
    setAddComparative(): void { this.refreshGraphPreview(); }

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

    handleInputColor(item) {
        // Update the color in assignedColors
        const colorConfig = this.assignedColors.find(c => c.value === item.value);
        if (colorConfig) {
            colorConfig.color = item.color;
        }

        // Apply to the chart
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

        // Update assignedColors with the new colors
        this.assignedColors = dataset.map((d, i) => ({
            value: d.label,
            color: interpolatedColors[i % interpolatedColors.length].color
        }));

        // Apply colors
        this.applyColorsToChart();
    }

    updateKpiBackground() {
        const instance = this.panelChartComponent?.componentRef?.instance;
        if (instance) {
            instance.inject.backgroundColor = this.kpiBackgroundColor;
            this.panelChartComponent.componentRef.changeDetectorRef.detectChanges();
        }
    }

    updateKpiTextColor() {
        const instance = this.panelChartComponent?.componentRef?.instance;
        if (instance) {
            instance.inject.kpiColor = this.kpiTextColor;
            if (this.isKpiDeviation) {
                instance.updateChart?.();
            } else {
                instance.color = this.kpiTextColor || instance.defaultColor;
                this.panelChartComponent.componentRef.changeDetectorRef.detectChanges();
            }
        }
    }

    openPrefixImageInNewTab(): void {
        const win = window.open('', '_blank');
        win.document.write(`<html><body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="${this.prefixImage}" style="max-width:100%;max-height:100vh"></body></html>`);
        win.document.close();
    }

    onPrefixImageSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input?.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            this.prefixImage = reader.result as string;
            this.updatePrefixImage();
        };
        reader.readAsDataURL(file);
    }

    updatePrefixImage() {
        const instance = this.panelChartComponent?.componentRef?.instance;
        if (instance) {
            instance.inject.prefixImage = this.prefixImage;
            if (this.isKpiDeviation) {
                instance.updateChart?.();
            } else {
                this.panelChartComponent.componentRef.changeDetectorRef.detectChanges();
            }
        }
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
