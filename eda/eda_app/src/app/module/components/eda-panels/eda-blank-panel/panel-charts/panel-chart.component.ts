import { EdaKnob } from './../../../eda-knob/edaKnob';
import { EdaKnobComponent } from './../../../eda-knob/eda-knob.component';
import { EdaScatter } from './../../../eda-scatter/eda-scatter.component';
import { EdaTreeMap } from './../../../eda-treemap/eda-treemap.component';

import { EdaTreeTable } from './../../../eda-treetable/eda-treetable.component';

import { TreeMap } from './../../../eda-treemap/eda-treeMap';
import { EdaD3Component } from './../../../eda-d3/eda-d3.component';
import { TableConfig } from './chart-configuration-models/table-config';
import {
    Component, OnInit, Input, SimpleChanges,
    OnChanges, ViewChild, ViewContainerRef, ComponentFactoryResolver,
    OnDestroy, Output, EventEmitter, Self, ElementRef, NgZone
} from '@angular/core';
import { EdaKpiComponent } from '../../../eda-kpi/eda-kpi.component';
import { EdadynamicTextComponent } from '../../../eda-dynamicText/eda-dynamicText.component';
import { EdaTableComponent } from '../../../eda-table/eda-table.component';
import { PanelChart } from './panel-chart';
import { ChartUtilsService, StyleConfig, StyleProviderService } from '@eda/services/service.index';

import { Column } from '@eda/models/model.index';
import { EdaChartComponent } from '@eda/components/eda-chart/eda-chart.component';
import { EdaColumnDate } from '@eda/components/eda-table/eda-columns/eda-column-date';
import { EdaColumnNumber } from '@eda/components/eda-table/eda-columns/eda-column-number';
import { EdaColumnText } from '@eda/components/eda-table/eda-columns/eda-column-text';
import { EdaTable } from '@eda/components/eda-table/eda-table';
import { KpiConfig } from './chart-configuration-models/kpi-config';
import { DynamicTextConfig } from './chart-configuration-models/dynamicText-config';
import { EdaMapComponent } from '@eda/components/eda-map/eda-map.component';
import { EdaGeoJsonMapComponent } from '@eda/components/eda-map/eda-geoJsonMap.component';

import * as _ from 'lodash';
import { EdaMap } from '@eda/components/eda-map/eda-map';
import { EdaD3 } from '@eda/components/eda-d3/eda-d3';
import { EdaFunnelComponent } from '@eda/components/eda-funnel/eda-funnel.component';
import { EdaBubblechartComponent } from '@eda/components/eda-d3-bubblechart/eda-bubblechart.component';
import { EdaSunburstComponent } from '@eda/components/eda-sunburst/eda-sunburst.component';
import { SunBurst } from '@eda/components/eda-sunburst/eda-sunbrust';
import { ScatterPlot } from '@eda/components/eda-scatter/eda-scatter';
import { TreeMapConfig } from './chart-configuration-models/treeMap-config';
import { SunburstConfig } from './chart-configuration-models/sunburst-config';
import { SankeyConfig } from './chart-configuration-models/sankey-config';
import { ScatterConfig } from './chart-configuration-models/scatter-config';
import { BubblechartConfig } from './chart-configuration-models/bubblechart.config';import { EdaChart } from '@eda/components/eda-chart/eda-chart';



@Component({
    selector: 'panel-chart',
    templateUrl: './panel-chart.component.html',
    styleUrls: []
})

export class PanelChartComponent implements OnInit, OnChanges, OnDestroy {
    ngOnDestroy(): void {
        this.destroyComponent();
    }
    @Input() props: PanelChart;
    @Output() configUpdated: EventEmitter<any> = new EventEmitter<any>(null);
    @Output() onChartClick: EventEmitter<any> = new EventEmitter<any>();
    @ViewChild('chartComponent', { read: ViewContainerRef, static: true }) entry: ViewContainerRef;


    /*Chart's containers for panel body and preview panel*/
    public componentRef: any;
    public currentConfig: any;
    public NO_DATA: boolean;
    public NO_DATA_ALLOWED: boolean;
    public NO_FILTER_ALLOWED: boolean;

    /**Styles */
    public fontColor: string;
    public fontFamily: string;
    public fontSize: number;
    public paletaActual 


    public histoGramRangesTxt: string = $localize`:@@histoGramRangesTxt:Rango`;
    public histoGramDescTxt: string = $localize`:@@histoGramDescTxt:Número de`;
    public histoGramDescTxt2: string = $localize`:@@histoGramDescTxt2:en este rango`;


    constructor(
        public resolver: ComponentFactoryResolver,
        private chartUtils: ChartUtilsService,
        @Self() private ownRef: ElementRef,
        public styleProviderService: StyleProviderService) {
        
        this.fontColor = this.styleProviderService.panelFontColor.source['value'];
        this.paletaActual = this.styleProviderService.ActualChartPalette !== undefined ?
            this.styleProviderService.ActualChartPalette['paleta'] : this.styleProviderService.DEFAULT_PALETTE_COLOR['paleta'];

        
        this.styleProviderService.panelFontFamily.subscribe(family => {
            this.fontFamily = family;
            if(this.props && ['doughnut', 'polarArea', 'bar', 'horizontalBar', 'line', 'area', 'barline', 'histogram', 'bubblechart','pyramid', 'radar'].includes(this.props.chartType)) this.ngOnChanges(null);
        });

        this.styleProviderService.panelFontSize.subscribe(size => {
            this.fontSize = size;
            if(this.props && ['doughnut', 'polarArea', 'bar', 'horizontalBar', 'line','area', 'barline', 'histogram', 'bubblechart','pyramid', 'radar'].includes(this.props.chartType)) this.ngOnChanges(null);
        });
    }


    ngOnInit(): void {
        this.NO_DATA = false;
        this.NO_DATA_ALLOWED = false;
        this.NO_FILTER_ALLOWED = false;
    }

    ngAfterContentInit(): void {
        this.styleProviderService.checkLoadPan();
    }

    ngOnChanges(changes: SimpleChanges): void {
        /**
         * If data change chart type
         */

        if (this.props.data && this.props.data.values.length !== 0
            && !this.props.data.values.reduce((a, b) => a && b.every(element => element === null), true)) {
                requestAnimationFrame(() => {                    
                setTimeout(_ => {
                    this.NO_DATA = false;
                });
    
                this.changeChartType();
              });
        }
        /**
         * If no data
         */
        else {
            this.destroyComponent();
            setTimeout(_ => {
                this.NO_DATA = true;
                if( this.props.data?.labels[0]== "noDataAllowed") {
                    this.NO_DATA = false;
                    this.NO_DATA_ALLOWED = true;
                    this.NO_FILTER_ALLOWED = false;
                }else if( this.props.data?.labels[0]== "noFilterAllowed") {
                    this.NO_DATA = false;
                    this.NO_DATA_ALLOWED = false;
                    this.NO_FILTER_ALLOWED = true;
                }
            })
        }
    }

    getDimensions() {
        return { width: this.ownRef.nativeElement.offsetWidth, height: this.ownRef.nativeElement.offsetHeight }
    }

    /**
     * changes chart Type
     */

    public changeChartType() {
        const type = this.props.chartType;

        if (['table', 'crosstable'].includes(type)) {
            this.renderEdaTable(type);
        }

        if (['doughnut', 'polarArea', 'bar', 'horizontalBar', 'line', 'area', 'barline',  'histogram' ,'pyramid', 'radar'].includes(type)) {
            this.renderEdaChart(type);
        }

        if (['kpibar', 'kpiline', 'kpiarea'].includes(type)) {
            this.renderEdaKpiChart();
        }

        if (type ==='kpi') {
            this.renderEdaKpi();
        }

        if (type === 'dynamicText') {
            this.renderEdadynamictext();
        }
        if (['geoJsonMap', 'coordinatesMap'].includes(type)) {
            this.renderMap(type);
        }
        if (type === 'parallelSets') {
            this.renderParallelSets();
        }
        if (type === 'treeMap') {
            this.renderTreeMap();
        }
        if (type === 'scatterPlot') {
            this.renderScatter();
        }
        if (type === 'knob') {
            this.renderKnob()
        }
        if (type === 'funnel') {
            this.renderFunnel();
        }
        if (type === 'bubblechart') {
            this.renderBubblechart();
        }
        if (type === 'sunburst') {
            this.renderSunburst();
        }
        if (type === 'treetable') {
            this.renderTreetable();
        }
    }

    /**
     * renders a table component
     * @param type table or crosstable
     */
    private renderEdaTable(type) {

        if (type === 'table') {
            this.createEdatableComponent(type);
        }
        if (type === 'crosstable') {
            this.createEdatableComponent(type);
        }
    }

    /**
     * Renders edaChartComponent
     * @param type 
     */
    private renderEdaChart(type: string) {
        const isbarline = this.props.edaChart === 'barline';
        const isstacked = this.props.edaChart === 'stackedbar' || this.props.edaChart === 'stackedbar100';

        const dataDescription = this.chartUtils.describeData(this.props.query, this.props.data.labels);
        const dataTypes = this.props.query.map(column => column.column_type);
    
        let values = _.cloneDeep(this.props.data.values);

        /**
        * add comparative
        */
        let cfg: any = this.props.config.getConfig();
        // Si es un histogram faig aixó....        
        if ((['histogram'].includes(this.props.edaChart))
            && this.props.query.length === 1
            && this.props.query.filter(field => field.column_type === 'numeric').length == 1
        ) {
            let newCol = { name: this.histoGramRangesTxt, index: 0 };
            dataDescription.otherColumns.push(newCol);
            dataDescription.numericColumns[0].index = 1
            dataDescription.totalColumns++;
            dataDescription.numericColumns[0].name = this.histoGramDescTxt + " " + dataDescription.numericColumns[0].name + " " + this.histoGramDescTxt2;
        }
        // si vull fer comparatives faig això....
        if (!!cfg.addComparative
            && (['line', 'bar'].includes(cfg.chartType))
            && this.props.query.length === 2
            && this.props.query.filter(field => field.column_type === 'date').length > 0
            && ['month', 'week'].includes(this.props.query.filter(field => field.column_type === 'date')[0].format)) {

            values = this.chartUtils.comparePeriods(this.props.data, this.props.query);
            let types = this.props.query.map(field => field.column_type);
            let dateIndex = types.indexOf('date');
            dataTypes.splice(dateIndex, 0, 'date');
            let dateCol = dataDescription.otherColumns.filter(c => c.index === dateIndex)[0];
            let newCol = { name: dateCol.name + '_newDate', index: dateCol.index + 1 };
            dataDescription.otherColumns.push(newCol);
            dataDescription.totalColumns++;
        }

        // No pasamos el numero de columnas se calcula en la propia funcion
        const chartData = this.chartUtils.transformDataQuery(this.props.chartType, this.props.edaChart, values, dataTypes, dataDescription, isbarline, null);
        if (chartData.length == 0) {
            chartData.push([], []);
        }

        const minMax = this.props.chartType !== 'line' ? { min: null, max: null } : this.chartUtils.getMinMax(chartData);

        const manySeries = chartData[1]?.length > 10 ? true : false;
        
        const styles: StyleConfig = {
            fontFamily: this.fontFamily,
            fontSize: this.fontSize,
            fontColor: this.fontColor
        }

        const ticksOptions = {
            maxRotation: 30,
            minRotation: 0,
            labelOffset: 5,
            padding: 5
        };

        const config = this.chartUtils.initChartOptions(this.props.chartType, dataDescription.numericColumns[0]?.name,
            dataDescription.otherColumns, manySeries, isstacked, this.getDimensions(), this.props.linkedDashboardProps,
            minMax, styles, cfg.showLabels, cfg.showLabelsPercent, cfg.showPointLines, cfg.numberOfColumns, this.props.edaChart, ticksOptions, false, this.styleProviderService);


        /**Add trend datasets*/
        cfg = this.props.config.getConfig();
        if (cfg.addTrend && (cfg.chartType === 'line')) {
            let trends = [];
            chartData[1].forEach(serie => {
                let trend = this.chartUtils.getTrend(serie);
                trends.push(trend);
            });
            trends.forEach(trend => chartData[1].push(trend));
        }
        let chartConfig: any = {};
        chartConfig.chartType = this.props.chartType;
        chartConfig.edaChart = this.props.edaChart;
        chartConfig.chartLabels = chartData[0];
        chartConfig.chartDataset = chartData[1];
        chartConfig.chartOptions = config.chartOptions;
        chartConfig.chartColors = this.chartUtils.recoverChartColors(this.props.chartType, this.props.config);
        chartConfig.assignedColors = this.props.config.getConfig()['assignedColors'] || [];
        
        const sortByAsCol = !this.styleProviderService.loadingFromPalette; // Ordenado por assignedColors
        let colors = this.chartUtils.generateChartColorsFromPalette(chartConfig.chartLabels.length, this.paletaActual).flatMap((item) => item.backgroundColor);
    
        const chartColors = chartConfig.chartColors[0];
        const assignedColors = chartConfig.assignedColors;
        const configData = chartConfig?.assignedColors.flatMap((item) => item.value);
        const configColors = chartConfig?.assignedColors.flatMap((item) => item.color);

        if (["doughnut", "polarArea"].includes(chartConfig.chartType)) {
            chartData[0].forEach((element, index) => {
                const indexMatched = configData.findIndex(e => e === element);
                if (indexMatched !== -1 && sortByAsCol) {
                    // Usa color coincidente de configColors
                    chartColors.backgroundColor[index] = configColors[indexMatched];
                    chartColors.borderColor[index] = configColors[indexMatched];
                } else {
                    // Usa color de la paleta activa
                    const color = colors[index];
                    chartColors.backgroundColor[index] = color;
                    chartColors.borderColor[index] = color;

                }
                // Actualiza assignedColors para la vista previa
                assignedColors.forEach((item, idx) => {
                    item.color = chartColors.backgroundColor[idx];
                });
                
            });


            chartConfig.chartLabels.forEach((element, index) => {
                //asignamos el valor de la data y color perteniente si lo tiene
                chartConfig.assignedColors.push({
                    value: element,
                    color: chartColors.backgroundColor[index]
                });
            });
        }else if (['bar', 'horizontalBar', 'radar', 'barline', 'line', 'area'].includes(chartConfig.edaChart)) {
            if (sortByAsCol) {
                    // Usa color coincidente de configColors + creación nuevo
                    chartColors.backgroundColor = chartConfig?.assignedColors?.length > 0 ? chartConfig?.assignedColors[0].color : colors [0];
                    chartColors.borderColor = chartConfig?.assignedColors?.length > 0 ? chartConfig?.assignedColors[0].color : colors [0];
            } else {
                    // Cargamos colores desde paleta 
                    chartColors.backgroundColor = this.paletaActual[0];
                    chartColors.borderColor = this.paletaActual[0];

                    // Actualiza assignedColors para la vista previa
                    assignedColors.forEach((item) => {
                        item.color = chartColors.backgroundColor;
                    });
            } 
            chartConfig.chartLabels.forEach((element) => {
                //asignamos el valor de la data y color perteniente si lo tiene
                chartConfig.assignedColors.push({
                    value: element,
                    color: chartColors.backgroundColor
                });
            });
        }else if (['pyramid', 'stackedbar', 'stackedbar100'].includes(chartConfig.edaChart)) {
            // Obtener nombres únicos
            let uniqueNames;
            if(this.props.config.getConfig()['assignedColors']?.length > 0 )
                uniqueNames = this.getUniqueNamesFromDataset(this.props.config.getConfig()['assignedColors']);
            else
                uniqueNames = this.getUniqueNamesFromDataset(chartConfig.chartDataset);

            // Generar paleta de colores del tamaño justo
            let colors = this.chartUtils
            .generateChartColorsFromPalette(uniqueNames.length, this.paletaActual).flatMap((item) => item.backgroundColor);
            
            // Asignar colores según sortByAsCol
            const configData2 = chartConfig?.assignedColors.flatMap((item) => item.label);
            
            chartData[1].forEach((element, index) => {
                const indexMatched = configData2.findIndex(e => e === element.label);
                if(!sortByAsCol || indexMatched === -1 ) {
                    // Usa la paleta activa
                    chartConfig.chartColors[index].backgroundColor = colors[index];
                    chartConfig.chartColors[index].borderColor = colors[index];
                }else {
                    // Usa assignedColors
                    chartConfig.chartColors[index].backgroundColor = chartConfig.chartColors[index].backgroundColor;
                    chartConfig.chartColors[index].borderColor = chartConfig.chartColors[index].backgroundColor;
                }
            });
            chartConfig.assignedColors = uniqueNames.map((name, idx) => ({
                label: name,
                color: chartConfig.chartColors[idx]?.backgroundColor || colors[idx],
            }));

        } else if (['histogram'].includes(chartConfig.edaChart)) {
                if (chartConfig.chartLabels.length === 0) {
                    chartConfig.chartLabels = chartConfig.assignedColors.map(element => element.value);
                                        chartConfig.chartDataset[0].data = [1];

                }
                if (sortByAsCol) {
                    // Usa color coincidente de configColors
                    const assignedColor = chartConfig?.assignedColors?.length > 0 ? chartConfig?.assignedColors[0].color : colors [0];

                    chartConfig.chartColors[0] = {
                        backgroundColor: assignedColor,
                        borderColor: assignedColor,
                        pointBackgroundColor: assignedColor,
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: assignedColor
                    };
                } else {
                    // Usa color de la paleta activa
                    chartConfig.chartColors[0].backgroundColor = this.styleProviderService?.ActualChartPalette['paleta'][0];
                    chartConfig.chartColors[0].borderColor = this.styleProviderService?.ActualChartPalette['paleta'][0];
                    
                    // Modificar los assignedColor para que la preview coincida con el cambio
                    chartConfig.assignedColors.forEach(element => {
                        element.color = chartConfig.chartColors[0].backgroundColor
                    });
                }
        }

        



            // chartColors unicamente se reflejan si estan dentro del chartDataset (esto asigna colores correctamente) 
            if (!chartData[1][0]?.backgroundColor) {
                chartData[1].forEach((e, i) => {
                    try {
                        e.backgroundColor = chartConfig.chartColors[i].backgroundColor;
                        e.borderColor = chartConfig.chartColors[i].borderColor;
                    } catch (err) {
                        // si tinc una tendencia no tinc color per aquesta grafica. No hauria de ser aixi.....
                        e.backgroundColor = this.chartUtils.generateColors(this.props.chartType)[i].backgroundColor;
                        e.borderColor = this.chartUtils.generateColors(this.props.chartType)[i].borderColor;
                    }
                });
            }
        

        chartConfig.linkedDashboardProps = this.props.linkedDashboardProps;
        this.createEdaChartComponent(chartConfig);

    }   




    /**
     * Creates a chart component
     * @param inject chart configuration
     */
    private createEdaChartComponent(inject: any) {
        this.currentConfig = inject;
        this.entry.clear();
        /** Deprecado en angular 13 */
        //const factory = this.resolver.resolveComponentFactory(EdaChartComponent);
        /** JUANJO MIRA ESTO*/
        this.componentRef = this.entry.createComponent(EdaChartComponent);
        this.componentRef.instance.inject = inject;
        this.componentRef.instance.onClick.subscribe((event) => this.onChartClick.emit({...event, query: this.props.query}));
        this.configUpdated.emit(this.currentConfig);
    }

    /**
      * Creates a table component
      * @param inject chart configuration
      */
    private createEdatableComponent(type: string) {
        this.entry.clear();

        const config = this.props.config.getConfig();
        const factory = this.resolver.resolveComponentFactory(EdaTableComponent);

        this.componentRef = this.entry.createComponent(factory);
        this.componentRef.instance.inject = this.initializeTable(type, config);
        this.componentRef.instance.inject.value = this.chartUtils.transformDataQueryForTable(this.props.data.labels, this.props.data.values);
        this.componentRef.instance.onClick.subscribe((event) => this.onChartClick.emit({...event, query: this.props.query}));

        if (config) {

            this.componentRef.instance.inject.rows = (<TableConfig>config).visibleRows;
            this.setTableProperties((<TableConfig>config));

        }

        this.componentRef.instance.inject.onNotify.subscribe(data => {
            (<TableConfig>config).visibleRows = data;
        });
        this.componentRef.instance.inject.onSortPivotEvent.subscribe(data => {
            (<TableConfig>config).sortedSerie = data;
        });
        this.componentRef.instance.inject.onSortColEvent.subscribe(data => {
            (<TableConfig>config).sortedColumn = data;
        });
        this.currentConfig = this.componentRef.instance.inject;
        this.componentRef.instance.inject.linkedDashboardProps = this.props.linkedDashboardProps;
    }

    private setTableProperties(config: TableConfig) {
        this.componentRef.instance.inject.withColTotals = config.withColTotals;
        this.componentRef.instance.inject.withColSubTotals = config.withColSubTotals;
        this.componentRef.instance.inject.withRowTotals = config.withRowTotals;
        this.componentRef.instance.withTrend = config.withTrend;
        this.componentRef.instance.inject.resultAsPecentage = config.resultAsPecentage;
        this.componentRef.instance.inject.checkTotals(null, config.visibleRows);
        this.componentRef.instance.inject.sortedSerie = config.sortedSerie;
        this.componentRef.instance.inject.sortedColumn = config.sortedColumn;
        this.componentRef.instance.inject.noRepetitions = config.noRepetitions;
        this.componentRef.instance.inject.ordering = config.ordering;
        this.componentRef.instance.inject.negativeNumbers = config.negativeNumbers;
        this.configUpdated.emit(this.currentConfig);;
    }

    /**renderKnob */

    private renderKnob() {
        let chartConfig: EdaKnob = new EdaKnob();
        const dataTypes = this.props.query.map(column => column.column_type);
        chartConfig.data = this.chartUtils.transformData4Knob(this.props.data, dataTypes);
        
        chartConfig.dataDescription = this.chartUtils.describeData4Knob(this.props.query, this.chartUtils.transformData4Knob(this.props.data, dataTypes));
        chartConfig.color = this.props.config['config']['color'] ? this.props.config['config']['color'] : null;
        chartConfig.limits = this.props.config['config']['limits'] ? this.props.config['config']['limits'] : null;
        this.createEdaKnobComponent(chartConfig)

    }

    private createEdaKnobComponent(inject) {
        this.entry.clear();
        const factory = this.resolver.resolveComponentFactory(EdaKnobComponent);
        this.componentRef = this.entry.createComponent(factory);
        this.componentRef.instance.inject = inject;
    }

    /**
   * Renders a KPIComponent
   */
    private renderEdaKpi() {
        const chartConfig: any = {};
        chartConfig.value = this.props.data.values[0][0];
        chartConfig.header = this.props.query[0]?.display_name?.default;
        chartConfig.showChart = false;

        const config: any = this.props.config;
        const alertLimits = config?.config?.alertLimits || [];

        if (config) {
            chartConfig.sufix = (<KpiConfig>config.getConfig())?.sufix || '';
            chartConfig.alertLimits = alertLimits;
            chartConfig.edaChart =  (<KpiConfig>config.getConfig())?.edaChart;
        } else {
            chartConfig.sufix = '';
            chartConfig.alertLimits = [];
        }

        this.createEdaKpiComponent(chartConfig);
    }

    /**
     * creates a kpiComponent
     * @param inject 
    */
    private createEdaKpiComponent(inject: any) {
        this.entry.clear();
        const factory = this.resolver.resolveComponentFactory(EdaKpiComponent);
        this.componentRef = this.entry.createComponent(factory);
        this.componentRef.instance.inject = inject;
        this.componentRef.instance.onNotify.subscribe(data => {
            const kpiConfig = new KpiConfig({ sufix: data.sufix, alertLimits: inject.alertLimits });
            (<KpiConfig><unknown>this.props.config.setConfig(kpiConfig));
        })
    }

    /**
     * Renders a KPIComponent
    */
    private renderEdaKpiChart() {
        // Chart Config
        const chartType = this.props.chartType.split('kpi')[1];
        const chartSubType = this.props.edaChart.split('kpi')[1];
        const cfg: any = this.props.config.getConfig();
        
        const chartConfig: any = {};
        const dataDescription = this.chartUtils.describeData(this.props.query, this.props.data.labels);
        const dataTypes = this.props.query.map((column: any) => column.column_type);
    
        let values = _.cloneDeep(this.props.data.values);

        const chartData = this.chartUtils.transformDataQuery(chartType, chartSubType,  values, dataTypes, dataDescription, false, cfg.numberOfColumns);

        if (chartData.length == 0) {
            chartData.push([], []);
        }

        const minMax = chartType !== 'line' ? { min: null, max: null } : this.chartUtils.getMinMax(chartData);

        const manySeries = chartData[1]?.length > 10 ? true : false;

        const styles:StyleConfig = {
            fontFamily: this.fontFamily,
            fontSize: this.fontSize,
            fontColor: this.fontColor
        }
        
        const dimensions = this.getDimensions();
        dimensions.height = !dimensions.height ? 255 : dimensions.height;
        dimensions.width = !dimensions.width ? 1300 : dimensions.width;
 
        const ticksOptions = {
            xTicksLimit: 3,
            yTicksLimit: 0,
            maxRotation: 1,
            minRotation: 1,
            labelOffset: 40,
            padding: -2
        };
        const chartOptions = this.chartUtils.initChartOptions(
            chartType, dataDescription.numericColumns[0]?.name,
            dataDescription.otherColumns, manySeries, false, dimensions, null,
            minMax, styles, cfg.showLabels, cfg.showLabelsPercent, cfg.showPointLines,  cfg.numberOfColumns, chartSubType, ticksOptions, false, this.styleProviderService
        );
        // let chartConfig: any = {};
        chartConfig.edaChart = {}
        chartConfig.showChart = true;
        chartConfig.edaChart.edaChart = chartSubType;
        chartConfig.edaChart.chartType = chartType;
        chartConfig.edaChart.chartLabels = chartData[0];
        chartConfig.edaChart.chartDataset = chartData[1];
        chartConfig.edaChart.chartOptions = chartOptions.chartOptions;
        chartConfig.edaChart.chartColors = this.chartUtils.recoverChartColors(
            this.props.chartType,
            this.props.config
        );
        
        // Determinar color base del gráfico paleta / asCol
        const { styleProviderService, props } = this;

        const paletteColor = styleProviderService?.ActualChartPalette?.['paleta']?.[0];
        const configColor = props.config.getConfig()?.['edaChart']?.colors?.[0]?.backgroundColor;
        const defaultColor = styleProviderService?.DEFAULT_PALETTE_COLOR?.['paleta']?.[0];

        let baseColor: string | undefined;

        if (styleProviderService.loadingFromPalette) {
            baseColor = paletteColor ?? defaultColor;
        } else {
            baseColor = configColor ?? paletteColor ?? defaultColor;
        }

        // Asignar colores a la configuración
        chartConfig.edaChart.chartColors[0].backgroundColor = baseColor;
        chartConfig.edaChart.chartDataset[0] = {
            ...chartConfig.edaChart.chartDataset[0],
            backgroundColor: baseColor,
            borderColor: baseColor
        };

        
        // KPI Config
        let kpiValue: number;
        let kpiLabel = this.props.query.find((c: any) => c.column_type == 'numeric')?.display_name?.default;
        let decimals = this.props.query.find((c: any) => c.column_type == 'numeric')?.minimumFractionDigits;
        let agg = this.props.query.find((c: any) => c.column_type == 'numeric')?.aggregation_type.find( (e: any) => e.selected == true )?.value;


        if (chartData[1][0]?.data) {
            /* no se hace esto porque no tiene sentido 
            if(agg == 'avg' ){       kpiValue = _.avg(chartData[1][0]?.data);
            }else if(agg == 'max' ){ kpiValue = _.max(chartData[1][0]?.data);
            }else if(agg == 'avg' ){ kpiValue = _.sum(chartData[1][0]?.data);
            }else if(agg == 'min' ){ kpiValue = _.min(chartData[1][0]?.data);
            }else{                   kpiValue = _.sum(chartData[1][0]?.data);  } */
            
            kpiValue = _.sum(chartData[1][0]?.data);
            if( this.countDecimals(kpiValue) >decimals ){
                kpiValue = Number(kpiValue.toFixed(decimals)) ;
            }
             
        }
        
        chartConfig.chartType = this.props.chartType;
        chartConfig.value = kpiValue;
        chartConfig.header = kpiLabel;

        const propsConfig: any = this.props.config;
        const alertLimits = propsConfig?.config?.alertLimits || [];

        if (propsConfig) {
            chartConfig.sufix = (<KpiConfig>propsConfig.getConfig())?.sufix || '';
            chartConfig.alertLimits = alertLimits;
        } else {
            chartConfig.sufix = '';
            chartConfig.alertLimits = [];
        }

        this.createEdaKpiChartComponent(chartConfig);
    }
    /**
     * cuenta los decimales de los números.
     */
    private countDecimals (value) {
        if(Math.floor(value) === value) return 0;
        return value.toString().split(".")[1].length || 0; 
    }


    /**
     * creates a kpiChartComponent
     * @param inject 
    */
    private createEdaKpiChartComponent(inject: any) {
        this.entry.clear();
        const factory = this.resolver.resolveComponentFactory(EdaKpiComponent);
        this.componentRef = this.entry.createComponent(factory);
        this.componentRef.instance.inject = inject;

        this.componentRef.instance.onNotify.subscribe(data => {
            const kpiConfig = new KpiConfig({ sufix: data.sufix, alertLimits: inject.alertLimits||[], edaChart: inject.edaChart });
            (<KpiConfig><unknown>this.props.config.setConfig(kpiConfig));
        })
        this.configUpdated.emit(this.currentConfig);;

        // this.componentRef = this.entry.createComponent(EdaChartComponent);
        // this.componentRef.instance.inject = inject;
        // this.componentRef.instance.onClick.subscribe((event) => this.onChartClick.emit({...event, query: this.props.query}));
        // this.configUpdated.emit(this.currentConfig);;
    }


    /**
    * Renders a dynamicTextComponent
    */
    private renderEdadynamictext() {
        let chartConfig: any = {};
        let cfg: any = this.props.config.getConfig();
        chartConfig.value = this.props.data.values[0][0];
        chartConfig.header = this.props.query[0].display_name.default;
        chartConfig.color = cfg;
        this.createEdadynamicTextComponent(chartConfig);
    }

    /**
     * creates a dynamicTextComponent
     * @param inject 
     */
    private createEdadynamicTextComponent(inject: any) {
        this.entry.clear();
        const factory = this.resolver.resolveComponentFactory(EdadynamicTextComponent);
        this.componentRef = this.entry.createComponent(factory);
        this.componentRef.instance.inject = inject;  
        this.componentRef.instance.onNotify.subscribe(data => {
            const dynamicTextConfig = new DynamicTextConfig(data.color);
            (<DynamicTextConfig><unknown>this.props.config.setConfig(dynamicTextConfig));
        })
    }

    private renderMap(type: string) {
        let inject = new EdaMap();
        inject.div_name = 'map_' + (this.randomID()).toString();
        inject.data = this.props.data.values;
        inject.labels = this.props.query.map(field => field.display_name.default);
        inject.maps = this.props.maps;
        inject.query = this.props.query;
        inject.draggable = this.props.draggable;
        inject.zoom = this.props.zoom;
        inject.coordinates = this.props.coordinates;

        try {
            inject.coordinates = this.props.config['config']['coordinates'];                
        }catch{
            inject.coordinates = null ;
        }
        try {
            if (true) {
                inject.zoom = this.props.config["config"]["zoom"];
            } else {}
        }catch{}
        try{
            if (type === "geoJsonMap") {
                inject.color = this.props.config.getConfig() !== undefined && !this.styleProviderService.loadingFromPalette
                    ? this.props.config["config"]["color"]
                    : this.chartUtils.generateChartColorsFromPalette(1, this.paletaActual)[0].backgroundColor;
                inject.baseLayer = this.props.config['config']['baseLayer'];
            } else {
                let fromPaleta = this.props.config.getConfig() === undefined;
                inject.initialColor = !fromPaleta ? this.props.config.getConfig()["initialColor"] : this.chartUtils.generateChartColorsFromPalette(2, this.paletaActual).at(-1).backgroundColor;
                inject.finalColor = !fromPaleta ? this.props.config.getConfig()["finalColor"] : this.chartUtils.generateChartColorsFromPalette(2, this.paletaActual)[0].backgroundColor;
                
                inject.baseLayer = true;
            }
        } catch {
            inject.color =  this.styleProviderService.ActualChartPalette['paleta'][0];
        }
        try{
            inject.logarithmicScale = this.props.config['config']['logarithmicScale']  ;
        }catch{
            inject.logarithmicScale =  false;
        }
        try {
            if (type === "geoJsonMap") {
                inject.legendPosition = this.props.config['config']['legendPosition']  ;
            }
        }catch{
            inject.legendPosition =  'bottomleft';
        }
        try{
            inject.draggable = this.props.config['config']['draggable'];
        }catch{
            inject.draggable = true;
        }
        
        inject.linkedDashboard = this.props.linkedDashboardProps;
        if (type === 'coordinatesMap') {
            this.createMapComponent(inject)
        } else {
            this.createGeoJsonMapComponent(inject);
        }
    }

    private createMapComponent(inject: EdaMap) {
        this.entry.clear();
        const factory = this.resolver.resolveComponentFactory(EdaMapComponent);
        this.componentRef = this.entry.createComponent(factory);
        this.componentRef.instance.inject = inject;
        //this.componentRef.instance.onClick.subscribe((event) => this.onChartClick.emit({...event, query: this.props.query}));
        
    }
    
    private createGeoJsonMapComponent(inject: EdaMap) {
        this.entry.clear();
        const factory = this.resolver.resolveComponentFactory(EdaGeoJsonMapComponent);
        this.componentRef = this.entry.createComponent(factory);
        this.componentRef.instance.inject = inject;
        // Revisar filtro en click 
        //this.componentRef.instance.onClick.subscribe((event) => this.onChartClick.emit({...event, query: this.props.query}));
    }


    private renderParallelSets() {
        const dataDescription = this.chartUtils.describeData(this.props.query, this.props.data.labels);

        let inject: EdaD3 = new EdaD3;
        inject.size = this.props.size;
        inject.id = this.randomID();
        inject.data = this.props.data;
        inject.dataDescription = dataDescription;
        const configColors = this.props.config.getConfig()['colors'];
        inject.colors = configColors.length > 0 ? configColors
            : this.chartUtils.generateChartColorsFromPalette(inject.data.values.length, this.paletaActual).map(item => item.backgroundColor);
        inject.assignedColors = this.props.config.getConfig()['assignedColors'] || [];
        
        //Tratamiento de assignedColors, cuando no haya valores, asignara un color        
        this.props.config.setConfig(this.assignedColorsWork2(this.props.config.getConfig(), inject));

        

        inject.linkedDashboard = this.props.linkedDashboardProps;
        // aqui ya esta jodido
        this.createParallelSetsComponent(inject);
    }

    private createParallelSetsComponent(inject: any) {
        this.entry.clear();
        const factory = this.resolver.resolveComponentFactory(EdaD3Component);
        this.componentRef = this.entry.createComponent(factory);
        this.componentRef.instance.inject = inject;
        this.componentRef.instance.onClick.subscribe((event) => {
            this.onChartClick.emit({ ...event, query: this.props.query });
        })

    }

    private renderFunnel() {

        const dataDescription = this.chartUtils.describeData(this.props.query, this.props.data.labels);

        let inject: EdaD3 = new EdaD3;
        inject.size = this.props.size;
        inject.id = this.randomID();
        inject.data = this.props.data;
        inject.dataDescription = dataDescription;
        inject.colors = this.props.config.getConfig()['colors'];
        inject.linkedDashboard = this.props.linkedDashboardProps;
        this.createFunnelComponent(inject);
    }

    private createFunnelComponent(inject: any) {
        this.entry.clear();
        const factory = this.resolver.resolveComponentFactory(EdaFunnelComponent);
        this.componentRef = this.entry.createComponent(factory);
        this.componentRef.instance.inject = inject;
        this.componentRef.instance.onClick.subscribe((event) => this.onChartClick.emit({...event, query: this.props.query}));

    }

    private renderBubblechart() {

        const dataDescription = this.chartUtils.describeData(this.props.query, this.props.data.labels);

        let inject: EdaD3 = new EdaD3;
        inject.size = this.props.size;
        inject.id = this.randomID();
        inject.data = this.props.data;
        inject.dataDescription = dataDescription;
        const configColors = this.props.config.getConfig()['colors'];
        inject.colors = (configColors && configColors.length > 0 && configColors) || this.chartUtils.generateChartColorsFromPalette(inject.data.values.length, this.paletaActual)
            .map(item => item.backgroundColor);
        inject.assignedColors = this.props.config.getConfig()['assignedColors'] || [];
        //Tratamiento de assignedColors, cuando no haya valores, asignara un color        
        this.props.config.setConfig(this.assignedColorsWork(this.props.config.getConfig(), inject));
        inject.linkedDashboard = this.props.linkedDashboardProps;

        this.createBubblechartComponent(inject);
    }
    
    private createBubblechartComponent(inject: any) {
        this.entry.clear();
        const factory = this.resolver.resolveComponentFactory(EdaBubblechartComponent);
        this.componentRef = this.entry.createComponent(factory);
        this.componentRef.instance.inject = inject;
        this.componentRef.instance.onClick.subscribe((event) => this.onChartClick.emit({...event, query: this.props.query}));

    }

    private renderTreeMap() {
        const dataDescription = this.chartUtils.describeData(this.props.query, this.props.data.labels);
        let inject: TreeMap = new TreeMap;
        inject.size = this.props.size;
        inject.id = this.randomID();
        inject.data = this.props.data;
        inject.dataDescription = dataDescription;
        const configColors = this.props.config.getConfig()['colors'];
        inject.colors = (configColors && configColors.length > 0 && configColors) || this.chartUtils.generateChartColorsFromPalette(inject.data.values.length, this.paletaActual)
            .map(item => item.backgroundColor);
        inject.assignedColors = this.props.config.getConfig()['assignedColors'] || [];
        //Tratamiento de assignedColors, cuando no haya valores, asignara un color        
        this.props.config.setConfig(this.assignedColorsWork(this.props.config.getConfig(), inject));        
        inject.linkedDashboard = this.props.linkedDashboardProps;
        this.createTreeMap(inject);
    }

    private createTreeMap(inject: any) {
        this.entry.clear();
        const factory = this.resolver.resolveComponentFactory(EdaTreeMap);
        this.componentRef = this.entry.createComponent(factory);
        this.componentRef.instance.inject = inject;
        this.componentRef.instance.onClick.subscribe((event) => this.onChartClick.emit({...event, query: this.props.query}));

    }

    private renderScatter() {

        const dataDescription = this.chartUtils.describeData(this.props.query, this.props.data.labels);

        let inject: ScatterPlot = new ScatterPlot;
        inject.size = this.props.size;
        inject.id = this.randomID();
        inject.data = this.props.data;
        inject.dataDescription = dataDescription;        
        
        const configColors = this.props.config.getConfig()['colors'];
        inject.colors = (configColors && configColors.length > 0 && configColors) || this.chartUtils.generateChartColorsFromPalette(inject.data.values.length, this.paletaActual)
            .map(item => item.backgroundColor);
        inject.assignedColors = this.props.config.getConfig()['assignedColors'] || [];
        //Tratamiento de assignedColors, cuando no haya valores, asignara un color        
        this.props.config.setConfig(this.assignedColorsWork(this.props.config.getConfig(), inject));
        inject.linkedDashboard = this.props.linkedDashboardProps;

        this.createScatter(inject);
    }

    private createScatter(inject: any) {
        this.entry.clear();
        const factory = this.resolver.resolveComponentFactory(EdaScatter);
        this.componentRef = this.entry.createComponent(factory);
        this.componentRef.instance.inject = inject;
        this.componentRef.instance.onClick.subscribe((event) => this.onChartClick.emit({...event, query: this.props.query}));

    }


    private renderSunburst() {
        const dataDescription = this.chartUtils.describeData(this.props.query, this.props.data.labels);
        let inject: SunBurst = new SunBurst;
        inject.size = this.props.size;
        inject.id = this.randomID();
        inject.data = this.props.data;
        inject.dataDescription = dataDescription;
        const configColors = this.props.config.getConfig()['colors'];
        inject.colors = (configColors && configColors.length > 0 && configColors) || this.chartUtils.generateChartColorsFromPalette(inject.data.values.length, this.paletaActual)
            .map(item => item.backgroundColor);
        inject.assignedColors = this.props.config.getConfig()['assignedColors'] || [];
        //Tratamiento de assignedColors, cuando no haya valores, asignara un color        
        this.props.config.setConfig(this.assignedColorsWork(this.props.config.getConfig(), inject));
        inject.linkedDashboard = this.props.linkedDashboardProps;
        this.createSunburst(inject);
    }

    private createSunburst(inject: any) {
        this.entry.clear();
        const factory = this.resolver.resolveComponentFactory(EdaSunburstComponent);
        this.componentRef = this.entry.createComponent(factory);
        this.componentRef.instance.inject = inject;
        this.componentRef.instance.onClick.subscribe((event) => this.onChartClick.emit({...event, query: this.props.query}));
    }

    private renderTreetable() {
        const inject = this.props;
        this.createTreetable(inject);
    }

    private createTreetable(inject: any) {
        this.entry.clear();
        const factory = this.resolver.resolveComponentFactory(EdaTreeTable);
        this.componentRef = this.entry.createComponent(factory);
        this.componentRef.instance.inject = inject; // inject como input al componente Treetable
        this.componentRef.instance.onClick.subscribe((event) => this.onChartClick.emit({...event, query: this.props.query}));
    }

    private randomID() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }

    /**
     * Destroys current component
     */
    public destroyComponent() {
        if (this.componentRef) {
            this.componentRef.destroy();
        }
    }

    public updateComponent() {
        if (this.componentRef && !['table', 'crosstable'].includes(this.props.chartType)) {
            try {
                if (['doughnut', 'polarArea', 'bar', 'horizontalBar', 'line', 'area', 'barline', 'histogram', 'pyramid', 'radar'].includes(this.props.chartType)) {
                    this.componentRef.instance?.updateChart();
                }
                else if (['treeMap', 'sunburst', 'parallelSets', 'bubblechart', 'scatterPlot'].includes(this.props.chartType)) { 
                    this.updateD3ChartColors(this.props.chartType)
                }
            } catch(err) {
                console.error(err);
            }
        }
    }

    public updateD3ChartColors(chartType: string) {
        const numberOfColors = this.componentRef.instance?.colors?.length || 1;
        const newColors = this.chartUtils.generateRGBColorGradientScaleD3(numberOfColors, this.styleProviderService.ActualChartPalette['paleta']);
        switch (chartType) {
            case 'treeMap':
                this.props.config.setConfig(new TreeMapConfig(newColors.map(({ color }) => color).map(color => this.chartUtils.hex2rgbD3(color))));
                this.renderTreeMap();
                break;
            case 'sunburst':
                this.props.config.setConfig(new SunburstConfig(newColors.map(({ color }) => color).map(color => this.chartUtils.hex2rgbD3(color))));
                this.renderSunburst();
                break;
            case 'parallelSets':
                this.props.config.setConfig(new SankeyConfig(newColors.map(({ color }) => color)));
                this.renderParallelSets();
                break;
            case 'scatterPlot':
                this.props.config.setConfig(new ScatterConfig(newColors.map(({ color }) => color)));
                this.renderScatter();
                break;
            case 'bubblechart':
                this.props.config.setConfig(new BubblechartConfig(newColors.map(({ color }) => color).map(color => this.chartUtils.hex2rgbD3(color))));
                this.renderBubblechart();
                break;
            default:
                break;
        }        
    }

    /**
     * Initializes table
     * @param type 
     * @param configs 
     */
    private initializeTable(type: string, configs?: any): EdaTable {

        const tableColumns = [];
        if (this.props.edaChart == 'tableanalized') {
            configs = configs || {};
            configs.rows = 25;
            configs.initRows = 25;
            configs.visibleRows = 25;
            for (const label of this.props.data.labels) {
                tableColumns.push(new EdaColumnText({ header: label, field: label, description: label }));
            }
        } else {
            for (let i = 0, n = this.props.query.length; i < n; i += 1) {

                const label = this.props.data.labels[i];
                const r: Column = this.props.query[i];
    
                if (_.isEqual(r.column_type, 'date')) {
                    tableColumns.push(new EdaColumnDate({ header: r.display_name.default, field: label, description: r.description.default }));
                } else if (_.isEqual(r.column_type, 'numeric')) {
                    tableColumns.push(new EdaColumnNumber({ header: r.display_name.default, field: label, description: r.description.default , decimals: r.minimumFractionDigits}))
                } else if (_.isEqual(r.column_type, 'text')) {
                    tableColumns.push(new EdaColumnText({ header: r.display_name.default, field: label, description: r.description.default }));
                } else if (_.isEqual(r.column_type, 'coordinate')) {
                    tableColumns.push(new EdaColumnNumber({ header: r.display_name.default, field: label, description: r.description.default }));
                }
            }
        }

        if (type === 'table') {
            return new EdaTable({ cols: tableColumns, ...configs });
        } else if (type === 'crosstable') {
            return new EdaTable({ cols: tableColumns, pivot: true, ...configs });
        }

    }

    private assignedColorsWork(config, inject) { 
        inject.data.values.forEach((injectValue, index) => {
            //Primer string encontrado(valor del filtro)
            const injectValueString = injectValue.find(value => typeof value === 'string');
            if (!config || !config['assignedColors']?.some(item => item.value === injectValueString)) { 
                inject.assignedColors.push({
                    value: injectValueString, color: inject.colors[index] ||
                    `rgb(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)})`
                });
            } else {
                let mapValues = inject.assignedColors.map(item => item.value);
                inject.colors[index] = inject.assignedColors[mapValues.findIndex(value => value === injectValueString)]['color'];
            }
        });
        config = inject;
        return config;
    }


    private assignedColorsWork2(config, inject) { 
        inject.assignedColors = [];
        const usedColors: { [key: string]: string } = {}; // mapa value → color
        let colorIndex = 0; // solo avanza cuando aparece un nuevo valor

        inject.data.values.forEach((injectValue) => {
            // Primer string encontrado (valor del filtro)
            const injectValueString = injectValue.find(value => typeof value === 'string');

            if (!usedColors[injectValueString]) {
                // si es la primera vez que aparece, asignar color
                usedColors[injectValueString] = inject.colors[colorIndex] || 
                    `rgb(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)})`;
                colorIndex++; // avanzamos el índice SOLO para nuevos valores
            }

            // añadimos al array el valor con su color ya definido
            inject.assignedColors.push({
                value: injectValueString,
                color: usedColors[injectValueString]
            });
        });

        config = inject;
        return config;
    }
    
    private getUniqueNamesFromDataset(chartDataset) {  
        // Extraer solo los labels
        const allNames = chartDataset.map(dataset => dataset.label);

        // Crear set para obtener únicos
        const uniqueNames = [...new Set(allNames)];

        return uniqueNames;
    }


    getColors (dataLength, colors) {
        const colorsLength = colors.length
        let outputColors: Array<any> = colors

        if (dataLength > colorsLength) {
            let repeat = Math.ceil(dataLength / colorsLength)
            for (let i = 0; i < repeat - 1; i++) {
                outputColors = [...outputColors, ...colors]
            }
        }
        return outputColors
        .filter((_, index) => index < dataLength)
        .map(color => `rgb(${color[0]}, ${color[1]}, ${color[2]} )`)
    }

    encontrarBackgroundColor(obj) {
        if (!obj || typeof obj !== "object") return null;

        if (obj.backgroundColor && typeof obj.backgroundColor === "string") {
            return obj.backgroundColor;
        }

        // Buscar en la propiedad backgroundColor si es otro objeto
        if (obj.backgroundColor && typeof obj.backgroundColor === "object") {
            return this.encontrarBackgroundColor(obj.backgroundColor);
        }

        // Buscar en otras propiedades si existe
        for (let key in obj) {
            if (typeof obj[key] === "object") {
            const resultado = this.encontrarBackgroundColor(obj[key]);
            if (resultado) return resultado;
            }
        }

        return null;
    }

    /**
     * @return current chart config
     */
    public getCurrentConfig() {
        return this.currentConfig;
    }
}