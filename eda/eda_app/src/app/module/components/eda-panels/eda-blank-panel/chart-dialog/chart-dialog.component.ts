
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
import { PredictionDialogComponent } from '../prediction-dialog/prediction-dialog.component';
import Swal from 'sweetalert2';

@Component({
    standalone: true,
    selector: 'app-chart-dialog',
    templateUrl: './chart-dialog.component.html',
    imports: [CommonModule, FormsModule, EdaDialog2Component, PanelChartComponent, ColorPickerModule, PredictionDialogComponent]
})

export class ChartDialogComponent {
    @Input() controller: any;
    @Input() dashboard: any;
    @ViewChild('PanelChartComponent', { static: false }) panelChartComponent: PanelChartComponent;

    public dialog: EdaDialog;
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
    public showPointLines: boolean = false;
    public showPredictionLines: boolean = false;
    public showPredictionDialog: boolean = false;
    public predictionMethod: string = 'Arima';
    public selectedPalette: { name: string; paleta: any } | null = null;
    public allPalettes: any = this.stylesProviderService.ChartsPalettes;
    public assignedColors: { value: string; color: string }[] = [];
    private originalAssignedColors: { value: string; color: string }[] = [];

    public comparativeTooltip = $localize`:@@comparativeTooltip:La función de comparar sólo se puede activar si se dispone de un campo de fecha agregado por mes o semana y un único campo numérico agregado`
    public trendTooltip = $localize`:@@trendTooltip:La función de añadir tendencia sólo se puede activar en los gràficos de lineas`
    public showLablesTooltip = $localize`:@@showLablesTooltip:Mostrar o ocultar las etiquetas sobre los gráficos`
    public showLablesPercentTooltip = $localize`:@@showLablesPercentTooltip:Mostrar o ocultar las etiquetas en porcentaje sobre los gráficos`
    public columnsTooltip = $localize`:@@columnsTooltip:Elige cuantas columnas quieres mostrar`
    
    // Guardar los valores originales de los labels
    private originalLabelValues: {
        addTrend: boolean;
        showLabels: boolean;
        showLabelsPercent: boolean;
        showPointLines: boolean;
        showPredictionLines: boolean;
        numberOfColumns: number;
        addComparative: boolean;
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

    activeTab = "display"

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

    setActiveTab(tab: string): void {
        this.activeTab = tab
    }

    ngOnInit(): void {
        this.panelChartConfig = this.controller.params.config;
        this.addTrend = this.controller.params.config.config.getConfig()['addTrend'] || false;
        this.showLabels = this.controller.params.config.config.getConfig()['showLabels'] || false;
        this.showLabelsPercent = this.controller.params.config.config.getConfig()['showLabelsPercent'] || false;
        this.showPointLines = this.controller.params.config.config.getConfig()['showPointLines'] || false;
        this.showPredictionLines = this.controller.params.config.config.getConfig()['showPredictionLines'] || false;
        this.predictionMethod = this.controller.params.config.config.getConfig()['predictionMethod'] || 'Arima'; // Valor iniciado en el dropdown
        this.numberOfColumns = this.controller.params.config.config.getConfig()['numberOfColumns'] || false;
        this.addComparative = this.controller.params.config.config.getConfig()['addComparative'] || false;

        // NUEVO: Guardar valores originales de labels
        this.originalLabelValues = {
            addTrend: this.addTrend,
            showLabels: this.showLabels,
            showLabelsPercent: this.showLabelsPercent,
            showPointLines: this.showPointLines,
            showPredictionLines: this.showPredictionLines,
            numberOfColumns: this.numberOfColumns,
            addComparative: this.addComparative
        };

        this.oldChart = _.cloneDeep(this.controller.params.chart);
        this.chart = this.controller.params.chart;
        this.showTrend = this.chart.chartType === 'line';
        this.showNumberOfColumns = this.controller.params.chart.edaChart === 'histogram';
        this.showComparative = this.allowCoparative(this.controller.params);
        this.load();
        this.loadChartColors();
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
                    color: match?.color || this.getDefaultColor(index)
                };
            });
        }
        
        // Aplicar los colores al chart
        this.applyColorsToChart();
        
        // Guardar preview para cancelar
        this.originalAssignedColors = _.cloneDeep(this.assignedColors);
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

    allowCoparative(params) {

        let monthformat = false;
        const haveDate = params.config.query.filter(field => field.column_type === 'date').length > 0 //there is a date
        if (haveDate) {
            monthformat = ['month', 'week'].includes(params.config.query.filter(field => field.column_type === 'date')[0].format);
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

    async confirmPrediction(selectedMethod: string) {
        this.showPredictionDialog = false;
        this.predictionMethod = selectedMethod;

        // Mostrar spinner mientras se ejecuta la preddción
        this.spinnerService.on();

        // Actualizar config del chart
        const properties = this.panelChartConfig;
        let c: ChartConfig = properties.config;
        let config: any = c.getConfig();
        config.showLabels = this.showLabels;
        config.showLabelsPercent = this.showLabelsPercent;
        config.showPointLines = this.showPointLines;
        config.numberOfColumns = this.numberOfColumns;
        config.showPredictionLines = this.showPredictionLines;

        properties.config = c;
        this.panelChartConfig = new PanelChart(this.panelChartConfig);

        // Setear predicción en la query del panel
        const panelID = this.controller.params.panelId;
        const dashboardPanel = this.dashboard.edaPanels.toArray().find(cmp => cmp.panel.id === panelID);
        dashboardPanel.panel.content.query.query.prediction = this.predictionMethod;

        // Ejecutar query y guardar config
        await dashboardPanel.runQueryFromDashboard(true);
        // retiramos el spinner cuando tenemos el calculo acabado
        this.spinnerService.off();
        this.saveChartConfig();
    }

    cancelPrediction() {
        this.showPredictionDialog = false;
        this.showPredictionLines = false;
    }

    private async applyPrediction(type: string) {
        const properties = this.panelChartConfig;
        let c: ChartConfig = properties.config;
        let config: any = c.getConfig();
        config.showLabels = this.showLabels;
        config.showLabelsPercent = this.showLabelsPercent;
        config.showPointLines = this.showPointLines;
        config.numberOfColumns = this.numberOfColumns;
        config.showPredictionLines = this.showPredictionLines;

        properties.config = c;
        this.panelChartConfig = new PanelChart(this.panelChartConfig);

        const panelID = this.controller.params.panelId;
        const dashboardPanel = this.dashboard.edaPanels.toArray().find(cmp => cmp.panel.id === panelID);
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
                
            default:
                // Bar, Line, Radar, Stacked, etc.
                if (this.chart.chartDataset.length > 0 && Array.isArray(this.chart.chartDataset)) {
                    this.chart.chartDataset = this.chart.chartDataset.map((dataset) => {
                        // Buscar el color correspondiente al label de este dataset
                        const colorConfig = this.assignedColors.find(c => c.value === dataset.label);
                        
                        if (colorConfig) {
                            return {
                                ...dataset,
                                backgroundColor: colorConfig.color,
                                borderColor: colorConfig.color,
                                pointBackgroundColor: colorConfig.color,
                                pointBorderColor: colorConfig.color
                            };
                        }
                        return dataset;
                    });
                }
                
                // Actualizar chartColors
                this.chart.chartColors = this.assignedColors.map(c => ({
                    backgroundColor: c.color,
                    borderColor: c.color,
                    pointBackgroundColor: c.color,
                    pointBorderColor: c.color
                }));
                
                break;
        }
    }

    // Método simplificado para cambios de color
    handleInputColor(): void {
        // Aplicar assignedColors al chart
        this.applyColorsToChart();

        // Guardar los colores en el config para que persistan cuando se recargue el chart
        this.controller.params.config.config.getConfig()['assignedColors'] = [...this.assignedColors];

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
        const numColors = this.assignedColors.length;
        
        // Generar colores interpolados de la paleta
        const newColors: string[] = [];
        for (let i = 0; i < numColors; i++) {
        newColors.push(palette[i % palette.length]);
        }
            
        // Actualizar assignedColors
        this.assignedColors = this.assignedColors.map((item, index) => ({
            value: item.value,
            color: newColors[index]
        }));
        // Aplicar y re-renderizar
        this.handleInputColor();
        const properties = this.panelChartConfig;
        let c: ChartConfig = properties.config;    
    }

    // METODOS DE GUARDAR/CANCELAR CONFIGURACION

    saveChartConfig() {
        // Aplicar colores finales
        this.applyColorsToChart();
        
        // Guardar assignedColors en config y chart
        this.chart['assignedColors'] = [...this.assignedColors];
        this.controller.params.config.config.getConfig()['assignedColors'] = [...this.assignedColors];

        // Guardar otras opciones
        this.chart.addTrend = this.addTrend;
        this.chart.addComparative = this.addComparative;
        this.chart.showLabels = this.showLabels;
        this.chart.showLabelsPercent = this.showLabelsPercent;
        this.chart.showPointLines = this.showPointLines;
        this.chart.showPredictionLines = this.showPredictionLines;
        this.chart.numberOfColumns = this.numberOfColumns;
        
        // Guardar en config también (para persistencia)
        this.controller.params.config.config.getConfig()['addTrend'] = this.addTrend;
        this.controller.params.config.config.getConfig()['showLabels'] = this.showLabels;
        this.controller.params.config.config.getConfig()['showLabelsPercent'] = this.showLabelsPercent;
        this.controller.params.config.config.getConfig()['showPointLines'] = this.showPointLines;
        this.controller.params.config.config.getConfig()['showPredictionLines'] = this.showPredictionLines;
        this.controller.params.config.config.getConfig()['predictionMethod'] = this.predictionMethod;
        this.controller.params.config.config.getConfig()['numberOfColumns'] = this.numberOfColumns;
        this.controller.params.config.config.getConfig()['addComparative'] = this.addComparative;

        this.onClose(EdaDialogCloseEvent.UPDATE, this.chart);
    }

    resetChartConfig() {
        // Restaurar valores originales de labels
        this.addTrend = this.originalLabelValues.addTrend;
        this.showLabels = this.originalLabelValues.showLabels;
        this.showLabelsPercent = this.originalLabelValues.showLabelsPercent;
        this.showPointLines = this.originalLabelValues.showPointLines;
        this.showPredictionLines = this.originalLabelValues.showPredictionLines;
        this.numberOfColumns = this.originalLabelValues.numberOfColumns;
        this.addComparative = this.originalLabelValues.addComparative;
        
        // Restaurar en config
        this.controller.params.config.config.getConfig()['addTrend'] = this.originalLabelValues.addTrend;
        this.controller.params.config.config.getConfig()['showLabels'] = this.originalLabelValues.showLabels;
        this.controller.params.config.config.getConfig()['showLabelsPercent'] = this.originalLabelValues.showLabelsPercent;
        this.controller.params.config.config.getConfig()['showPointLines'] = this.originalLabelValues.showPointLines;
        this.controller.params.config.config.getConfig()['showPredictionLines'] = this.originalLabelValues.showPredictionLines;
        this.controller.params.config.config.getConfig()['numberOfColumns'] = this.originalLabelValues.numberOfColumns;
        this.controller.params.config.config.getConfig()['addComparative'] = this.originalLabelValues.addComparative;
        this.controller.params.config.config.getConfig()['assignedColors'] = this.assignedColors = _.cloneDeep(this.originalAssignedColors);
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
