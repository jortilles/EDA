
import { PanelChartComponent } from './../panel-charts/panel-chart.component';
import { Component, Input, ViewChild } from '@angular/core';
import { PointStyle } from 'chart.js';
import { EdaChart } from '@eda/components/eda-chart/eda-chart';
import { EdaDialog, EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import * as _ from 'lodash';
import { StyleProviderService, ChartUtilsService, AlertService, SpinnerService } from '@eda/services/service.index';
import { PanelChart } from '../panel-charts/panel-chart';
import { ChartConfig } from '../panel-charts/chart-configuration-models/chart-config';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EdaDialog2Component } from '@eda/shared/components/shared-components.index';
import { ColorPickerModule } from 'primeng/colorpicker';
import { TabViewModule } from 'primeng/tabview';
import { InputNumberModule } from 'primeng/inputnumber';
import { PredictionDialogComponent, PredictionConfig, QueryColumn } from '../prediction-dialog/prediction-dialog.component';
import Swal from 'sweetalert2';

@Component({
    standalone: true,
    selector: 'app-chart-dialog',
    templateUrl: './chart-dialog.component.html',
    styleUrls: ['./chart-dialog.component.css'],
    imports: [CommonModule, FormsModule, EdaDialog2Component, PanelChartComponent, ColorPickerModule, PredictionDialogComponent, TabViewModule, InputNumberModule]
})

export class ChartDialogComponent {
    @Input() controller: any;
    @Input() dashboard: any;
    @ViewChild('PanelChartComponent', { static: false }) panelChartComponent: PanelChartComponent;

    public dialog: EdaDialog;
    public activeTabIndex: number = 0;
    public chart: EdaChart;
    public oldChart: EdaChart;
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
    public showUniqueColors: boolean = false;
    public showPointLines: boolean = false;
    public showPredictionLines: boolean = false;
    public chartLegend: boolean = true;
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

    public comparativeTooltip = $localize`:@@comparativeTooltip:La función de comparar sólo se puede activar si se dispone de un campo de fecha agregado por mes o semana y un único campo numérico agregado`
    public trendTooltip = $localize`:@@trendTooltip:La función de añadir tendencia sólo se puede activar en los gràficos de lineas`
    public showLablesTooltip = $localize`:@@showLablesTooltip:Mostrar o ocultar las etiquetas sobre los gráficos`
    public showLablesPercentTooltip = $localize`:@@showLablesPercentTooltip:Mostrar o ocultar las etiquetas en porcentaje sobre los gráficos`
    public columnsTooltip = $localize`:@@columnsTooltip:Elige cuantas columnas quieres mostrar`
    public tooltipBlockedByComparative = $localize`:@@tooltipBlockedByComparative:Bloqueado porque comparativa está activa`
    public tooltipBlockedByTrendOrPrediction = $localize`:@@tooltipBlockedByTrendOrPrediction:Bloqueado porque tendencia o predicción está activa`
    
    // Guardar los valores originales de los labels
    private originalLabelValues: {
        addTrend: boolean;
        showLabels: boolean;
        showLabelsPercent: boolean;
        showUniqueColors: boolean;
        showPointLines: boolean;
        showPredictionLines: boolean;
        numberOfColumns: number;
        addComparative: boolean;
        chartLegend: boolean;
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
        this.showUniqueColors = this.controller.params.config.config.getConfig()['showUniqueColors'] || false;
        this.showPointLines = this.controller.params.config.config.getConfig()['showPointLines'] || false;
        this.showPredictionLines = this.controller.params.config.config.getConfig()['showPredictionLines'] || false;
        this.predictionMethod = this.controller.params.config.config.getConfig()['predictionMethod'] || 'Arima'; // Valor iniciado en el dropdown
        this.numberOfColumns = this.controller.params.config.config.getConfig()['numberOfColumns'] || false;
        this.addComparative = this.controller.params.config.config.getConfig()['addComparative'] || false;
        this.chartLegend = this.controller.params.config.config.getConfig()['chartLegend'] ?? true;

        // NUEVO: Guardar valores originales de labels
        this.originalLabelValues = {
            addTrend: this.addTrend,
            showLabels: this.showLabels,
            showLabelsPercent: this.showLabelsPercent,
            showUniqueColors: this.showUniqueColors,
            showPointLines: this.showPointLines,
            showPredictionLines: this.showPredictionLines,
            numberOfColumns: this.numberOfColumns,
            addComparative: this.addComparative,
            chartLegend: this.chartLegend
        };

        this.oldChart = _.cloneDeep(this.controller.params.chart);
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
                this.activeTabIndex = 1;
                this.applyColorsToChart();
            }
        }
        this.display = true;
    }

    load() {
        this.loadChartTypeProperties();
    }

    loadChartColors() {
        // Recuperar assignedColors guardados en config
        const existingColors = this.controller.params.config.config.getConfig()['assignedColors'] || [];
        // Obtener los labels según el tipo de chart
        const labels = this.getChartLabels();

        // Crear assignedColors mapeando labels a colores
        if (this.chart['edaChart'] === 'histogram') {
            this.assignedColors = labels.map((label, index) => {
                const match = existingColors.find(c => c.value === label);
                return {
                    value: label,
                    color: existingColors[0]?.color,
                };
            });
        } else {
            // Obtener los labels según el tipo de chart
            const labels = this.getChartLabels();
            // Crear assignedColors mapeando labels a colores
            this.assignedColors = labels.map((label, index) => {
                const match = existingColors.find(c => c.value === label);
                return {
                    value: label,
                    color: match?.color || this.getDefaultColor(index),
                    opacity: match?.opacity ?? 100
                };
            });
        }
        
        // Cargar uniqueBarColors desde chartLabels (para barras) — ANTES de applyColorsToChart
        const savedUniqueColors = this.controller.params.config.config.getConfig()['uniqueBarColors'] || [];
        const barLabels: string[] = this.chart.chartLabels || [];
        this.uniqueBarColors = barLabels.map((label, index) => {
            const match = savedUniqueColors.find(c => c.value === label);
            return { value: label, color: match?.color || this.getDefaultColor(index) };
        });

        // Aplicar los colores al chart
        this.applyColorsToChart();

        // Guardar preview para cancelar
        this.originalAssignedColors = _.cloneDeep(this.assignedColors);
        this.originalUniqueBarColors = _.cloneDeep(this.uniqueBarColors);
    }

    loadChartTypeProperties() {
        const type: any = this.chart.chartType;
        switch (type) {

            case 'bar':
                if (_.startsWith(this.chart.chartType, 'bar')) {
                    this.direction = { label: 'Vertical', value: 'bar' };
                }
                break;
            case 'horizontalBar':
                this.direction = { label: 'Horizontal', value: 'horizontalBar' };
                break;
            case 'line':
                this.pointStyle = _.find(this.drops.pointStyles, key =>
                    key.value === _.get(this.chart.chartOptions, 'elements.point.pointStyle')
                );
                break;
            case 'doughnut':
            case 'polarArea':
                break;
        }
    }

    // Obtener labels según tipo de chart
    private getChartLabels(): string[] {
        const type = this.chart['edaChart'];
        
        switch (type) {
            case 'doughnut':
            case 'polarArea':
                return this.chart.chartLabels || [];
                
            default:
                return this.chart.chartDataset?.map(d => d.label) || [];
        }
    }


    // METODOS QUE ACTUALIZAN LA CONFIGURACION DEL GRAFICO

    SetNumberOfColumns() {
        const properties = this.panelChartConfig;
        let c: ChartConfig = properties.config;
        let config: any = c.getConfig();
        config.showLabels = this.showLabels;
        config.showLabelsPercent = this.showLabelsPercent;
        config.showUniqueColors = this.showUniqueColors;
        config.showPointLines = this.showPointLines;
        config.showPredictionLines = this.showPredictionLines;
        config.numberOfColumns = this.numberOfColumns;

        properties.config = c;
        /**Update chart */
        this.panelChartConfig = new PanelChart(this.panelChartConfig);
        setTimeout(_ => {
            this.chart = this.panelChartComponent.componentRef.instance.inject;
            this.load();
        });
    }

    checkTrend() {
        const properties = this.panelChartConfig;
        let c: ChartConfig = properties.config;
        let config: any = c.getConfig();
        config.addTrend = this.addTrend;
        config.numberOfColumns = this.numberOfColumns;

        properties.config = c;
        /**Update chart */
        this.panelChartConfig = new PanelChart(this.panelChartConfig);
        setTimeout(_ => {
            this.chart = this.panelChartComponent.componentRef.instance.inject;
            this.load();
        });
    }

    setComparative() {

        const properties = this.panelChartConfig;
        let c: ChartConfig = properties.config;
        let config: any = c.getConfig();
        config.addComparative = this.addComparative;
        config.numberOfColumns = this.numberOfColumns;
        config.showLabels = this.showLabels;
        config.showLabelsPercent = this.showLabelsPercent;
        config.showUniqueColors = this.showUniqueColors;
        config.showPointLines = this.showPointLines;
        config.showPredictionLines = this.showPredictionLines;

        properties.config = c;
        /**Update chart */
        this.panelChartConfig = new PanelChart(this.panelChartConfig);
        setTimeout(_ => {
            this.chart = this.panelChartComponent.componentRef.instance.inject;
            this.load();
        });

    }


    setShowLablesPercent() {
        const properties = this.panelChartConfig;
        let c: ChartConfig = properties.config;
        let config: any = c.getConfig();
        config.showLabels = this.showLabels;
        config.showLabelsPercent = this.showLabelsPercent;
        config.showUniqueColors = this.showUniqueColors;
        config.showPointLines = this.showPointLines;
        config.showPredictionLines = this.showPredictionLines;
        config.numberOfColumns = this.numberOfColumns;

        properties.config = c;
        /**Update chart */
        this.panelChartConfig = new PanelChart(this.panelChartConfig);
        setTimeout(_ => {
            this.chart = this.panelChartComponent.componentRef.instance.inject;
            this.load();
        });

    }

    setShowUniqueColors() {
        const properties = this.panelChartConfig;
        let c: ChartConfig = properties.config;
        let config: any = c.getConfig();
        config.showLabels = this.showLabels;
        config.showLabelsPercent = this.showLabelsPercent;
        config.showUniqueColors = this.showUniqueColors;
        config.showPointLines = this.showPointLines;
        config.showPredictionLines = this.showPredictionLines;
        config.numberOfColumns = this.numberOfColumns;
        config.uniqueBarColors = [...this.uniqueBarColors];
        this.activeTabIndex = 0;
        this.coloredBarsActive = false;

        properties.config = c;
        /**Update chart */
        this.panelChartConfig = new PanelChart(this.panelChartConfig);
        setTimeout(_ => {
            this.chart = this.panelChartComponent.componentRef.instance.inject;
            this.load();
            this.applyColorsToChart();
            this.updateChartView();
        });

    }

    allowCoparative(params) {

        let monthformat = false;
        const haveDate = params.config.query.filter(field => field.column_type === 'date').length > 0 //there is a date
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

        const properties = this.panelChartConfig;
        let c: ChartConfig = properties.config;
        let config: any = c.getConfig();
        config.showLabels = this.showLabels;
        config.showLabelsPercent = this.showLabelsPercent;
        config.showUniqueColors = this.showUniqueColors;
        config.showPointLines = this.showPointLines;
        config.showPredictionLines = this.showPredictionLines;
        config.numberOfColumns = this.numberOfColumns;

        properties.config = c;
        /**Update chart */
        this.panelChartConfig = new PanelChart(this.panelChartConfig);
        setTimeout(_ => {
            this.chart = this.panelChartComponent.componentRef.instance.inject;
            this.load();
        });

    }

    setChartLegend() {
        const properties = this.panelChartConfig;
        let c: ChartConfig = properties.config;
        let config: any = c.getConfig();
        config.chartLegend = this.chartLegend;
        config.showLabels = this.showLabels;
        config.showLabelsPercent = this.showLabelsPercent;
        config.showUniqueColors = this.showUniqueColors;
        config.showPointLines = this.showPointLines;
        config.showPredictionLines = this.showPredictionLines;
        config.numberOfColumns = this.numberOfColumns;
        
        properties.config = c;
        /**Update chart */
        this.panelChartConfig = new PanelChart(this.panelChartConfig);
        setTimeout(_ => {
            this.chart = this.panelChartComponent.componentRef.instance.inject;
            this.load();
        });
    }

    setShowLines() {
        const properties = this.panelChartConfig;
        let c: ChartConfig = properties.config;
        let config: any = c.getConfig();
        config.showLabels = this.showLabels;
        config.showLabelsPercent = this.showLabelsPercent;
        config.showUniqueColors = this.showUniqueColors;
        config.showPointLines = this.showPointLines;
        config.showPredictionLines = this.showPredictionLines;
        config.numberOfColumns = this.numberOfColumns;

        properties.config = c;
        /**Update chart */
        this.panelChartConfig = new PanelChart(this.panelChartConfig);
        setTimeout(_ => {
            this.chart = this.panelChartComponent.componentRef.instance.inject;
            this.load();
        });
    }

    setPredictionLines() {
        if (this.showPredictionLines) {
            // Toggle ON -> abrir dialog de configuración de predicción
            this.showPredictionDialog = true;
        } else {
            // Toggle OFF -> confirmar con Swal antes de quitar la predicción
            Swal.fire({
                title: $localize`:@@RemovePredictionTitle:¿Quieres quitar la predicción?`,
                text: $localize`:@@RemovePredictionText:Se quitará la predicción y se ejecutará la consulta del gráfico.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
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
                    // Canceló -> volver el switch a ON
                    this.showPredictionLines = true;
                }
            });
        }
    }

    // Devuelve las tablas visibles del modelo de datos del panel.
    get modelTables(): any[] {
        const panelID = this.controller.params.panelId;
        const dashboardPanel = this.dashboard?.edaPanels?.toArray().find(cmp => cmp.panel.id === panelID);
        if (!dashboardPanel?.dataSource?.model?.tables) return [];
        return dashboardPanel.dataSource.model.tables.filter(t => t.visible !== false);
    }

    /** Devuelve las columnas numéricas del query actual para el selector de columna objetivo de TensorFlow */
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

        // Mostrar spinner mientras se ejecuta la predicción
        this.spinnerService.on();

        // Actualizar config del chart
        const properties = this.panelChartConfig;
        let c: ChartConfig = properties.config;
        let config: any = c.getConfig();
        config.showLabels = this.showLabels;
        config.showLabelsPercent = this.showLabelsPercent;
        config.showUniqueColors = this.showUniqueColors;
        config.showPointLines = this.showPointLines;
        config.numberOfColumns = this.numberOfColumns;
        config.showPredictionLines = this.showPredictionLines;

        properties.config = c;
        this.panelChartConfig = new PanelChart(this.panelChartConfig);

        // Setear predicción y configuración en la query del panel
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

        // Ejecutar query y guardar config
        try {
            await dashboardPanel.runQueryFromDashboard(true);
        } finally {
            this.spinnerService.off();
        }
        this.saveChartConfig();
    }

    /** El usuario canceló el diálogo: cierra y vuelve el toggle a OFF */
    cancelPrediction() {
        this.showPredictionDialog = false;
        this.showPredictionLines = false;
    }

    /**
     * Actualiza la config del chart, escribe el tipo en la query del panel
     * y relanza la query.
     */
    private async applyPrediction(type: string) {
        const properties = this.panelChartConfig;
        let c: ChartConfig = properties.config;
        let config: any = c.getConfig();
        config.showLabels = this.showLabels;
        config.showLabelsPercent = this.showLabelsPercent;
        config.showUniqueColors = this.showUniqueColors;
        config.showPointLines = this.showPointLines;
        config.numberOfColumns = this.numberOfColumns;
        config.showPredictionLines = this.showPredictionLines;

        properties.config = c;
        this.panelChartConfig = new PanelChart(this.panelChartConfig);

        const panelID = this.controller.params.panelId;
        const dashboardPanel = this.dashboard?.edaPanels?.toArray().find(cmp => cmp.panel.id === panelID);
        if (!dashboardPanel) return;
        dashboardPanel.panel.content.query.query.prediction = type;

        await dashboardPanel.runQueryFromDashboard(true);
        this.saveChartConfig();
    }


    // METODOS QUE GESTIONAN LOS COLORES DEL GRAFICO

    // Obtener color por defecto según índice
    private getDefaultColor(index: number): string {
        const palette = this.stylesProviderService.ActualChartPalette?.['paleta'];
        return palette[index % palette.length];
    }

    // Aplicar assignedColors al chart según su tipo
    private applyColorsToChart(): void {
        const type = this.chart['edaChart'];
        
        switch (type) {
        case 'doughnut':
        case 'polarArea':
            // Actualizar chartColors
            this.chart.chartColors[0].backgroundColor = this.assignedColors.map(c => c.color);
            this.chart.chartColors[0].borderColor = this.assignedColors.map(c => c.color);
            
            // Actualizar chartDataset 
            if (this.chart.chartDataset && this.chart.chartDataset[0]) {
                this.chart.chartDataset[0] = {
                    ...this.chart.chartDataset[0],
                    backgroundColor: [...this.chart.chartColors[0].backgroundColor],
                    borderColor: [...this.chart.chartColors[0].borderColor]
                };
            }
            break;
                
            case 'histogram':
                if (this.assignedColors.length > 0) {
                    const color = this.assignedColors[0].color;
                    
                    this.chart.chartColors = [{
                        backgroundColor: color,
                        borderColor: color
                    }];
                    
                    if (this.chart.chartDataset?.[0]) {
                        this.chart.chartDataset[0] = {
                            ...this.chart.chartDataset[0],
                            backgroundColor: color,
                            borderColor: color
                        };
                    }
                }
                break;
                
            default: {
                const isBar = (this.chart.chartType as string) === 'bar' || (this.chart.chartType as string) === 'horizontalBar';

                // Colores por intervalo
                const hasThresholds = this.thresholdHigh !== null || this.thresholdLow !== null;
                if (isBar && this.coloredBarsActive && hasThresholds && this.chart.chartDataset?.[0]?.data) {
                    // Si los umbrales no son correctos no haremos cambios
                    if(!this.thresholdsValid) break;
                    // Per-bar coloring based on thresholds
                    const bothThresholds = this.thresholdHigh !== null && this.thresholdLow !== null;
                    const dataset = this.chart.chartDataset[0];
                    const assignedColor = this.assignedColors.find(c => c.value === dataset.label)?.color || this.getDefaultColor(0);
                    const colors = (dataset.data as number[]).map(value => {
                        if (this.thresholdHigh !== null && value > this.thresholdHigh) return this.colorAbove;
                        if (this.thresholdLow !== null && value < this.thresholdLow) return this.colorBelow;
                        return bothThresholds ? this.colorBetween : assignedColor;
                    });
                    this.chart.chartDataset[0] = {
                        ...this.chart.chartDataset[0],
                        backgroundColor: colors,
                        borderColor: colors
                    };
                    this.chart.chartColors = [{ backgroundColor: colors, borderColor: colors }];
                    break;
                }

                // Colores únicos por barra (un color por label/categoría)
                if (isBar && this.showUniqueColors && this.uniqueBarColors.length > 0 && this.chart.chartDataset?.[0]?.data) {
                    const colors = (this.chart.chartDataset[0].data as number[]).map((_, idx) =>
                        this.uniqueBarColors[idx]?.color || this.getDefaultColor(idx)
                    );
                    this.chart.chartDataset[0] = { ...this.chart.chartDataset[0], backgroundColor: colors, borderColor: colors };
                    this.chart.chartColors = [{ backgroundColor: colors, borderColor: colors }];
                    break;
                }

                // Normal: one color per dataset
                const edaChart = this.chart['edaChart'];
                const isAreaOrRadar = ['area', 'kpiarea', 'radar'].includes(edaChart);
                if (this.chart.chartDataset.length > 0 && Array.isArray(this.chart.chartDataset)) {
                    this.chart.chartDataset = this.chart.chartDataset.map((dataset) => {
                        const colorConfig = this.assignedColors.find(c => c.value === dataset.label);
                        if (colorConfig) {
                            const fillColor = isAreaOrRadar ? this.chartUtils.hexToRgba(colorConfig.color, colorConfig.opacity ?? 100) : colorConfig.color;
                            return {
                                ...dataset,
                                backgroundColor: fillColor,
                                borderColor: colorConfig.color,
                                pointBackgroundColor: colorConfig.color,
                            };
                        }
                        return dataset;
                    });
                }

                this.chart.chartColors = this.assignedColors.map(c => ({
                    backgroundColor: isAreaOrRadar ? this.chartUtils.hexToRgba(c.color, c.opacity ?? 100) : c.color,
                    borderColor: c.color,
                    pointBackgroundColor: c.color,
                }));
                break;
            }
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

    // Método simplificado para cambios de color
    handleInputColor(): void {
        // Aplicar assignedColors al chart
        this.applyColorsToChart();

        // Re-renderizar
        if (this.panelChartComponent?.componentRef?.instance) {
            this.panelChartComponent.componentRef.instance.inject = this.chart;
            this.panelChartComponent.componentRef.instance.updateChart();
        }
        this.updateChartView();

    }

    private updateChartView(): void {
        if (!this.panelChartComponent?.componentRef?.instance) {
            console.error('No hay componentRef disponible');
            return;
        }

        const chartInstance = this.panelChartComponent.componentRef.instance;
        const type = this.chart['edaChart'];
        

        // Actualizar inject y forzar detección de cambios
        chartInstance.inject = { ...this.chart };
        
        //  Actualizar directamente el chart de Chart.js
        if (chartInstance.edaChart?.chart) {
            const chartJs = chartInstance.edaChart.chart;
            
            switch (type) {
                case 'doughnut':
                case 'polarArea':
                    // Para doughnut/polarArea, actualizar el dataset
                    if (chartJs.data.datasets[0]) {
                        chartJs.data.datasets[0].backgroundColor = this.chart.chartColors[0].backgroundColor;
                        chartJs.data.datasets[0].borderColor = this.chart.chartColors[0].borderColor;
                    }
                    break;
                    
                default:
                    // Para otros charts, actualizar cada dataset
                    this.chart.chartDataset.forEach((dataset, index) => {
                        if (chartJs.data.datasets[index]) {
                            chartJs.data.datasets[index].backgroundColor = dataset.backgroundColor;
                            chartJs.data.datasets[index].borderColor = dataset.borderColor;
                            (chartJs.data.datasets[index] as any).pointBackgroundColor = (dataset as any).pointBackgroundColor;
                        }
                    });
                    break;
            }
            
            // Forzar actualización
            chartJs.update(); 
        }
        
        // Llamar al método updateChart del componente
        if (chartInstance.updateChart) {
            chartInstance.updateChart();
        }
    }


    // Aplicar paleta
    onPaletteSelected(): void {
        if (!this.selectedPalette) return;
        const palette = this.selectedPalette.paleta;

        // Siempre actualizar assignedColors
        this.assignedColors = this.assignedColors.map((item, index) => ({
            value: item.value,
            color: palette[index % palette.length]
        }));

        if (this.showUniqueColors) {
            // También actualizar uniqueBarColors y aplicar esos colores
            this.uniqueBarColors = this.uniqueBarColors.map((item, index) => ({
                value: item.value,
                color: palette[index % palette.length]
            }));
            this.handleUniqueColorInput();
        } else {
            this.handleInputColor();
        }
    }

    // METODOS DE CONTROL DE BARRAS SEMAFORICAS
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
        this.controller.params.config.config.getConfig()['coloredBarsConfig'] = {
            thresholdHigh: this.thresholdHigh,
            thresholdLow: this.thresholdLow,
            colorAbove: this.colorAbove,
            colorBetween: this.colorBetween,
            colorBelow: this.colorBelow,
            active: this.coloredBarsActive
        };
        this.handleInputColor();
    }

    onTabChange(event: any): void {

        if ((this.chart.chartType as string) !== 'bar') return;
        this.coloredBarsActive = event.index === 1;
        this.handleInputColor();
    }

    get isAreaOrRadarChart(): boolean {
        return ['area', 'kpiarea', 'radar'].includes(this.panelChartConfig?.edaChart);
    }

    // METODOS DE GUARDAR/CANCELAR CONFIGURACION

    saveChartConfig() {
        // Aplicar colores finales
        this.applyColorsToChart();
        
        // Guardar assignedColors en config y chart
        this.chart['assignedColors'] = [...this.assignedColors];
        this.controller.params.config.config.getConfig()['assignedColors'] = [...this.assignedColors];
        this.chart['uniqueBarColors'] = [...this.uniqueBarColors];
        this.controller.params.config.config.getConfig()['uniqueBarColors'] = [...this.uniqueBarColors];

        // Guardar otras opciones
        this.chart.addTrend = this.addTrend;
        this.chart.addComparative = this.addComparative;
        this.chart.showLabels = this.showLabels;
        this.chart.showLabelsPercent = this.showLabelsPercent;
        this.chart.showUniqueColors = this.showUniqueColors;
        this.chart.showPointLines = this.showPointLines;
        this.chart.showPredictionLines = this.showPredictionLines;
        this.chart.numberOfColumns = this.numberOfColumns;
        this.chart.chartLegend = this.chartLegend;

        // Guardar en config también (para persistencia)
        this.controller.params.config.config.getConfig()['addTrend'] = this.addTrend;
        this.controller.params.config.config.getConfig()['showLabels'] = this.showLabels;
        this.controller.params.config.config.getConfig()['showLabelsPercent'] = this.showLabelsPercent;
        this.controller.params.config.config.getConfig()['showUniqueColors'] = this.showUniqueColors;
        this.controller.params.config.config.getConfig()['showPointLines'] = this.showPointLines;
        this.controller.params.config.config.getConfig()['showPredictionLines'] = this.showPredictionLines;
        this.controller.params.config.config.getConfig()['predictionMethod'] = this.predictionMethod;
        this.controller.params.config.config.getConfig()['numberOfColumns'] = this.numberOfColumns;
        this.controller.params.config.config.getConfig()['addComparative'] = this.addComparative;
        this.controller.params.config.config.getConfig()['chartLegend'] = this.chartLegend;

        // Guardar config de colored bars
        const coloredBarsConfig = {
            thresholdHigh: this.thresholdHigh,
            thresholdLow: this.thresholdLow,
            colorAbove: this.colorAbove,
            colorBetween: this.colorBetween,
            colorBelow: this.colorBelow,
            active: this.coloredBarsActive
        };
        this.controller.params.config.config.getConfig()['coloredBarsConfig'] = coloredBarsConfig;
        this.chart['coloredBarsConfig'] = coloredBarsConfig;

        this.onClose(EdaDialogCloseEvent.UPDATE, this.chart);
    }

    resetChartConfig() {
        // Restaurar valores originales de labels
        this.addTrend = this.originalLabelValues.addTrend;
        this.showLabels = this.originalLabelValues.showLabels;
        this.showLabelsPercent = this.originalLabelValues.showLabelsPercent;
        this.showUniqueColors = this.originalLabelValues.showUniqueColors;
        this.showPointLines = this.originalLabelValues.showPointLines;
        this.showPredictionLines = this.originalLabelValues.showPredictionLines;
        this.numberOfColumns = this.originalLabelValues.numberOfColumns;
        this.addComparative = this.originalLabelValues.addComparative;
        this.chartLegend = this.originalLabelValues.chartLegend;

        // Restaurar en config
        this.controller.params.config.config.getConfig()['addTrend'] = this.originalLabelValues.addTrend;
        this.controller.params.config.config.getConfig()['showLabels'] = this.originalLabelValues.showLabels;
        this.controller.params.config.config.getConfig()['showLabelsPercent'] = this.originalLabelValues.showLabelsPercent;
        this.controller.params.config.config.getConfig()['showUniqueColors'] = this.originalLabelValues.showUniqueColors;
        this.controller.params.config.config.getConfig()['showPointLines'] = this.originalLabelValues.showPointLines;
        this.controller.params.config.config.getConfig()['showPredictionLines'] = this.originalLabelValues.showPredictionLines;
        this.controller.params.config.config.getConfig()['numberOfColumns'] = this.originalLabelValues.numberOfColumns;
        this.controller.params.config.config.getConfig()['addComparative'] = this.originalLabelValues.addComparative;
        this.controller.params.config.config.getConfig()['chartLegend'] = this.originalLabelValues.chartLegend;
        this.controller.params.config.config.getConfig()['assignedColors'] = this.assignedColors = _.cloneDeep(this.originalAssignedColors);
        this.controller.params.config.config.getConfig()['uniqueBarColors'] = this.uniqueBarColors = _.cloneDeep(this.originalUniqueBarColors);
    }

    closeChartConfig() {
        // Restaurar colores originales
        this.resetChartConfig();
        this.applyColorsToChart();
        this.onClose(EdaDialogCloseEvent.NONE, this.oldChart);
    }

    onClose(event: EdaDialogCloseEvent, response?: any): void {
        return this.controller.close(event, response);
    }
}
