import { EdaKnob } from './../../../eda-knob/edaKnob';
import { EdaKnobComponent } from './../../../eda-knob/eda-knob.component';
import { EdaScatter } from './../../../eda-scatter/eda-scatter.component';
import { EdaTreeMap } from './../../../eda-treemap/eda-treemap.component';
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


    public histoGramRangesTxt: string = $localize`:@@histoGramRangesTxt:Rango`;
    public histoGramDescTxt: string = $localize`:@@histoGramDescTxt:Número de`;
    public histoGramDescTxt2: string = $localize`:@@histoGramDescTxt2:en este rango`;


    constructor(
        public resolver: ComponentFactoryResolver,
        private chartUtils: ChartUtilsService,
        @Self() private ownRef: ElementRef,
        public styleProviderService: StyleProviderService) {

        this.styleProviderService.panelFontColor.subscribe(color => {
            this.fontColor = color;
            if(this.props && ['doughnut', 'polarArea', 'bar', 'horizontalBar', 'line', 'area', 'barline', 'histogram', 'bubblechart','pyramid'].includes(this.props.chartType)) this.ngOnChanges(null);
        });

        this.styleProviderService.panelFontFamily.subscribe(family => {
            this.fontFamily = family;
            if(this.props && ['doughnut', 'polarArea', 'bar', 'horizontalBar', 'line', 'area', 'barline', 'histogram', 'bubblechart','pyramid'].includes(this.props.chartType)) this.ngOnChanges(null);
        });

        this.styleProviderService.panelFontSize.subscribe(size => {
            this.fontSize = size;
            if(this.props && ['doughnut', 'polarArea', 'bar', 'horizontalBar', 'line','area', 'barline', 'histogram', 'bubblechart','pyramid'].includes(this.props.chartType)) this.ngOnChanges(null);
        });
    }


    ngOnInit(): void {
        this.NO_DATA = false;
        this.NO_DATA_ALLOWED = false;
        this.NO_FILTER_ALLOWED = false;
    }

    ngOnChanges(changes: SimpleChanges): void {
        /**
         * If data change chart type
         */

        if (this.props.data && this.props.data.values.length !== 0
            && !this.props.data.values.reduce((a, b) => a && b.every(element => element === null), true)) {

            setTimeout(_ => {
                this.NO_DATA = false;
            });

            this.changeChartType();

        }
        /**
         * If no data
         */
        else {
            this.destroyComponent();
            setTimeout(_ => {
                this.NO_DATA = true;
                if( this.props.data.labels[0]== "noDataAllowed") {
                    this.NO_DATA = false;    
                    this.NO_DATA_ALLOWED = true;   
                    this.NO_FILTER_ALLOWED = false; 
                }else if( this.props.data.labels[0]== "noFilterAllowed") {
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
        if (['doughnut', 'polarArea', 'bar', 'horizontalBar', 'line', 'area', 'barline',  'histogram' ,'pyramid'].includes(type)) {
            this.renderEdaChart(type);
        }
        if (type === 'kpi') {
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
        if (  (['histogram'].includes(this.props.edaChart))
            && this.props.query.length === 1
            && this.props.query.filter(field => field.column_type === 'numeric').length == 1
            ) {
            let newCol = { name:  this.histoGramRangesTxt , index: 0 };
            dataDescription.otherColumns.push(newCol);
            dataDescription.numericColumns[0].index=1
            dataDescription.totalColumns++;
            dataDescription.numericColumns[0].name = this.histoGramDescTxt+" " +  dataDescription.numericColumns[0].name + " " + this.histoGramDescTxt2;
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

        const chartData = this.chartUtils.transformDataQuery(this.props.chartType, this.props.edaChart,  values, dataTypes, dataDescription, isbarline, cfg.numberOfColumns);

        if (chartData.length == 0) {
            chartData.push([], []);
        }

        const minMax = this.props.chartType !== 'line' ? { min: null, max: null } : this.chartUtils.getMinMax(chartData);

        const manySeries = chartData[1]?.length > 10 ? true : false;

        const styles:StyleConfig = {
            fontFamily: this.fontFamily,
            fontSize: this.fontSize,
            fontColor: this.fontColor
        }
      
      
        const config = this.chartUtils.initChartOptions(this.props.chartType, dataDescription.numericColumns[0]?.name,
            dataDescription.otherColumns, manySeries, isstacked, this.getDimensions(), this.props.linkedDashboardProps, 
            minMax, styles, cfg.showLabels, cfg.showLabelsPercent, cfg.numberOfColumns, this.props.edaChart);


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
        chartConfig.chartDataset = chartData[1];
        chartConfig.chartOptions = config.chartOptions;
        chartConfig.chartColors = this.chartUtils.recoverChartColors(this.props.chartType, this.props.config);
        
        if(!chartData[1][0]?.backgroundColor){
            chartData[1].forEach(( e,i) => {
                try{
                    e.backgroundColor = chartConfig.chartColors[i].backgroundColor;
                    e.borderColor = chartConfig.chartColors[i].borderColor;
                }catch(err){
                    // si tinc una tendencia no tinc color per aquesta grafica. No hauria de ser aixi.....
                       //console.log('Recuperando color...');
                        //console.log(this.chartUtils.generateColors(this.props.chartType )[i].backgroundColor);
                        e.backgroundColor =   this.chartUtils.generateColors(this.props.chartType )[i].backgroundColor;
                        e.borderColor = this.chartUtils.generateColors(this.props.chartType )[i].borderColor;
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
        this.configUpdated.emit();
    }

    /**
      * Creates a table component
      * @param inject chart configuration
      */
    private createEdatableComponent(type: string) {

        this.entry.clear();

        const factory = this.resolver.resolveComponentFactory(EdaTableComponent);
        this.componentRef = this.entry.createComponent(factory);
        this.componentRef.instance.inject = this.initializeTable(type, this.props.config.getConfig());
        this.componentRef.instance.inject.value = this.chartUtils.transformDataQueryForTable(this.componentRef.instance.inject.noRepetitions, this.props.data.labels, this.props.data.values);
        const config = this.props.config.getConfig();

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
        this.configUpdated.emit();
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
        let chartConfig: any = {};
        chartConfig.value = this.props.data.values[0][0];
        chartConfig.header = this.props.query[0]?.display_name?.default;
        const config: any = this.props.config;
        let alertLimits = [];
        try{
            alertLimits = config.config.alertLimits;
        }catch(e){
            console.log('No alert Limits definied in config... ');
            console.log(e);
        }
        if (config) {
            try{
            chartConfig.sufix = (<KpiConfig>config.getConfig()).sufix;
            }catch(e){
                chartConfig.sufix = '';
                console.log('No sufix defined inc config.... ');
                console.log(e)
            }
                chartConfig.alertLimits = alertLimits;
         
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
            const kpiConfig = new KpiConfig(data.sufix, inject.alertLimits);
            (<KpiConfig><unknown>this.props.config.setConfig(kpiConfig));
        })
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
        try{
            inject.coordinates = this.props.config['config']['coordinates'];
        }catch{
            inject.coordinates = null ;
        }
        try{
            inject.zoom = this.props.config['config']['zoom'];
        }catch{
            inject.zoom =  null ;
        }
        try{
            inject.color = this.props.config['config']['color']  ;
        }catch{
            inject.color =  '#006400';
        }
        try{
            inject.logarithmicScale = this.props.config['config']['logarithmicScale']  ;
        }catch{
            inject.logarithmicScale =  false;
        }
        try{
            inject.legendPosition = this.props.config['config']['legendPosition']  ;
        }catch{
            inject.legendPosition =  'bottomleft';
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
    }

    private createGeoJsonMapComponent(inject: EdaMap) {
        this.entry.clear();
        const factory = this.resolver.resolveComponentFactory(EdaGeoJsonMapComponent);
        this.componentRef = this.entry.createComponent(factory);
        this.componentRef.instance.inject = inject;
    }

    private renderParallelSets() {

        const dataDescription = this.chartUtils.describeData(this.props.query, this.props.data.labels);

        let inject: EdaD3 = new EdaD3;
        inject.size = this.props.size;
        inject.id = this.randomID();
        inject.data = this.props.data;
        inject.dataDescription = dataDescription;
        inject.colors = this.props.config.getConfig()['colors'];
        inject.linkedDashboard = this.props.linkedDashboardProps;

        this.createParallelSetsComponent(inject);
    }

    private createParallelSetsComponent(inject: any) {
        this.entry.clear();
        const factory = this.resolver.resolveComponentFactory(EdaD3Component);
        this.componentRef = this.entry.createComponent(factory);
        this.componentRef.instance.inject = inject;

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

    }

    private renderBubblechart() {

        const dataDescription = this.chartUtils.describeData(this.props.query, this.props.data.labels);

        let inject: EdaD3 = new EdaD3;
        inject.size = this.props.size;
        inject.id = this.randomID();
        inject.data = this.props.data;
        inject.dataDescription = dataDescription;
        inject.colors = this.props.config.getConfig()['colors'];
        inject.linkedDashboard = this.props.linkedDashboardProps;

        this.createBubblechartComponent(inject);
    }
    
    private createBubblechartComponent(inject: any) {
        this.entry.clear();
        const factory = this.resolver.resolveComponentFactory(EdaBubblechartComponent);
        this.componentRef = this.entry.createComponent(factory);
        this.componentRef.instance.inject = inject;

    }

    private renderTreeMap() {

        const dataDescription = this.chartUtils.describeData(this.props.query, this.props.data.labels);

        let inject: TreeMap = new TreeMap;
        inject.size = this.props.size;
        inject.id = this.randomID();
        inject.data = this.props.data;
        inject.dataDescription = dataDescription;
        inject.colors = this.props.config.getConfig()['colors'];
        inject.linkedDashboard = this.props.linkedDashboardProps;

        this.createTreeMap(inject);
    }

    private createTreeMap(inject: any) {
        this.entry.clear();
        const factory = this.resolver.resolveComponentFactory(EdaTreeMap);
        this.componentRef = this.entry.createComponent(factory);
        this.componentRef.instance.inject = inject;

    }

    private renderScatter() {

        const dataDescription = this.chartUtils.describeData(this.props.query, this.props.data.labels);

        let inject: ScatterPlot = new ScatterPlot;
        inject.size = this.props.size;
        inject.id = this.randomID();
        inject.data = this.props.data;
        inject.dataDescription = dataDescription;
        inject.colors = this.props.config.getConfig()['colors'];
        inject.linkedDashboard = this.props.linkedDashboardProps;

        this.createScatter(inject);
    }

    private createScatter(inject: any) {
        this.entry.clear();
        const factory = this.resolver.resolveComponentFactory(EdaScatter);
        this.componentRef = this.entry.createComponent(factory);
        this.componentRef.instance.inject = inject;

    }


    private renderSunburst() {

        const dataDescription = this.chartUtils.describeData(this.props.query, this.props.data.labels);

        let inject: SunBurst = new SunBurst;

        inject.size = this.props.size;
        inject.id = this.randomID();
        inject.data = this.props.data;
        inject.dataDescription = dataDescription;
        inject.colors = this.props.config.getConfig()['colors'];
        inject.linkedDashboard = this.props.linkedDashboardProps;

        this.createSunburst(inject);
    }

    private createSunburst(inject: any) {
        this.entry.clear();
        const factory = this.resolver.resolveComponentFactory(EdaSunburstComponent);
        this.componentRef = this.entry.createComponent(factory);
        this.componentRef.instance.inject = inject;

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
                this.componentRef.instance?.updateChart();
            } catch(err) {
                console.error(err);
            }
        }
    }

    /**
     * Initializes table
     * @param type 
     * @param configs 
     */
    private initializeTable(type: string, configs?: any): EdaTable {
        const tableColumns = [];
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
        if (type === 'table') {
            return new EdaTable({ cols: tableColumns, ...configs });
        } else if (type === 'crosstable') {
            return new EdaTable({ cols: tableColumns, pivot: true, ...configs });
        }

    }

    /**
     * @return current chart config
     */
    public getCurrentConfig() {
        return this.currentConfig;
    }
}