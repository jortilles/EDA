
import { PanelChartComponent } from './../panel-charts/panel-chart.component';
import { Component, ViewChild } from '@angular/core';
import { PointStyle } from 'chart.js';
import { EdaChart } from '@eda/components/eda-chart/eda-chart';
import { EdaDialog, EdaDialogCloseEvent, EdaDialogAbstract } from '@eda/shared/components/shared-components.index';
import * as _ from 'lodash';
import { ChartUtilsService } from '@eda/services/service.index';
import { PanelChart } from '../panel-charts/panel-chart';
import { ChartConfig } from '../panel-charts/chart-configuration-models/chart-config';


@Component({
    selector: 'app-chart-dialog',
    templateUrl: './chart-dialog.component.html'
})

export class ChartDialogComponent extends EdaDialogAbstract  {

    @ViewChild('PanelChartComponent', { static: false }) panelChartComponent: PanelChartComponent;

    public dialog: EdaDialog;
    public chart: EdaChart;
    public oldChart: EdaChart;
    public addTrend: boolean;
    public showTrend: boolean = true;
    public showNumberOfColumns: boolean = false;
    public showComparative : boolean = true;
    public addComparative : boolean;
    public numberOfColumns : number;
    public panelChartConfig: PanelChart = new PanelChart();
    public display:boolean=false;
    public showLabels: boolean;
    public showLabelsPercent: boolean;

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


    constructor(private chartUtils: ChartUtilsService,) {
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
                        bg: this.rgb2hex(this.chart.chartColors[0].backgroundColor[inx])
                    }));
                    this.chart.chartColors[0].backgroundColor = this.series.map(d => (this.hex2rgb(d.bg, 90)));
                }
                break;
            default:

                this.series = this.chart.chartDataset.map(dataset => ({
                    label: dataset.label,
                    bg: this.rgb2hex(dataset.backgroundColor),
                    border: dataset.borderColor
                }));
                this.chart.chartColors = this.series.map(s => ({ backgroundColor: this.hex2rgb(s.bg, 90), borderColor:  this.hex2rgb(s.border, 90) }));
                break;
        }
        if (!this.originalSeries || this.originalSeries.length === 0)
            this.originalSeries = _.cloneDeep(this.series);
    }

    handleInputColor(event) {
        if (this.chart.chartDataset) {
            const newDatasets = [];
            const dataset = this.chart.chartDataset;
            

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

            // this.chart.chartDataset = newDatasets;
            // let inx = this.chart.chartLabels.findIndex((label: string) => event.label === label);
            // if (inx >= 0) {
            //     for (let i = 0, n = dataset.length; i < n; i += 1) {
            //         if (dataset[i].label === event.label) {
            //             //dataset[i].hoverBackgroundColor = this.hex2rgb(event.bg, 90);
            //             //dataset[i].hoverBorderColor = 'rgb(255,255,255)'; 
            //             dataset[i].backgroundColor = this.hex2rgb(event.bg, 90);
            //             dataset[i].borderColor = this.hex2rgb(event.bg, 100);
            //             this.chart.chartColors[i] = _.pick(dataset[i], [ 'backgroundColor', 'borderColor']);
            //         } else if (dataset[i].data[inx]) {
            //             dataset[i].backgroundColor[inx] = this.hex2rgb(event.bg, 90);
            //             dataset[i].borderColor[inx] = this.hex2rgb(event.bg, 100);
            //             this.chart.chartColors[i] = _.pick(dataset[i], [ 'backgroundColor', 'borderColor']);
            //         } else {
            //             //dataset[i].hoverBackgroundColor = this.chart.chartColors[i].backgroundColor;
            //             //dataset[i].hoverBorderColor = 'rgb(255,255,255)';
            //             dataset[i].backgroundColor = this.chart.chartColors[i].backgroundColor;
            //             dataset[i].borderColor = this.chart.chartColors[i].backgroundColor;
            //             this.chart.chartColors[i] = _.pick(dataset[i], [  'backgroundColor', 'borderColor']);
            //         }
            //         newDatasets.push(dataset[i]);
            //     }
            //     this.chart.chartDataset = newDatasets;
            // }
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
        switch (this.chart.chartType) {

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
        if (!this.originalSeries?.length) return this.onClose(EdaDialogCloseEvent.NONE);

        const type = this.chart.chartType;
        this.series = _.cloneDeep(this.originalSeries);
        const [restored] = this.series;

        if (type === 'doughnut' || type === 'polarArea') {
            this.chart.chartColors[0].backgroundColor = this.series.map(s => this.hex2rgb(s.bg, 90));
        } else if (this.chart.chartDataset?.[0]) {
            this.chart.chartDataset[0].backgroundColor = this.hex2rgb(restored.bg, 90);
            this.chart.chartDataset[0].borderColor = restored.border ?? this.hex2rgb(restored.bg, 100);
        }

        this.onClose(EdaDialogCloseEvent.NONE);
    }

    onClose(event: EdaDialogCloseEvent, response?: any): void {

        return this.controller.close(event, response);
    }


}
