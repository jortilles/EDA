
import { PanelChartComponent } from './../panel-charts/panel-chart.component';
import { Component, Input, ViewChild } from '@angular/core';
import { PointStyle } from 'chart.js';
import { EdaChart } from '@eda/components/eda-chart/eda-chart';
import { EdaDialog, EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import * as _ from 'lodash';
import { StyleProviderService,ChartUtilsService } from '@eda/services/service.index';
import { PanelChart } from '../panel-charts/panel-chart';
import { ChartConfig } from '../panel-charts/chart-configuration-models/chart-config';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EdaDialog2Component } from '@eda/shared/components/shared-components.index';
import { ColorPickerModule } from 'primeng/colorpicker';

@Component({
    standalone: true,
    selector: 'app-chart-dialog',
    templateUrl: './chart-dialog.component.html',
    imports: [CommonModule, FormsModule, EdaDialog2Component, PanelChartComponent, ColorPickerModule]
})

export class ChartDialogComponent{
    @Input () controller: any;
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
    public selectedPalette: { name: string; paleta: any } | null = null;
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

    public originalSeries: any[] = [];
    public series: any[] = [];
    public id: any;
    public title: string = $localize`:@@ChartProps:PROPIEDADES DEL GRAFICO`

    activeTab = "display"

    constructor(private chartUtils: ChartUtilsService,private stylesProviderService: StyleProviderService) {
  
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
        const type = this.chart['edaChart'];
        switch (type) {
            case 'doughnut':
            case 'polarArea':
                if (this.chart.chartLabels) {
                    this.series = this.chart.chartLabels.map((c, inx) => ({
                        label: c,
                        bg: this.rgb2hex(this.chart.chartColors[0].backgroundColor[inx]) || this.chart.chartColors[0].backgroundColor[inx]
                    }));
                    this.chart.chartColors[0].backgroundColor = this.series.map(d => (this.hex2rgb(d.bg, 90)));
                }
                break;
            case 'histogram':
                if (!this.series.length) {
                        const bgColor = this.normalizeColor(this.chart.chartDataset[0].backgroundColor);
                        this.series = [{
                            label: this.chart.chartDataset[0].label,
                            bg: bgColor,
                            border: '#10B4CD'
                        }];
                    }

                this.chart.chartColors = this.series.map(s => ({
                    backgroundColor: s.bg,
                    borderColor: s.bg
                }));

                this.chart.chartDataset = this.chart.chartDataset.map((d, i) => ({
                    ...d,
                    ...this.chart.chartColors[i]
                }));
                break; 
            default:
                if (!this.series.length) {
                    this.series = this.chart.chartDataset.map((d, i) => ({
                        label: d.label,
                        bg: this.resolveBackgroundColor(d, i),
                        border: d.borderColor
                    }));
                }

                this.chart.chartColors = this.series.map(s => ({
                    backgroundColor: s.bg,
                    borderColor: s.bg
                }));

                this.chart.chartDataset = this.chart.chartDataset.map((d, i) => ({
                    ...d,
                    ...this.chart.chartColors[i]
                }));

                break;
        }
        if (!this.originalSeries || this.originalSeries.length === 0)
            this.originalSeries = _.cloneDeep(this.series);
    }


     resolveBackgroundColor(dataset: any, index: number): string {
        if (typeof dataset.backgroundColor === 'string') {
            return /^rgb/i.test(dataset.backgroundColor)
            ? this.rgb2hex(dataset.backgroundColor)
            : dataset.backgroundColor;
         }
         //return this.chart.chartColors[index];
         return this.stylesProviderService.ActualChartPalette !== undefined ? this.stylesProviderService.ActualChartPalette['paleta'][index] :
             this.stylesProviderService.DEFAULT_PALETTE_COLOR['paleta'][index];
    }

   


    handleInputColor(event) {
        if (this.chart.chartDataset) {
            const newDatasets = [];
            const dataset = this.chart.chartDataset;
            if (this.panelChartComponent.componentRef.instance.inject.edaChart === 'stackedbar100') {

                for (let i = 0, n = dataset.length; i < n; i += 1) {
                    if (dataset[i].label === event.label) {
                        dataset[i].backgroundColor = this.hex2rgb(event.bg, 90);
                        dataset[i].borderColor = this.hex2rgb(event.bg, 100);
                        this.chart.chartColors[i] = _.pick(dataset[i], ['backgroundColor', 'borderColor']);
                    }
                    newDatasets.push(dataset[i]);
                }
                
            }else {
                
                for (let i = 0, n = dataset.length; i < n; i += 1) {
                    if (dataset[i].label === event.label) {
                        dataset[i].backgroundColor = this.hex2rgb(event.bg, 90);
                        dataset[i].borderColor = this.hex2rgb(event.bg, 100);
                        this.chart.chartColors[i] = _.pick(dataset[i], [ 'backgroundColor', 'borderColor']);
                    } else {
                        if (!_.isArray(dataset[i].backgroundColor)) {
                            dataset[i].backgroundColor = this.chart.chartColors[i].backgroundColor;
                            dataset[i].borderColor = this.chart.chartColors[i].backgroundColor;
                            this.chart.chartColors[i] = _.pick(dataset[i], [  'backgroundColor', 'borderColor']);
                        } else {
                            if (this.chart.chartLabels) {
                                const labels = this.chart.chartLabels;
                                for (let label of labels) {
                                    let inx = labels.indexOf(label);
                                    if (label === event.label && inx > -1) {
                                        dataset[i].backgroundColor[inx] = this.hex2rgb(event.bg, 90);
                                        this.chart.chartColors[0].backgroundColor[inx] = this.hex2rgb(event.bg, 90);
                                    }
                                }
                            }
                        }
                    }
                    newDatasets.push(dataset[i]);
                }
            }
            /*
             this.chart.chartDataset = newDatasets;
             let inx = this.chart.chartLabels.findIndex((label: string) => event.label === label);
             if (inx >= 0) {
                 for (let i = 0, n = dataset.length; i < n; i += 1) {
                     if (dataset[i].label === event.label) {
                         dataset[i].hoverBackgroundColor = this.hex2rgb(event.bg, 90);
                         dataset[i].hoverBorderColor = 'rgb(255,255,255)'; 
                         dataset[i].backgroundColor = this.hex2rgb(event.bg, 90);
                         dataset[i].borderColor = this.hex2rgb(event.bg, 100);
                         this.chart.chartColors[i] = _.pick(dataset[i], [ 'backgroundColor', 'borderColor']);
                     } else if (dataset[i].data[inx]) {
                         dataset[i].backgroundColor[inx] = this.hex2rgb(event.bg, 90);
                         dataset[i].borderColor[inx] = this.hex2rgb(event.bg, 100);
                         this.chart.chartColors[i] = _.pick(dataset[i], [ 'backgroundColor', 'borderColor']);
                     } else {
                         //dataset[i].hoverBackgroundColor = this.chart.chartColors[i].backgroundColor;
                         //dataset[i].hoverBorderColor = 'rgb(255,255,255)';
                         dataset[i].backgroundColor = this.chart.chartColors[i].backgroundColor;
                         dataset[i].borderColor = this.chart.chartColors[i].backgroundColor;
                         this.chart.chartColors[i] = _.pick(dataset[i], [  'backgroundColor', 'borderColor']);
                     }
                     newDatasets.push(dataset[i]);
                 }
                 this.chart.chartDataset = newDatasets;
             }
             */
        } else {
            if (this.chart.chartLabels) {
                const labels = this.chart.chartLabels;
                for (let i = 0, n = labels.length; i < n; i += 1) {
                    if (labels[i] === event.label) {
                        this.chart.chartColors[0].backgroundColor[i] = this.hex2rgb(event.bg, 90);
                    }
                }
            }
        }
        this.panelChartComponent.componentRef.instance.inject = this.chart;
        this.panelChartComponent.componentRef.instance.updateChart();
    }
    
    onPaletteSelected() {
        const paletteBase = this.selectedPalette['paleta'];
        const chartType = this.chart['edaChart'];

        let numberOfColors = 1;

        if (['pyramid', 'stackedbar', 'stackedbar100', 'line'].includes(chartType)) {
            numberOfColors = this.chart.chartDataset?.length || 1;
        } else if (['polarArea', 'doughnut'].includes(chartType)) {
            numberOfColors = this.chart.chartLabels?.length || 1;
        }

        const newColors = this.chartUtils.generateChartColorsFromPalette(numberOfColors, paletteBase);

        // Asignar colores según el tipo de gráfico
        if (['pyramid', 'stackedbar', 'stackedbar100', 'line'].includes(chartType)) {
            // Varios datasets
            // Modificar panelChart preview
            this.chart.chartDataset.forEach((ds, i) => {
                ds.backgroundColor = newColors[i].backgroundColor;
                ds.borderColor = newColors[i].borderColor;
            });

            this.chart.chartColors = this.chart.chartDataset.map(ds => ({
                backgroundColor: ds.backgroundColor,
                borderColor: ds.borderColor
            }));

            // Modificar series, paleta lateral
            this.series = this.chart.chartDataset.map((ds, i) => ({
                label: ds.label,
                bg: newColors[i].backgroundColor
            }));

        } else if (['polarArea', 'doughnut'].includes(chartType)) {
            // Un dataset con múltiples valores

            // Modificar panelChart preview
            const dataset = this.chart.chartDataset[0];
            dataset.backgroundColor = newColors.map(c => c.backgroundColor);
            dataset.borderColor = newColors.map(c => c.borderColor);

            this.chart.chartColors = [{
                backgroundColor: dataset.backgroundColor,
                borderColor: dataset.borderColor
            }];

            // Modificar series, paleta lateral
            this.series = this.chart.chartLabels.map((label, i) => ({
                label,
                bg: newColors[i].backgroundColor
            }));

        } else {
            // Resto de graficos de Chartjs

            // Modificar panelChart preview
            const dataset = this.chart.chartDataset[0];
            dataset.backgroundColor = newColors[0].backgroundColor;
            dataset.borderColor = newColors[0].borderColor;

            this.chart.chartColors = [{
            backgroundColor: [dataset.backgroundColor],
            borderColor: [dataset.borderColor]
            }];

            // Modificar series, paleta lateral
            this.series[0].bg = dataset.backgroundColor;
        }

        // Refrescar chart
        this.chart = { ...this.chart };
        this.panelChartComponent.componentRef.instance.inject = this.chart;
        this.panelChartComponent.updateComponent();
    }


    SetNumberOfColumns(){
        const properties = this.panelChartConfig;
        let c: ChartConfig = properties.config;
        let config: any = c.getConfig();
        config.showLabels = this.showLabels;
        config.showLabelsPercent = this.showLabelsPercent;
        config.showPointLines = this.showPointLines;
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
        config.showPointLines = this.showPointLines;
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
        config.showPointLines = this.showPointLines;
        config.numberOfColumns = this.numberOfColumns;
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
        config.showPointLines = this.showPointLines;
        config.numberOfColumns = this.numberOfColumns;
        properties.config = c;
        /**Update chart */
        this.panelChartConfig = new PanelChart(this.panelChartConfig);
        setTimeout(_ => {
            this.chart = this.panelChartComponent.componentRef.instance.inject;
            this.load();
        });

    }

    setShowLines(){

        const properties = this.panelChartConfig;
        let c: ChartConfig = properties.config;
        let config: any = c.getConfig();
        config.showLabels = this.showLabels;
        config.showLabelsPercent = this.showLabelsPercent;
        config.showPointLines = this.showPointLines;
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
        rgb = rgb?.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
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
                dataset[i].backgroundColor = this.chart.chartColors[i]?.backgroundColor;
                dataset[i].borderColor = this.chart.chartColors[i]?.backgroundColor;
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

    // Devolvemos siempre el color en formato #HEXDEC
    private normalizeColor(color) {
        // Si es un array 
        if (Array.isArray(color)) {
            color = color[0];
        }

        // Si ya es un hex válido tipo #aabbcc
        if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(color)) {
            return color;
        }

        // Si es un rgb() o rgba()
        const rgbMatch = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (rgbMatch) {
            const r = parseInt(rgbMatch[1]);
            const g = parseInt(rgbMatch[2]);
            const b = parseInt(rgbMatch[3]);
            return (
                '#' +
                [r, g, b]
                    .map(x => x.toString(16).padStart(2, '0'))
                    .join('')
            );
        }
        return color ;
    }

    // Funcion para resetear el valor de las series si se cierra
    resetSeries() {
        const type = this.chart['edaChart'];
        switch (type) {
            case 'doughnut':
            case 'polarArea':
                this.originalSeries.forEach((color, index) => {
                    this.chart.chartColors[0].backgroundColor[index] = color.bg;
                    this.chart.chartColors[0].borderColor[index] = color.bg;
                });
                break;
            case 'pyramid':
            case 'radar':
            case 'stackedbar':
            case 'stackedbar100':
                this.originalSeries.forEach((color, index) => {
                    this.chart.chartDataset[index].backgroundColor = color?.bg;
                    this.chart.chartDataset[index].borderColor = color?.bg;
                });
                this.resetChartConfig();
                break;
            default:
                this.chart.chartDataset[0].backgroundColor = this.originalSeries[0]?.bg;
                this.chart.chartDataset[0].borderColor = this.originalSeries[0]?.bg;
                this.resetChartConfig();

                break;
        }
    }

    resetChartConfig(){
        this.controller.params.config.config.getConfig()['addTrend'] = this.chart.addTrend;
        this.controller.params.config.config.getConfig()['showLabels'] = this.chart.showLabels;
        this.controller.params.config.config.getConfig()['showLabelsPercent'] = this.chart.showLabelsPercent;
        this.controller.params.config.config.getConfig()['showPointLines'] = this.chart.showPointLines;
        this.controller.params.config.config.getConfig()['numberOfColumns'] = this.chart.numberOfColumns;
        this.controller.params.config.config.getConfig()['addComparative'] = this.chart.addComparative;
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
        this.chart.showPointLines = this.showPointLines;
        this.chart.numberOfColumns = this.numberOfColumns;
        this.onClose(EdaDialogCloseEvent.UPDATE, this.chart);
    }

    //On cancel send prev state
    closeChartConfig() {
        this.resetSeries();
        this.onClose(EdaDialogCloseEvent.NONE), this.oldChart;
    }

    onClose(event: EdaDialogCloseEvent, response?: any): void {
        return this.controller.close(event, response);
    }


}
