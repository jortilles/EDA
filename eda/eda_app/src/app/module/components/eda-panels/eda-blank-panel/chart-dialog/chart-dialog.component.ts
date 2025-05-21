
import { PanelChartComponent } from './../panel-charts/panel-chart.component';
import { Component, ViewChild } from '@angular/core';
import { PointStyle } from 'chart.js';
import { EdaChart } from '@eda/components/eda-chart/eda-chart';
import { EdaDialog, EdaDialogCloseEvent, EdaDialogAbstract } from '@eda/shared/components/shared-components.index';
import * as _ from 'lodash';
import { ChartUtilsService, StyleProviderService } from '@eda/services/service.index';
import { PanelChart } from '../panel-charts/panel-chart';
import { ChartConfig } from '../panel-charts/chart-configuration-models/chart-config';


@Component({
    selector: 'app-chart-dialog',
    templateUrl: './chart-dialog-v2.component.html'
})

export class ChartDialogComponent extends EdaDialogAbstract  {

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
    public selectedPalette: string = this.stylesProviderService.DEFAULT_PALETTE_COLOR;
    public allPalettes: any = this.stylesProviderService.ChartsPalettes;

    public comparativeTooltip = $localize`:@@comparativeTooltip:La función de comparar sólo se puede activar si se dispone de un campo de fecha agregado por mes o semana y un único campo numérico agregado`
    public trendTooltip = $localize`:@@trendTooltip:La función de añadir tendencia sólo se puede activar en los gràficos de lineas`
    public showLablesTooltip = $localize`:@@showLablesTooltip:Mostrar o ocultar las etiquetas sobre los gráficos`
    public showLablesPercentTooltip = $localize`:@@showLablesPercentTooltip:Mostrar o ocultar las etiquetas en porcentaje sobre los gráficos`
    public columnsTooltip = $localize`:@@columnsTooltip:Elige cuantas columnas quieres mostrar`
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

    public series: any[] = [];
    public id: any;

    activeTab = "display"

    constructor(private chartUtils: ChartUtilsService, private stylesProviderService: StyleProviderService) {
        super();
        this.dialog = new EdaDialog({
            show: () => this.onShow(),
            hide: () => this.onClose(EdaDialogCloseEvent.NONE),
            title: $localize`:@@ChartProps:PROPIEDADES DEL GRAFICO`
        });

        this.dialog.style = { width: '80%', height: '70%', top:"-4em", left:'1em'};

  
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

    onShow(): void {
        this.panelChartConfig = this.controller.params.config;
        this.addTrend = this.controller.params.config.config.getConfig()['addTrend'] || false;
        this.showLabels = this.controller.params.config.config.getConfig()['showLabels'] || false;
        this.showLabelsPercent = this.controller.params.config.config.getConfig()['showLabelsPercent'] || false;
        this.numberOfColumns = this.controller.params.config.config.getConfig()['numberOfColumns'] ||false;
        this.addComparative = this.controller.params.config.config.getConfig()['addComparative'] || false;
        this.oldChart = _.cloneDeep(this.controller.params.chart);
        this.chart = this.controller.params.chart;
        this.showTrend = this.chart.chartType === 'line';
        this.showNumberOfColumns =  this.controller.params.chart.edaChart ==='histogram';
        this.showComparative =  this.allowCoparative(this.controller.params);
        this.load();
        this.display = true;
     }



    load() {
        this.loadChartTypeProperties();
        this.loadChartColors();
    }

    loadChartColors() {
        const type = this.chart.chartType;
        switch (type) {
            case 'doughnut':
            case 'polarArea':
                if (this.chart.chartLabels) {
                    this.series = this.chart.chartLabels.map((c, inx) => ({
                        label: c,
                        bg: (this.chart.chartColors[inx])
                    }));
                }
                break;
            default:
                this.series = this.chart.chartDataset.map(dataset => ({
                    label: dataset.label,
                    bg: this.rgb2hex(dataset.backgroundColor),
                    border: dataset.borderColor
                }));
                this.chart.chartColors = this.series.map(s => ({ backgroundColor: this.hex2rgb(s.bg, 90), borderColor: s.border }));
                break;
        }
    }

    handleInputColor(event: any) {
        let inputHexColor: string;
        const rawColorValue = event.bg['backgroundColor'];
        
        // Recuperar bgC
        if (typeof rawColorValue === 'string') {
            if (rawColorValue.startsWith('#')) {// Ya es HEX
                inputHexColor = rawColorValue; 
            } else if (rawColorValue.startsWith('rgb')) { // Es una cadena RGBA/RGB
                inputHexColor = this.chartUtils.rgbaToHex(rawColorValue); 
            } 
        } else if (Array.isArray(rawColorValue) && rawColorValue.length > 0) {
            let firstElement = rawColorValue[0];
            if (typeof firstElement === 'string') {
                if (firstElement.startsWith('#')) { inputHexColor = firstElement; }
                else if (firstElement.startsWith('rgb')) { inputHexColor = this.chartUtils.rgbaToHex(firstElement); } // Usar chartUtils.rgbaToHex
                else { inputHexColor = '#000000'; }
            } 
        } else { inputHexColor = '#000000'; }
    
        if (this.chart.chartDataset) {
            // Crear una nueva referencia para el array chartDataset para detección de cambios profunda
            const newDatasets = this.chart.chartDataset.map((dataset: any) => ({ ...dataset })); 
    
            for (let i = 0, n = newDatasets.length; i < n; i += 1) {
                const datasetToUpdate = newDatasets[i];
    
                if (datasetToUpdate.label === event.label) {
                    datasetToUpdate.backgroundColor = this.chartUtils.hexToRgbaString(inputHexColor, 90);
                    datasetToUpdate.borderColor = this.chartUtils.hexToRgbaString(inputHexColor, 100);
                    
                    // Actualizar this.chart.chartColors para consistencia
                    if (this.chart.chartColors && this.chart.chartColors[i]) {
                        this.chart.chartColors[i] = { backgroundColor: datasetToUpdate.backgroundColor, borderColor: datasetToUpdate.borderColor };
                    } else if (this.chart.chartColors) {
                        this.chart.chartColors[i] = { backgroundColor: datasetToUpdate.backgroundColor, borderColor: datasetToUpdate.borderColor };
                    }
                    
                } else {
                    if (_.isArray(datasetToUpdate.backgroundColor)) { // O usar Array.isArray(datasetToUpdate.backgroundColor)
                        let mutableBgArray = [...datasetToUpdate.backgroundColor];
                        let mutableBorderArray = [...datasetToUpdate.borderColor];
    
                        if (this.chart.chartLabels) {
                            const labels = this.chart.chartLabels;
                            for (let label of labels) {
                                let inx = labels.indexOf(label);
                                if (label === event.label && inx > -1) {
                                    // Usar chartUtils.hexToRgbaString
                                    mutableBgArray[inx] = this.chartUtils.hexToRgbaString(inputHexColor, 90);
                                    mutableBorderArray[inx] = this.chartUtils.hexToRgbaString(inputHexColor, 100);
                                    
                                    if (this.chart.chartColors && this.chart.chartColors[0] && Array.isArray(this.chart.chartColors[0].backgroundColor)) {
                                        // Usar chartUtils.hexToRgbaString
                                        this.chart.chartColors[0].backgroundColor[inx] = this.chartUtils.hexToRgbaString(inputHexColor, 90);
                                        if (Array.isArray(this.chart.chartColors[0].borderColor)) {
                                            this.chart.chartColors[0].borderColor[inx] = this.chartUtils.hexToRgbaString(inputHexColor, 100);
                                        }
                                    }
                                }
                            }
                        }
                        datasetToUpdate.backgroundColor = mutableBgArray;
                        datasetToUpdate.borderColor = mutableBorderArray;
    
                    }
                }
                newDatasets[i] = datasetToUpdate;
            }
            this.chart.chartDataset = newDatasets;
        } else { // Si this.chart.chartDataset es falso (para gráficos de una sola serie)
            if (this.chart.chartLabels) {
                const labels = this.chart.chartLabels;
                let currentBgColor = this.chart.chartColors[0].backgroundColor;
                this.chart.chartColors[0].backgroundColor = Array(labels.length).fill(currentBgColor);
    
                for (let i = 0, n = labels.length; i < n; i += 1) {
                    if (labels[i] === event.label) {
                        this.chart.chartColors[0].backgroundColor[i] = this.chartUtils.hexToRgbaString(inputHexColor, 90);
                        this.chart.chartColors[0].borderColor[i] = this.chartUtils.hexToRgbaString(inputHexColor, 100);
                    }
                }
            }
        }
        this.chart = { ...this.chart }; // Crea una nueva referencia para this.chart
        this.panelChartComponent.componentRef.instance.inject = this.chart;
        this.panelChartComponent.componentRef.instance.updateChart();
    }
    
    onPaletteSelected() { 
        const numberOfColors = this.chart.chartLabels?.length ? this.chart.chartLabels.length :
            this.chart.chartDataset[0]?.data?.length || this.chart.chartDataset.length;
                
        const originalServicePalette = this.chartUtils.MyPaletteColors; 
        // Recuperamos paleta actual y creamos colores
        this.chartUtils.MyPaletteColors = this.selectedPalette['paleta']; 
        const newColors = this.chartUtils.generateColors(this.chart.chartType,numberOfColors);
        
        this.chartUtils.MyPaletteColors = originalServicePalette; 
        const targetDataset = this.chart.chartDataset[0];

        let mutableBackgroundColors: string[] = Array.isArray(targetDataset.backgroundColor)
            ? [...targetDataset.backgroundColor]
            : Array(numberOfColors).fill(null); 

        for (let i = 0; i < numberOfColors; i++) {
            if (newColors[i]) {
                mutableBackgroundColors[i] = newColors[i].backgroundColor;
                mutableBackgroundColors[i] = newColors[i].borderColor;
            }
        }

        targetDataset.backgroundColor = mutableBackgroundColors;
        targetDataset.borderColor = mutableBackgroundColors;
    
        this.chart.chartColors = newColors;
    
        // Actualizar los color pickers individuales al modificar la paleta
        if (this.chart.chartLabels && Array.isArray(this.chart.chartLabels) &&
            this.chart.chartColors && Array.isArray(this.chart.chartColors)) {
            this.series = this.chart.chartLabels.map((label: string, index: number) => {
                const chartColor = this.chart.chartColors[index];
                return {
                    label: label,
                    bg: {
                        backgroundColor: chartColor?.backgroundColor,
                        borderColor: chartColor?.borderColor,
                    }
                };
            });
        }
        this.chart = { ...this.chart }; // Esto hace que el chart del dialog se modifique visualmente?
        this.panelChartComponent.componentRef.instance.inject = this.chart;
        this.panelChartComponent.componentRef.instance.updateChart();
    }

    SetNumberOfColumns(){
        const properties = this.panelChartConfig;
        let c: ChartConfig = properties.config;
        let config: any = c.getConfig();
        config.showLabels = this.showLabels;
        config.showLabelsPercent = this.showLabelsPercent;
        config.numberOfColumns = this.numberOfColumns;
        config.colors = this.chart.chartColors;
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
        config.colors = this.chart.chartColors;
        config.numberOfColumns = this.numberOfColumns;
        properties.config = c;
        /**Update chart */
        this.panelChartConfig = new PanelChart(this.panelChartConfig);
        setTimeout(_ => {
            this.chart = this.panelChartComponent.componentRef.instance.inject;
            this.load();
        });
    }

    setComparative(){

        const properties = this.panelChartConfig;
        let c: ChartConfig = properties.config;
        let config: any = c.getConfig();
        config.addComparative = this.addComparative;
        config.colors = this.chart.chartColors;
        config.numberOfColumns = this.numberOfColumns;
        config.showLabels = this.showLabels;
        config.showLabelsPercent = this.showLabelsPercent;
        properties.config = c;
        /**Update chart */
        this.panelChartConfig = new PanelChart(this.panelChartConfig);
        setTimeout(_ => {
            this.chart = this.panelChartComponent.componentRef.instance.inject;
            this.load();
        });

    }


    setShowLablesPercent(){

        const properties = this.panelChartConfig;
        let c: ChartConfig = properties.config;
        let config: any = c.getConfig();
        config.showLabels = this.showLabels;
        config.showLabelsPercent = this.showLabelsPercent;
        config.numberOfColumns = this.numberOfColumns;
        config.colors = this.chart.chartColors;
        properties.config = c;
        /**Update chart */
        this.panelChartConfig = new PanelChart(this.panelChartConfig);
        setTimeout(_ => {
            this.chart = this.panelChartComponent.componentRef.instance.inject;
            this.load();
        });

    }
    
    setShowLables(){

        const properties = this.panelChartConfig;
        let c: ChartConfig = properties.config;
        let config: any = c.getConfig();
        config.showLabels = this.showLabels;
        config.showLabelsPercent = this.showLabelsPercent;
        config.numberOfColumns = this.numberOfColumns;
        config.colors = this.chart.chartColors;
        properties.config = c;
        /**Update chart */
        this.panelChartConfig = new PanelChart(this.panelChartConfig);
        setTimeout(_ => {
            this.chart = this.panelChartComponent.componentRef.instance.inject;
            this.load();
        });

    }



    rgb2hex(rgb): string {
        rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
        return (rgb && rgb.length === 4) ? '#' +
            ('0' + parseInt(rgb[1], 10).toString(16)).slice(-2) +
            ('0' + parseInt(rgb[2], 10).toString(16)).slice(-2) +
            ('0' + parseInt(rgb[3], 10).toString(16)).slice(-2) : '';
    }

    hex2rgb(hex, opacity = 100): string {
        hex = hex.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        return 'rgba(' + r + ',' + g + ',' + b + ',' + opacity / 100 + ')';
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

    uniformizeStyle() {
        if (this.chart.chartDataset) {
            const newDatasets = [];
            const dataset = this.chart.chartDataset;
            for (let i = 0, n = dataset.length; i < n; i += 1) {

               // dataset[i].hoverBackgroundColor = this.chart.chartColors[i].backgroundColor;
                //dataset[i].hoverBorderColor = 'rgb(255,255,255)';
                dataset[i].backgroundColor = this.chart.chartColors[i].backgroundColor;
                dataset[i].borderColor = this.chart.chartColors[i].backgroundColor;
                this.chart.chartColors[i] = _.pick(dataset[i], [  'backgroundColor', 'borderColor']);

                newDatasets.push(dataset[i]);
            }
            this.chart.chartDataset = newDatasets;
            this.panelChartComponent.componentRef.instance.inject = this.chart;
        }
    }

    allowCoparative(params){

        let monthformat = false;
        const haveDate = params.config.query.filter(field => field.column_type === 'date').length > 0 //there is a date
        if(haveDate){
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

    onChangeDirection() {
    }

    onChangePointStyles(newStyle: PointStyle) {
        this.pointStyle = _.find(this.drops.pointStyles, o => o.value = newStyle);
        this.chart.chartOptions.elements.point.pointStyle = newStyle;

    }

    onChangeGridLines() {

    }

    onChangeStacked() {

    }

    //On save update styles and send current state
    saveChartConfig() {
        this.uniformizeStyle();
        this.chart.addTrend = this.addTrend;
        this.chart.addComparative = this.addComparative;
        this.chart.showLabels = this.showLabels;
        this.chart.showLabelsPercent = this.showLabelsPercent;
        this.chart.numberOfColumns = this.numberOfColumns;
        this.onClose(EdaDialogCloseEvent.UPDATE, this.chart);

    }

    //On cancel send prev state
    closeChartConfig() {
        this.onClose(EdaDialogCloseEvent.NONE), this.oldChart;
    }

    onClose(event: EdaDialogCloseEvent, response?: any): void {

        return this.controller.close(event, response);
    }


}
