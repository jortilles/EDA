import { EdaKnob } from './../../../eda-knob/edaKnob';
import { EdaKnobComponent } from './../../../eda-knob/eda-knob.component';
import { EdaScatter } from './../../../eda-scatter/eda-scatter.component';
import { EdaTreeMap } from './../../../eda-treemap/eda-treemap.component';

import { EdaTreeTable } from './../../../eda-treetable/eda-treetable.component';

import { TreeMap } from './../../../eda-treemap/eda-treeMap';
import { EdaD3Component } from './../../../eda-d3/eda-d3.component';
import { TableConfig } from './chart-configuration-models/table-config';
import { Component, OnInit, Input, SimpleChanges, OnChanges, ViewChild, ViewContainerRef, ComponentFactoryResolver,
    OnDestroy, Output, EventEmitter, Self, ElementRef,} from '@angular/core';
import { EdadynamicTextComponent } from '../../../eda-dynamicText/eda-dynamicText.component';
import { EdaTableComponent } from '../../../eda-table/eda-table.component';
import { PanelChart } from './panel-chart';
import { ChartUtilsService, StyleConfig, StyleProviderService } from '@eda/services/service.index';
import { EdaKpiComponent } from '@eda/components/eda-kpi/eda-kpi.component';
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
import { BubblechartConfig } from './chart-configuration-models/bubblechart.config';
import { FormsModule } from '@angular/forms'; 
import { CommonModule } from '@angular/common';
import { FunnelConfig } from './chart-configuration-models/funnel.config';

@Component({
    standalone: true,
    selector: 'panel-chart',
    templateUrl: './panel-chart.component.html',
    imports: [FormsModule, CommonModule]
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
    private renderEdaChart(subType: string) {
        let values = _.cloneDeep(this.props.data.values);
        const dataTypes = this.props.query.map(col => col.column_type);
        const dataDescription = this.chartUtils.describeData(this.props.query, this.props.data.labels);
        const isstacked = _.includes(['stackedbar', 'stackedbar100', 'pyramid'], this.props.edaChart);
        const isbarline = this.props.edaChart === 'barline';

        if (this.props.chartType === 'bar' && this.props.edaChart === 'histogram') {
            dataDescription.numericColumns[0].name = this.histoGramDescTxt + " " + dataDescription.numericColumns[0].name + " " + this.histoGramDescTxt2;
        }
        
        let cfg: any = this.props.config.getConfig();
        // COMPARATIVAS
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
        // PREDICTION LINES
        if(cfg.showPredictionLines === true){  
            // Añadimos la nueva serie de predicción
            dataDescription.numericColumns.push({name: $localize`:@@Prediction:Predicción`, index:2 });
            dataTypes.push('numeric');
            values = values.map(innerArray => innerArray.map(item => item === "" ? null : item));
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
            minMax, styles, cfg.showLabels, cfg.showLabelsPercent, cfg.showPointLines, cfg.showPredictionLines, cfg.numberOfColumns, this.props.edaChart, ticksOptions, false, this.styleProviderService);

        // TENDECNIAS
        if (cfg.addTrend && (cfg.chartType === 'line')) {
            let trends = [];
            let predictionSerie = cfg.showPredictionLines; 
            chartData[1].forEach(serie => {
                // No añadiremos tendencia cuando tengamos showPrectionLines y sea la ultima serie 
                if(!predictionSerie || (predictionSerie && serie !== chartData[1][chartData[1].length -1])) {
                    let trend = this.chartUtils.getTrend(serie);
                    trends.push(trend);
                }
            });
            trends.forEach(trend => chartData[1].push(trend));
        }
                
        let chartConfig: any = {};
        chartConfig.chartType = this.props.chartType;
        chartConfig.edaChart = this.props.edaChart;
        chartConfig.chartLabels = chartData[0];
        chartConfig.chartDataset = chartData[1];
        chartConfig.chartOptions = config.chartOptions;

        // Leer assignedColors del config (si existen)
        let assignedColors = this.props.config.getConfig()['assignedColors'] || [];

        // Si NO hay assignedColors, generarlos desde la paleta
        if (assignedColors.length === 0) {
            // Obtener labels según tipo de chart
            const labels = this.getLabelsForChartType(chartConfig);
            
            // Generar assignedColors usando la paleta actual
            assignedColors = this.chartUtils.resolveAssignedColors(labels, [], this.paletaActual);
            // Guardar en config para persistencia
            this.props.config.getConfig()['assignedColors'] = assignedColors;
        } 

        // Asignar al chartConfig
        chartConfig.assignedColors = assignedColors;

        // Generar chartColors en formato Chart.js desde assignedColors
        chartConfig.chartColors = this.chartUtils.generateChartColorsFromAssignedColors(
            assignedColors,
            this.props.chartType
        );

        // Aplicar backgroundColor y borderColor a los datasets
        // chartColors únicamente se reflejan si están dentro del chartDataset
        if (!chartData[1][0]?.backgroundColor) {
            chartData[1].forEach((dataset, i) => {
                try {
                    dataset.backgroundColor = chartConfig.chartColors[i]?.backgroundColor;
                    dataset.borderColor = chartConfig.chartColors[i]?.borderColor;
                } catch (err) {
                    // Si hay una tendencia sin color asignado, usar color por defecto de la paleta
                    const fallbackColor = this.paletaActual[i % this.paletaActual.length];
                    dataset.backgroundColor = fallbackColor;
                    dataset.borderColor = fallbackColor;
                }
            });
        }

        chartConfig.linkedDashboardProps = this.props.linkedDashboardProps;
        this.createEdaChartComponent(chartConfig);
    }


    /**
     * Obtiene los labels apropiados según el tipo de chart
     * Para crear assignedColors correctamente
     */
    private getLabelsForChartType(chartConfig: any): string[] {
        const type = chartConfig.chartType;
        const edaChart = chartConfig.edaChart;
        
        switch (type) {
            case 'doughnut':
            case 'polarArea':
                // Los colores van por categoría (labels del eje X)
                return chartConfig.chartLabels || [];
                
            case 'bar':
                if (edaChart === 'histogram') {
                    // Histogram solo tiene un dataset/color
                    return chartConfig.chartDataset && chartConfig.chartDataset[0] 
                        ? [chartConfig.chartDataset[0].label || 'Histogram'] 
                        : ['Histogram'];
                }
            default:
                // Bar, Line, Radar, Stacked, etc.
                // Los colores van por serie (datasets)
                return chartConfig.chartDataset?.map(d => d.label || '') || [];
        }
    }

    /**
     * Creates a chart component
     * @param inject chart configuration
     */
    private createEdaChartComponent(inject: any) {
        this.currentConfig = inject;
        this.entry.clear();
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

        this.componentRef = this.entry.createComponent(EdaTableComponent);
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
        chartConfig.assignedColors = this.props.config['config']['assignedColors'] ? this.props.config['config']['assignedColors'] : null;
        chartConfig.limits = this.props.config['config']['limits'] ? this.props.config['config']['limits'] : null;
        this.createEdaKnobComponent(chartConfig)
    }

    private createEdaKnobComponent(inject) {
        this.entry.clear();
        this.componentRef = this.entry.createComponent(EdaKnobComponent);
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
        this.componentRef = this.entry.createComponent(EdaKpiComponent);
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
            minMax, styles, cfg.showLabels, cfg.showLabelsPercent, cfg.showPointLines,cfg.showPredictionLines,  cfg.numberOfColumns, chartSubType, ticksOptions, false, this.styleProviderService
        );
        // let chartConfig: any = {};
        chartConfig.edaChart = {}
        chartConfig.showChart = true;
        chartConfig.edaChart.edaChart = chartSubType;
        chartConfig.edaChart.chartType = chartType;
        chartConfig.edaChart.chartLabels = chartData[0];
        chartConfig.edaChart.chartDataset = chartData[1];
        chartConfig.edaChart.chartOptions = chartOptions.chartOptions;

        
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
        this.componentRef = this.entry.createComponent(EdaKpiComponent);
        this.componentRef.instance.inject = inject;

        this.componentRef.instance.onNotify.subscribe(data => {
            const kpiConfig = new KpiConfig({ sufix: data.sufix, alertLimits: inject.alertLimits||[], edaChart: inject.edaChart });
            (<KpiConfig><unknown>this.props.config.setConfig(kpiConfig));
        })
        this.configUpdated.emit(this.currentConfig);;

        this.componentRef = this.entry.createComponent(EdaChartComponent);
        this.componentRef.instance.inject = inject;
        // this.componentRef.instance.onClick.subscribe((event) => this.onChartClick.emit({...event, query: this.props.query}));
        this.configUpdated.emit(this.currentConfig);;
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
        this.componentRef = this.entry.createComponent(EdadynamicTextComponent);
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
        this.componentRef = this.entry.createComponent(EdaMapComponent);
        this.componentRef.instance.inject = inject;
        //this.componentRef.instance.onClick.subscribe((event) => this.onChartClick.emit({...event, query: this.props.query}));
    }
    
    private createGeoJsonMapComponent(inject: EdaMap) {
        this.entry.clear();
        this.componentRef = this.entry.createComponent(EdaGeoJsonMapComponent);
        this.componentRef.instance.inject = inject;
        // Revisar filtro en click 
        this.componentRef.instance.onClick.subscribe((event) => this.onChartClick.emit({...event, query: this.props.query}));
    }


    private renderParallelSets() {
        const dataDescription = this.chartUtils.describeData(this.props.query, this.props.data.labels);

        let inject: EdaD3 = new EdaD3;
        inject.id = this.randomID();
        inject.size = this.props.size;
        inject.data = this.props.data;
        inject.dataDescription = dataDescription;
        inject.linkedDashboard = this.props.linkedDashboardProps;
        const categoryIndex = dataDescription.otherColumns[0].index;
        const categories = [...new Set(inject.data.values.map(row => row[categoryIndex]))];
        
        //Tratamiento de assignedColors, cuando no haya valores, asignara un color        
        inject.assignedColors = this.chartUtils.resolveAssignedColors(
            categories, this.props.config.getConfig()['assignedColors'] || [], this.paletaActual
        );
        
        this.props.config.setConfig({ ...this.props.config.getConfig(), assignedColors: inject.assignedColors });
        this.createParallelSetsComponent(inject);
    }

    private createParallelSetsComponent(inject: any) {
        this.entry.clear();
        this.componentRef = this.entry.createComponent(EdaD3Component);
        this.componentRef.instance.inject = inject;
        this.componentRef.instance.onClick.subscribe((event) => {
            this.onChartClick.emit({ ...event, query: this.props.query });
        })

    }

    private renderFunnel() {
        if (!this.props?.data?.values?.length) {
            return;
        }

        const dataDescription = this.chartUtils.describeData(this.props.query, this.props.data.labels);
        const inject: EdaD3 = new EdaD3();
        inject.id = this.randomID();
        inject.size = this.props.size;
        inject.data = this.props.data;
        inject.dataDescription = dataDescription;
        inject.linkedDashboard = this.props.linkedDashboardProps;

        // Obtener colores guardados
        let assignedColors = this.props.config.getConfig()['assignedColors'];

        // Si no hay colores guardados o están incompletos, crear defaults
        if (!assignedColors || !Array.isArray(assignedColors) || assignedColors.length < 2) {
            assignedColors = [
                { value: 'start', color: this.paletaActual[0] },
                { value: 'end', color: this.paletaActual[this.paletaActual.length - 1] }
            ];

            // SOLO guardar si no existían antes
            this.props.config.getConfig()['assignedColors'] = assignedColors;
        }
        // Usar los colores (ya sean guardados o defaults)
        inject.assignedColors = assignedColors;

        this.createFunnelComponent(inject);
    }

    private createFunnelComponent(inject: any) {
        this.entry.clear();
        this.componentRef = this.entry.createComponent(EdaFunnelComponent);
        this.componentRef.instance.inject = inject;
        this.componentRef.instance.onClick.subscribe((event) => 
            this.onChartClick.emit({...event, query: this.props.query})
        );
    }

    private renderBubblechart() {
        const dataDescription = this.chartUtils.describeData(this.props.query, this.props.data.labels);
        let inject: EdaD3 = new EdaD3;
        inject.id = this.randomID();
        inject.size = this.props.size;
        inject.data = this.props.data;
        inject.dataDescription = dataDescription;
        inject.linkedDashboard = this.props.linkedDashboardProps;
        const categoryIndex = dataDescription.otherColumns[0].index;
        const categories = [...new Set(inject.data.values.map(row => row[categoryIndex]))];
        //Tratamiento de assignedColors, cuando no haya valores, asignara un color        
        inject.assignedColors = this.chartUtils.resolveAssignedColors(
            categories, this.props.config.getConfig()['assignedColors'] || [], this.paletaActual
        );
        this.props.config.setConfig({ ...this.props.config.getConfig(), assignedColors: inject.assignedColors });
        this.createBubblechartComponent(inject);
    }
    
    private createBubblechartComponent(inject: any) {
        this.entry.clear();
        this.componentRef = this.entry.createComponent(EdaBubblechartComponent);
        this.componentRef.instance.inject = inject;
        this.componentRef.instance.onClick.subscribe((event) => this.onChartClick.emit({...event, query: this.props.query}));

    }

    private renderTreeMap() {
        const dataDescription = this.chartUtils.describeData(this.props.query, this.props.data.labels);
        const inject: TreeMap = new TreeMap();
        inject.id = this.randomID();
        inject.size = this.props.size;
        inject.data = this.props.data;
        inject.dataDescription = dataDescription;
        inject.linkedDashboard = this.props.linkedDashboardProps;
        const categoryIndex = dataDescription.otherColumns[0].index;
        const categories = [...new Set(inject.data.values.map(row => row[categoryIndex]))];
        // Generar assignedColors
        inject.assignedColors = this.chartUtils.resolveAssignedColors(
            categories, this.props.config.getConfig()['assignedColors'] || [], this.paletaActual
        );
        this.props.config.setConfig({ ...this.props.config.getConfig(), assignedColors: inject.assignedColors });
        this.createTreeMap(inject);
    }


    private createTreeMap(inject: any) {
        this.entry.clear();
        this.componentRef = this.entry.createComponent(EdaTreeMap);
        this.componentRef.instance.inject = inject;
        this.componentRef.instance.onClick.subscribe((event) => this.onChartClick.emit({...event, query: this.props.query}));
    }

    private renderScatter() {

        const dataDescription = this.chartUtils.describeData(this.props.query, this.props.data.labels);
        let inject: ScatterPlot = new ScatterPlot;
        inject.id = this.randomID();
        inject.size = this.props.size;
        inject.data = this.props.data;
        inject.dataDescription = dataDescription;        
        inject.linkedDashboard = this.props.linkedDashboardProps;
        
        const categoryIndex = dataDescription.otherColumns[0].index;
        const categories = [...new Set(inject.data.values.map(row => row[categoryIndex]))];
        
        //Tratamiento de assignedColors, cuando no haya valores, asignara un color        
        inject.assignedColors = this.chartUtils.resolveAssignedColors(
            categories, this.props.config.getConfig()['assignedColors'] || [], this.paletaActual
        );

        this.props.config.setConfig({ ...this.props.config.getConfig(), assignedColors: inject.assignedColors });
        this.createScatter(inject);
    }

    private createScatter(inject: any) {
        this.entry.clear();
        this.componentRef = this.entry.createComponent(EdaScatter);
        this.componentRef.instance.inject = inject;
        this.componentRef.instance.onClick.subscribe((event) => this.onChartClick.emit({...event, query: this.props.query}));

    }


    private renderSunburst() {
        const dataDescription = this.chartUtils.describeData(this.props.query, this.props.data.labels);
        let inject: SunBurst = new SunBurst;
        inject.id = this.randomID();
        inject.size = this.props.size;
        inject.data = this.props.data;
        inject.dataDescription = dataDescription;
        inject.linkedDashboard = this.props.linkedDashboardProps;
        const categoryIndex = dataDescription.otherColumns[0].index;
        const categories = [...new Set(inject.data.values.map(row => row[categoryIndex]))];
        //Tratamiento de assignedColors, cuando no haya valores, asignara un color        
        inject.assignedColors = this.chartUtils.resolveAssignedColors(
            categories, this.props.config.getConfig()['assignedColors'] || [], this.paletaActual
        );      
        this.props.config.setConfig({ ...this.props.config.getConfig(), assignedColors: inject.assignedColors });
        this.createSunburst(inject);
    }

    private createSunburst(inject: any) {
        this.entry.clear();
        this.componentRef = this.entry.createComponent(EdaSunburstComponent);
        this.componentRef.instance.inject = inject;
        this.componentRef.instance.onClick.subscribe((event) => this.onChartClick.emit({...event, query: this.props.query}));
    }

    private renderTreetable() {
        const inject = this.props;
        this.createTreetable(inject);
    }

    private createTreetable(inject: any) {
        this.entry.clear();
        this.componentRef = this.entry.createComponent(EdaTreeTable);
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
                else if (['treeMap', 'sunburst','funnel', 'parallelSets', 'bubblechart', 'scatterPlot'].includes(this.props.chartType)) { 
                    this.updateD3ChartColors(this.props.chartType)
                }
            } catch(err) {
                console.error(err);
            }
        }
    }

    public updateD3ChartColors(chartType: string) {
        let newColors: Array<{ color: string }> = [];
        let palette = this.styleProviderService?.ActualChartPalette?.['paleta'];
        if (this.styleProviderService.loadingFromPalette) {
            // Genera colores en Hex segun la paleta
            for (let i = 0; i < length; i++) {newColors.push(palette[i % palette.length]);}
        } else {
            return; // No hay que modificar nada
        }
        switch (chartType) {
            case 'treeMap':
                this.props.config.setConfig(new TreeMapConfig(newColors.map(({ color }) => color)));
                this.renderTreeMap();
                break;
            case 'sunburst':
                this.props.config.setConfig(new SunburstConfig(newColors.map(({ color }) => color)));
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
            case 'funnel':
                this.props.config.setConfig(new FunnelConfig(newColors.map(({ color }) => color)));
                this.renderFunnel();
                break;
            case 'bubblechart':
                this.props.config.setConfig(new BubblechartConfig(newColors.map(({ color }) => color)));
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

    /**
     * @return current chart config
     */
    public getCurrentConfig() {
        return this.currentConfig;
    }
}