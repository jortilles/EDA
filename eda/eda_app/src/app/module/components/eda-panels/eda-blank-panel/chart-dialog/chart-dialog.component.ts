
import { PanelChartComponent } from './../panel-charts/panel-chart.component';
import { Component, Input, ViewChild } from '@angular/core';
import { EdaDialog, EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import * as _ from 'lodash';
import { StyleProviderService, ChartUtilsService, AlertService, SpinnerService } from '@eda/services/service.index';
import { PanelChart } from '../panel-charts/panel-chart';
import { ChartConfig } from '../panel-charts/chart-configuration-models/chart-config';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EdaDialog2Component } from '@eda/shared/components/shared-components.index';
import { ColorPickerModule } from 'primeng/colorpicker';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { PredictionDialogComponent, PredictionConfig, QueryColumn } from '../prediction-dialog/prediction-dialog.component';
import Swal from 'sweetalert2';

@Component({
    standalone: true,
    selector: 'app-chart-dialog',
    templateUrl: './chart-dialog.component.html',
    styleUrls: ['./chart-dialog.component.css'],
    imports: [CommonModule, FormsModule, EdaDialog2Component, PanelChartComponent, ColorPickerModule, PredictionDialogComponent, InputNumberModule, DropdownModule]
})

export class ChartDialogComponent {
    @Input() controller: any;
    @Input() dashboard: any;
    @ViewChild('PanelChartComponent', { static: false }) panelChartComponent: PanelChartComponent;

    public dialog: EdaDialog;
    public activeTabIndex: number = 0;
    public chart: any;
    public addTrend: boolean;
    public addComparative: boolean;
    public numberOfColumns: number;
    public panelChartConfig: PanelChart = new PanelChart();
    public showTrend: boolean = false;
    public showComparative: boolean = false;
    public showNumberOfColumns: boolean = false;
    public display: boolean = false;
    public showLabels: boolean = false;
    public showLabelsPercent: boolean = false;
    public labelColorMode: string = 'series';
    public labelCustomColor: string = '#000000';
    public showUniqueColors: boolean = false;
    public showPointLines: boolean = false;
    public showPredictionLines: boolean = false;
    public chartLegend: boolean = true;
    public showGridLines: boolean = true;
    public showPredictionDialog: boolean = false;
    public predictionMethod: string = 'Arima';
    public selectedPalette: { name: string; paleta: any } | null = null;
    public allPalettes: any = this.stylesProviderService.ChartsPalettes;
    public assignedColors: { value: string; color: string; opacity?: number }[] = [];
    private originalAssignedColors: { value: string; color: string; opacity?: number }[] = [];
    public uniqueBarColors: { value: string; color: string }[] = [];
    private originalUniqueBarColors: { value: string; color: string }[] = [];

    // Colored bars thresholds
    public coloredBarsActive: boolean = false;
    public thresholdHigh: number | null = null;
    public thresholdLow: number | null = null;
    public colorAbove: string = '#ff4444';
    public colorBetween: string = '#ffcc00';
    public colorBelow: string = '#44bb44';
    public useGradient: boolean = true;
    public useRoundedBars: boolean = true;

    public comparativeTooltip = $localize`:@@comparativeTooltip:La función de comparar sólo se puede activar si se dispone de un campo de fecha agregado por mes o semana y un único campo numérico agregado`
    public trendTooltip = $localize`:@@trendTooltip:La función de añadir tendencia sólo se puede activar en los gràficos de lineas`
    public showLablesTooltip = $localize`:@@showLablesTooltip:Mostrar o ocultar las etiquetas sobre los gráficos`
    public showLablesPercentTooltip = $localize`:@@showLablesPercentTooltip:Mostrar o ocultar las etiquetas en porcentaje sobre los gráficos`
    public columnsTooltip = $localize`:@@columnsTooltip:Elige cuantas columnas quieres mostrar`
    public tooltipBlockedByComparative = $localize`:@@tooltipBlockedByComparative:Bloqueado porque comparativa está activa`
    public tooltipBlockedByTrendOrPrediction = $localize`:@@tooltipBlockedByTrendOrPrediction:Bloqueado porque tendencia o predicción está activa`

    // Save the original label values
    private originalLabelValues: {
        addTrend: boolean;
        showLabels: boolean;
        showLabelsPercent: boolean;
        labelColorMode: string;
        labelCustomColor: string;
        showUniqueColors: boolean;
        showPointLines: boolean;
        showPredictionLines: boolean;
        numberOfColumns: number;
        addComparative: boolean;
        chartLegend: boolean;
        showGridLines: boolean;
        useGradient: boolean;
        useRoundedBars: boolean;
    };

    public drops = {
        pointStyles: [],
        pointSizes: [],
        grid: [],
        direction: [],
        stacked: []
    };

    public pointStyle: any;
    public direction: any = { label: '', value: '' };
    public stacked: any;
    public id: any;
    public title: string = $localize`:@@ChartProps:PROPIEDADES DEL GRAFICO`

    constructor(private chartUtils: ChartUtilsService, private stylesProviderService: StyleProviderService,
        private alertService: AlertService,
        private spinnerService: SpinnerService
    ) {
        this.drops.pointStyles = [
            { label: 'Puntos', value: 'circle' },
            { label: 'Triangulos', value: 'triangle' },
            { label: 'Rectangulos', value: 'rect' },
            { label: 'Cruces', value: 'cross' },
            { label: 'Estrella', value: 'star' },
            { label: 'Linia', value: 'line' }
        ];

        this.drops.grid = [
            { label: 'Mostrar', value: true },
            { label: 'Ocultar', value: false }
        ];

        this.drops.direction = [
            { label: 'Vertical', value: 'bar' },
            { label: 'Horizontal', value: 'horizontalBar' }
        ];

        this.drops.stacked = [
            { label: 'Sin apilar', value: false },
            { label: 'Apilar', value: true }
        ];
    }

    ngOnInit(): void {
        this.panelChartConfig = this.controller.params.config;
        this.addTrend = this.controller.params.config.config.getConfig()['addTrend'] || false;
        this.showLabels = this.controller.params.config.config.getConfig()['showLabels'] || false;
        this.showLabelsPercent = this.controller.params.config.config.getConfig()['showLabelsPercent'] || false;
        this.labelColorMode = this.controller.params.config.config.getConfig()['labelColorMode'] || 'series';
        this.labelCustomColor = this.controller.params.config.config.getConfig()['labelCustomColor'] || '#000000';
        this.showUniqueColors = this.controller.params.config.config.getConfig()['showUniqueColors'] || false;
        this.showPointLines = this.controller.params.config.config.getConfig()['showPointLines'] || false;
        this.showPredictionLines = this.controller.params.config.config.getConfig()['showPredictionLines'] || false;
        this.predictionMethod = this.controller.params.config.config.getConfig()['predictionMethod'] || 'Arima'; // Initial value in the dropdown
        // NOT `|| false` - numberOfColumns is a number (or unset), and transformDataQuery's own
        // "was it actually provided" check is `!isNaN(numberOfColumns) && numberOfColumns !== null`,
        // which treats `false` as a valid override (isNaN(false) is false, coerced to 0) - that
        // silently zeroed out every histogram bin count on the very next dialog option change,
        // since every setter round-trips this same field back into the shared config.
        this.numberOfColumns = this.controller.params.config.config.getConfig()['numberOfColumns'] ?? undefined;
        this.addComparative = this.controller.params.config.config.getConfig()['addComparative'] || false;
        this.chartLegend = this.controller.params.config.config.getConfig()['chartLegend'] ?? true;
        this.showGridLines = this.controller.params.config.config.getConfig()['showGridLines'] ?? true;
        this.useGradient = this.controller.params.config.config.getConfig()['useGradient'] ?? true;
        this.useRoundedBars = this.controller.params.config.config.getConfig()['useRoundedBars'] ?? true;

        // NEW: Save original label values
        this.originalLabelValues = {
            addTrend: this.addTrend,
            showLabels: this.showLabels,
            showLabelsPercent: this.showLabelsPercent,
            labelColorMode: this.labelColorMode,
            labelCustomColor: this.labelCustomColor,
            showUniqueColors: this.showUniqueColors,
            showPointLines: this.showPointLines,
            showPredictionLines: this.showPredictionLines,
            numberOfColumns: this.numberOfColumns,
            addComparative: this.addComparative,
            chartLegend: this.chartLegend,
            showGridLines: this.showGridLines,
            useGradient: this.useGradient,
            useRoundedBars: this.useRoundedBars
        };

        this.chart = this.controller.params.chart;
        this.showTrend = this.chart.chartType === 'line';
        this.showNumberOfColumns = this.controller.params.chart.edaChart === 'histogram';
        this.showComparative = this.allowCoparative(this.controller.params);
        this.load();
        this.loadChartColors();

        // Load colored bars config
        const coloredBarsConfig = this.controller.params.config.config.getConfig()['coloredBarsConfig'];
        if (coloredBarsConfig) {
            this.thresholdHigh = coloredBarsConfig.thresholdHigh ?? null;
            this.thresholdLow = coloredBarsConfig.thresholdLow ?? null;
            this.colorAbove = coloredBarsConfig.colorAbove ?? '#ff4444';
            this.colorBetween = coloredBarsConfig.colorBetween ?? '#ffcc00';
            this.colorBelow = coloredBarsConfig.colorBelow ?? '#44bb44';
            this.coloredBarsActive = coloredBarsConfig.active ?? false;
            if (this.coloredBarsActive) {
                this.activeTabIndex = this.intervalTabIndex;
                this.applyColorsToChart();
            }
        }
        if (!this.coloredBarsActive && this.showUniqueColors && this.showUniqueColorsTab) {
            this.activeTabIndex = 1;
        }
        this.display = true;
    }

    load() {
        this.loadChartTypeProperties();
    }

    loadChartColors() {
        // Retrieve assignedColors saved in config
        const existingColors = this.controller.params.config.config.getConfig()['assignedColors'] || [];
        // Get labels based on the chart type
        const labels = this.getChartLabels();

        // Create assignedColors by mapping labels to colors
        if (this.chart['edaChart'] === 'histogram') {
            this.assignedColors = labels.map((label, index) => {
                const match = existingColors.find(c => c.value === label);
                return {
                    value: label,
                    color: existingColors[0]?.color,
                };
            });
        } else {
            this.assignedColors = labels.map((label, index) => {
                const match = existingColors.find(c => c.value === label);
                // Trend/prediction rows default to their source series' color (and, for area, a
                // lighter 25% default opacity) instead of the next palette slot - still fully
                // editable afterwards like any other row.
                const ds: any = this.chart.chartDataset?.find((d: any) => d.label === label);
                const isDerived = !!(ds?.isTrend || ds?.isPrediction);
                const sourceColor = isDerived ? existingColors.find(c => c.value === ds.sourceLabel)?.color : undefined;
                return {
                    value: label,
                    color: match?.color || sourceColor || this.getDefaultColor(index),
                    opacity: match?.opacity ?? (isDerived ? 25 : 100)
                };
            });
        }

        // Load uniqueBarColors from chartLabels (for bars) before applyColorsToChart
        const savedUniqueColors = this.controller.params.config.config.getConfig()['uniqueBarColors'] || [];
        const barLabels: string[] = this.chart.chartLabels || [];
        this.uniqueBarColors = barLabels.map((label, index) => {
            const match = savedUniqueColors.find(c => c.value === label);
            return { value: label, color: match?.color || this.getDefaultColor(index) };
        });

        // Apply colors to the chart
        this.applyColorsToChart();

        // Save the preview for cancellation
        this.originalAssignedColors = _.cloneDeep(this.assignedColors);
        this.originalUniqueBarColors = _.cloneDeep(this.uniqueBarColors);
    }

    loadChartTypeProperties() {
        // edaChart, not chartType - chartType is always literally 'bar' for every bar subtype,
        // so switching on it here meant the 'horizontalBar' case below could never be reached.
        const type: any = this.chart['edaChart'];
        switch (type) {
            case 'bar':
                this.direction = { label: 'Vertical', value: 'bar' };
                break;
            case 'horizontalBar':
                this.direction = { label: 'Horizontal', value: 'horizontalBar' };
                break;
            case 'line':
                this.pointStyle = _.find(this.drops.pointStyles, key =>
                    key.value === _.get(this.chart.chartOptions, 'elements.point.pointStyle')
                );
                break;
        }
    }

    // Get labels for this dialog's chart family (doughnut/polarArea moved to category-chart-dialog).
    private getChartLabels(): string[] {
        return this.chart.chartDataset?.map(d => d.label) || [];
    }


    // Methods that update the chart configuration

    /** Single place every live setter funnels through: writes this dialog's whole field set into
     * the shared config, avoiding the old pattern of repeating the same field list per setter. */
    private buildCustomFieldsPatch(): any {
        return {
            addTrend: this.addTrend,
            addComparative: this.addComparative,
            showLabels: this.showLabels,
            showLabelsPercent: this.showLabelsPercent,
            showPointLines: this.showPointLines,
            showPredictionLines: this.showPredictionLines,
            numberOfColumns: this.numberOfColumns,
            assignedColors: [...this.assignedColors],
            chartLegend: this.chartLegend,
            labelColorMode: this.labelColorMode,
            labelCustomColor: this.labelCustomColor,
            coloredBarsConfig: {
                thresholdHigh: this.thresholdHigh,
                thresholdLow: this.thresholdLow,
                colorAbove: this.colorAbove,
                colorBetween: this.colorBetween,
                colorBelow: this.colorBelow,
                active: this.coloredBarsActive
            },
            showUniqueColors: this.showUniqueColors,
            uniqueBarColors: [...this.uniqueBarColors],
            showGridLines: this.showGridLines,
            useGradient: this.useGradient,
            useRoundedBars: this.useRoundedBars
        };
    }

    private syncCustomFields(): void {
        Object.assign(this.controller.params.config.config.getConfig(), this.buildCustomFieldsPatch());
    }

    private refreshPreview(): void {
        this.panelChartConfig = new PanelChart(this.panelChartConfig);
        setTimeout(_ => {
            this.chart = this.panelChartComponent.componentRef.instance.inject;
            this.load();
            this.syncAssignedColorsWithChart();
        });
    }

    // Toggles like Tendencia/Comparativa add or remove a dataset (and its label) on the fly - keeps
    // assignedColors' row list matching the chart's current labels immediately, without waiting for
    // a dialog close/reopen. Existing rows (and their colors/opacity) are preserved untouched.
    private syncAssignedColorsWithChart(): void {
        const labels = this.getChartLabels();
        const existingByLabel = new Map(this.assignedColors.map(c => [c.value, c]));
        this.assignedColors = labels.map((label, index) => {
            const existing = existingByLabel.get(label);
            if (existing) return existing;
            const ds: any = this.chart.chartDataset?.find((d: any) => d.label === label);
            const isDerived = !!(ds?.isTrend || ds?.isPrediction);
            const sourceColor = isDerived ? existingByLabel.get(ds.sourceLabel)?.color : undefined;
            return {
                value: label,
                color: sourceColor || this.getDefaultColor(index),
                opacity: isDerived ? 25 : 100
            };
        });
        this.applyColorsToChart();
    }

    SetNumberOfColumns() {
        this.syncCustomFields();
        this.refreshPreview();
    }

    checkTrend() {
        this.syncCustomFields();
        this.refreshPreview();
    }

    setComparative() {
        this.syncCustomFields();
        this.refreshPreview();
    }

    setShowLablesPercent() {
        this.syncCustomFields();
        this.refreshPreview();
    }

    allowCoparative(params) {

        let monthformat = false;
        const haveDate = params.config.query.filter(field => field.column_type === 'date').length > 0 // there is a date
        if (haveDate) {
            monthformat = ['month', 'week','day'].includes(params.config.query.filter(field => field.column_type === 'date')[0].format);
        }
        const chartAllowed = ['line', 'bar'].includes(params.config.chartType);
        const onlyTwoCols = params.config.query.length === 2;

        const aggregation =
            params.config.query.filter(col => col.column_type === 'numeric')
                .map(col => col.aggregation_type
                    .filter(agg => agg.selected === true && agg.value !== 'none')
                    .map(agg => agg.selected))
                .reduce((a, b) => a || b, false)[0];


        return haveDate && chartAllowed && onlyTwoCols && monthformat && aggregation;

    }


    setShowLables() {
        this.syncCustomFields();
        this.refreshPreview();
    }

    setLabelColor() {
        this.syncCustomFields();
        this.refreshPreview();
    }

    labelColorButtonClass(mode: string): Record<string, boolean> {
        const active = this.labelColorMode === mode;
        return {
            'bg-[var(--corporate-primary)] text-white': active
        };
    }

    setChartLegend() {
        this.syncCustomFields();
        this.refreshPreview();
    }

    setShowGridLines() {
        this.syncCustomFields();
        this.refreshPreview();
    }

    setShowLines() {
        this.syncCustomFields();
        this.refreshPreview();
    }

    setPredictionLines() {
        if (this.showPredictionLines) {
            // Toggle ON -> open the prediction configuration dialog
            this.showPredictionDialog = true;
        } else {
            // Toggle OFF -> confirm with Swal before removing the prediction
            Swal.fire({
                title: $localize`:@@RemovePredictionTitle:¿Quieres quitar la predicción?`,
                text: $localize`:@@RemovePredictionText:Se quitará la predicción y se ejecutará la consulta del gráfico.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: $localize`:@@RemovePredictionYes:Sí, quitar`,
                cancelButtonText: $localize`:@@RemovePredictionNo:No, mantener`,
                didOpen: () => {
                    const container = document.querySelector('.swal2-container') as HTMLElement;
                    if (container) {
                        container.style.zIndex = '10000';
                    }
                }
            }).then(async (result) => {
                if (result.isConfirmed) {
                    await this.applyPrediction('None');
                } else {
                    // Canceled -> switch back to ON
                    this.showPredictionLines = true;
                }
            });
        }
    }

    // Returns the visible tables from the panel data model.
    get modelTables(): any[] {
        const panelID = this.controller.params.panelId;
        const dashboardPanel = this.dashboard?.edaPanels?.toArray().find(cmp => cmp.panel.id === panelID);
        if (!dashboardPanel?.dataSource?.model?.tables) return [];
        return dashboardPanel.dataSource.model.tables.filter(t => t.visible !== false);
    }

    /** Returns the numeric columns from the current query for the TensorFlow target column selector */
    get queryNumericColumns(): QueryColumn[] {
        const queryFields: any[] = this.controller?.params?.config?.query;
        if (!queryFields) return [];
        return queryFields
            .filter(f => f.column_type === 'numeric')
            .map(f => ({
                column_name: f.column_name,
                table_id: f.table_id,
                display_name: typeof f.display_name === 'object' ? (f.display_name.default || f.column_name) : (f.display_name || f.column_name)
            }));
    }

    async confirmPrediction(predictionConfig: PredictionConfig) {
        this.showPredictionDialog = false;
        this.predictionMethod = predictionConfig.method;

        // Show the spinner while the prediction runs
        this.spinnerService.on();

        // Update the chart config
        this.syncCustomFields();
        this.controller.params.config.config.getConfig()['predictionMethod'] = this.predictionMethod;
        this.panelChartConfig = new PanelChart(this.panelChartConfig);

        // Set prediction and configuration in the panel query
        const panelID = this.controller.params.panelId;
        const dashboardPanel = this.dashboard?.edaPanels?.toArray().find(cmp => cmp.panel.id === panelID);
        if (!dashboardPanel) {
            this.spinnerService.off();
            return;
        }
        dashboardPanel.panel.content.query.query.prediction = predictionConfig.method;
        dashboardPanel.panel.content.query.query.predictionConfig = {
            steps: predictionConfig.steps,
            targetColumn: predictionConfig.targetColumn,
            arimaParams: predictionConfig.arimaParams,
            tensorflowParams: predictionConfig.tensorflowParams,
        };

        // Run the query and save the config
        try {
            await dashboardPanel.runQueryFromDashboard(true);
        } finally {
            this.spinnerService.off();
        }
        this.saveChartConfig();
    }

    /** The user canceled the dialog: close it and switch the toggle back to OFF */
    cancelPrediction() {
        this.showPredictionDialog = false;
        this.showPredictionLines = false;
    }

    /**
     * Updates the chart config, writes the type to the panel query,
     * and reruns the query.
     */
    private async applyPrediction(type: string) {
        this.syncCustomFields();
        this.panelChartConfig = new PanelChart(this.panelChartConfig);

        const panelID = this.controller.params.panelId;
        const dashboardPanel = this.dashboard?.edaPanels?.toArray().find(cmp => cmp.panel.id === panelID);
        if (!dashboardPanel) return;
        dashboardPanel.panel.content.query.query.prediction = type;

        await dashboardPanel.runQueryFromDashboard(true);
        this.saveChartConfig();
    }


    // Chart color management methods

    // Get default color by index
    private getDefaultColor(index: number): string {
        const palette = this.stylesProviderService.ActualChartPalette?.['paleta'];
        return palette[index % palette.length];
    }

    // Keeps the live D3 components' native color source (assignedColors, plus categoryColorOverrides
    // for bar's per-category threshold/unique modes) in sync with the dialog's own working state on
    // every edit - the D3 components resolve color/opacity from these fields directly now, no more
    // Chart.js-shaped chartColors/chartDataset intermediate to maintain.
    private applyColorsToChart(): void {
        const type = this.chart['edaChart'];
        const isBar = type === 'bar' || type === 'horizontalBar';

        this.chart.assignedColors = [...this.assignedColors];

        const hasThresholds = this.thresholdHigh !== null || this.thresholdLow !== null;
        if (isBar && this.coloredBarsActive && hasThresholds && this.thresholdsValid && this.chart.chartDataset?.[0]?.data) {
            const bothThresholds = this.thresholdHigh !== null && this.thresholdLow !== null;
            const dataset = this.chart.chartDataset[0];
            const baseColor = this.assignedColors.find(c => c.value === dataset.label)?.color || this.getDefaultColor(0);
            this.chart.categoryColorOverrides = (this.chart.chartLabels || []).map((label: string, idx: number) => {
                const value = dataset.data[idx];
                let color = baseColor;
                if (this.thresholdHigh !== null && value > this.thresholdHigh) color = this.colorAbove;
                else if (this.thresholdLow !== null && value < this.thresholdLow) color = this.colorBelow;
                else if (bothThresholds) color = this.colorBetween;
                return { value: label, color };
            });
        } else if (isBar && this.showUniqueColors && this.uniqueBarColors.length > 0) {
            this.chart.categoryColorOverrides = [...this.uniqueBarColors];
        } else {
            this.chart.categoryColorOverrides = undefined;
        }
    }

    handleUniqueColorInput(): void {
        this.applyColorsToChart();
        this.controller.params.config.config.getConfig()['uniqueBarColors'] = [...this.uniqueBarColors];
        if (this.panelChartComponent?.componentRef?.instance) {
            this.panelChartComponent.componentRef.instance.inject = this.chart;
            this.panelChartComponent.componentRef.instance.updateChart();
        }

        this.updateChartView();
    }

    // Simplified method for color changes
    handleInputColor(): void {
        // Apply assignedColors to the chart
        this.applyColorsToChart();

        // Re-render
        if (this.panelChartComponent?.componentRef?.instance) {
            this.panelChartComponent.componentRef.instance.inject = this.chart;
            this.panelChartComponent.componentRef.instance.updateChart();
        }
        this.updateChartView();

    }

    stepOpacity(idx: number, delta: number): void {
        const current = this.assignedColors[idx].opacity ?? 100;
        this.assignedColors[idx].opacity = Math.min(100, Math.max(0, current + delta));
        this.handleInputColor();
    }

    private updateChartView(): void {
        if (!this.panelChartComponent?.componentRef?.instance) {
            console.error('No hay componentRef disponible');
            return;
        }

        const chartInstance = this.panelChartComponent.componentRef.instance;

        // Update inject and force change detection
        chartInstance.inject = { ...this.chart };

        // Call the component's cheap partial-update method (no full destroy+recreate).
        if (chartInstance.updateChart) {
            chartInstance.updateChart();
        }
    }


    // Apply palette
    onPaletteSelected(): void {
        if (!this.selectedPalette) return;
        const palette = this.selectedPalette.paleta;

        // Always update assignedColors
        this.assignedColors = this.assignedColors.map((item, index) => ({
            value: item.value,
            color: palette[index % palette.length]
        }));

        if (this.showUniqueColors) {
            // Also update uniqueBarColors and apply those colors
            this.uniqueBarColors = this.uniqueBarColors.map((item, index) => ({
                value: item.value,
                color: palette[index % palette.length]
            }));
            this.handleUniqueColorInput();
        } else {
            this.handleInputColor();
        }
    }

    // Traffic-light bar control methods
    get thresholdsValid(): boolean {
        if (!this.coloredBarsActive) return true;
        if (this.thresholdHigh === null || this.thresholdLow === null) return true;
        return this.thresholdHigh >= this.thresholdLow;
    }

    get coloredBarsColumnHeader(): string {
        const numericCol = this.controller?.params?.config?.query?.find((f: any) => f.column_type === 'numeric');
        if (!numericCol) return '';
        return typeof numericCol.display_name === 'object'
            ? (numericCol.display_name.default || numericCol.column_name)
            : (numericCol.display_name || numericCol.column_name);
    }

    applyColoredBars(): void {
        this.syncCustomFields();
        this.handleInputColor();
    }

    applyUseGradient(): void {
        this.syncCustomFields();
        this.chart['useGradient'] = this.useGradient;
        this.handleInputColor();
    }

    applyUseRoundedBars(): void {
        this.syncCustomFields();
        this.chart['useRoundedBars'] = this.useRoundedBars;
        this.handleInputColor();
    }

    // Unique colors only make sense for a single-series bar/horizontalBar chart - when true, the
    // colors tab bar grows a third "Colores Únicos" tab between "Colores" and "Colores por intervalo".
    get showUniqueColorsTab(): boolean {
        return ['bar', 'horizontalBar'].includes(this.chart?.['edaChart'] as string) && this.queryNumericColumns.length === 1;
    }

    // "Colores por intervalo" is always the last tab, whether or not the unique-colors tab is present.
    get intervalTabIndex(): number {
        return this.showUniqueColorsTab ? 2 : 1;
    }

    setActiveTab(index: number): void {
        this.activeTabIndex = index;
        // edaChart, not chartType - chartType is always literally 'bar' for every bar subtype.
        if (!['bar', 'horizontalBar'].includes(this.chart['edaChart'] as string)) return;
        // Which coloring mode is active is now purely a function of which tab is selected - there's
        // no separate on/off switch inside the "Colores Únicos" tab, being on it IS "activated".
        this.coloredBarsActive = index === this.intervalTabIndex;
        this.showUniqueColors = this.showUniqueColorsTab && index === 1;

        this.syncCustomFields();
        this.panelChartConfig = new PanelChart(this.panelChartConfig);
        setTimeout(() => {
            this.chart = this.panelChartComponent.componentRef.instance.inject;
            this.load();
            this.applyColorsToChart();
            this.updateChartView();
        });
    }

    tabButtonClass(index: number): Record<string, boolean> {
        const active = this.activeTabIndex === index;
        return {
            'bg-[var(--corporate-primary)] text-white border-[var(--corporate-primary)]': active,
            'border-transparent hover:bg-gray-200/40': !active
        };
    }

    get isAreaOrRadarChart(): boolean {
        return ['area', 'kpiarea', 'radar'].includes(this.panelChartConfig?.edaChart);
    }

    // Save/cancel configuration methods

    saveChartConfig() {
        // Apply final colors to the live preview
        this.applyColorsToChart();
        this.syncCustomFields();

        // Small typed response - assignedColors + this family's own fields, no Chart.js shape.
        this.onClose(EdaDialogCloseEvent.UPDATE, this.buildCustomFieldsPatch());
    }

    resetChartConfig() {
        // Restore original label values
        this.addTrend = this.originalLabelValues.addTrend;
        this.showLabels = this.originalLabelValues.showLabels;
        this.showLabelsPercent = this.originalLabelValues.showLabelsPercent;
        this.labelColorMode = this.originalLabelValues.labelColorMode;
        this.labelCustomColor = this.originalLabelValues.labelCustomColor;
        this.showUniqueColors = this.originalLabelValues.showUniqueColors;
        this.showPointLines = this.originalLabelValues.showPointLines;
        this.showPredictionLines = this.originalLabelValues.showPredictionLines;
        this.numberOfColumns = this.originalLabelValues.numberOfColumns;
        this.addComparative = this.originalLabelValues.addComparative;
        this.chartLegend = this.originalLabelValues.chartLegend;
        this.showGridLines = this.originalLabelValues.showGridLines;
        this.useGradient = this.originalLabelValues.useGradient;
        this.useRoundedBars = this.originalLabelValues.useRoundedBars;
        this.assignedColors = _.cloneDeep(this.originalAssignedColors);
        this.uniqueBarColors = _.cloneDeep(this.originalUniqueBarColors);

        this.syncCustomFields();
    }

    closeChartConfig() {
        // Restore original colors
        this.resetChartConfig();
        this.applyColorsToChart();
        this.onClose(EdaDialogCloseEvent.NONE);
    }

    onClose(event: EdaDialogCloseEvent, response?: any): void {
        return this.controller.close(event, response);
    }
}
