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
import { EdaColumnHtml } from '@eda/components/eda-table/eda-columns/eda-column-html';
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
import { KnobConfig } from './chart-configuration-models/knob-config';
import { MapConfig } from './chart-configuration-models/map-config';
import { ChartJsConfig } from './chart-configuration-models/chart-js-config';
import { Subscription } from 'rxjs';

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
    private chartClickSubscription: Subscription;


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
        const _predQueryLen = this.props.query?.length || 0;
        const _hasPredCols = values?.length > 0 && (values[0]?.length || 0) > _predQueryLen;
        if (cfg.showPredictionLines === true || _hasPredCols)
            values = this._preparePredictionValues(values, dataDescription, dataTypes, cfg, _predQueryLen, _hasPredCols);

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

        if (cfg.showPredictionLines === true && _hasPredCols && chartData[1]?.length > 0){
            this._hideConnectingDot(chartData);
        }
        // TENDECNIAS
        if (cfg.addTrend && cfg.chartType === 'line' && chartData[1]?.length > 0) {
            const trends = [];
            const predictionSerie = cfg.showPredictionLines === true;
            const lastSerie = predictionSerie ? chartData[1][chartData[1].length - 1] : null;
            chartData[1].forEach((serie: any) => {
                if (!predictionSerie || serie !== lastSerie) {
                    trends.push(this.chartUtils.getTrend(serie));
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

        // Obtener los labels actuales del chart (después de aplicar filtros)
        const currentLabels = this.getLabelsForChartType(chartConfig);
        
        // Si NO hay assignedColors, generarlos desde la paleta
        if (assignedColors.length === 0) {
            assignedColors = this.chartUtils.resolveAssignedColors(currentLabels, [], this.paletaActual);
            this.props.config.getConfig()['assignedColors'] = assignedColors;
        } else {
            // Mapear assignedColors a los labels actuales
            // Crear un Map para búsqueda rápida por valor
            const colorMap = new Map(assignedColors.map(ac => [ac.value, ac.color]));
            
            // Mapear colores basándose en los labels ACTUALES
            const mappedAssignedColors = currentLabels.map((label, index) => {
                // Buscar el color asignado para este label
                const assignedColor = colorMap.get(label);
                
                if (assignedColor) {
                    // Si existe un color asignado para este label, usarlo
                    return { value: label, color: assignedColor };
                } else {
                    // Si es un label nuevo (no estaba en assignedColors), usar color de la paleta
                    const fallbackColor = this.paletaActual[index % this.paletaActual.length];
                    return { value: label, color: fallbackColor };
                }
            });
            
            // Actualizar assignedColors con los colores mapeados
            assignedColors = mappedAssignedColors;
        }

        // Asignar al chartConfig
        chartConfig.assignedColors = assignedColors;

        // Generar chartColors en formato Chart.js desde assignedColors MAPEADOS
        chartConfig.chartColors = this.chartUtils.generateChartColorsFromAssignedColors(
            assignedColors, 
            this.props.chartType
        );

        // Aplicar backgroundColor y borderColor a los datasets
        if (!chartData[1][0]?.backgroundColor) {
            chartData[1].forEach((dataset, i) => {
                try {
                    dataset.backgroundColor = chartConfig.chartColors[i]?.backgroundColor;
                    dataset.borderColor = chartConfig.chartColors[i]?.borderColor;
                } catch (err) {
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
        this.chartClickSubscription = this.componentRef.instance.onClick.subscribe(
            (event) => this.onChartClick.emit({...event, query: this.props.query})
        );
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
        const rowLen = this.props.data.values?.[0]?.length || 0;
        const queryLen = this.props.query?.length || 0;
        const hasPredictionData = rowLen > queryLen;
        const { tableLabels, tableValues } = hasPredictionData
            ? this._prepareTablePredictionData(this.props.data.labels, this.props.data.values, queryLen)
            : { tableLabels: this.props.data.labels, tableValues: this.props.data.values };
        this.componentRef.instance.inject = this.initializeTable(type, config, tableLabels);
        this.componentRef.instance.inject.value = this.chartUtils.transformDataQueryForTable(tableLabels, tableValues);
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

    const chartData = this.chartUtils.transformDataQuery(chartType, chartSubType, values, dataTypes, dataDescription, false, cfg.numberOfColumns);

    if (chartData.length == 0) {
        chartData.push([], []);
    }

    const minMax = chartType !== 'line' ? { min: null, max: null } : this.chartUtils.getMinMax(chartData);

    const manySeries = chartData[1]?.length > 10 ? true : false;

    const styles: StyleConfig = {
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
        minMax, styles, cfg.showLabels, cfg.showLabelsPercent, cfg.showPointLines, cfg.showPredictionLines, cfg.numberOfColumns, chartSubType, ticksOptions, false, this.styleProviderService
    );

    // Inicializar chartConfig
    chartConfig.edaChart = {}
    chartConfig.showChart = true;
    chartConfig.edaChart.edaChart = chartSubType;
    chartConfig.edaChart.chartType = chartType;
    chartConfig.edaChart.chartLabels = chartData[0];
    chartConfig.edaChart.chartDataset = chartData[1];
    chartConfig.edaChart.chartOptions = chartOptions.chartOptions;
    chartConfig.edaChart.chartColors = []; // Inicializar chartColors

    // Cargar assignedColors o usar colores por defecto
    const existingColors = cfg['assignedColors'] || [];
    let assignedColors = [];

    if (existingColors.length > 0) {
        // Usar colores guardados
        assignedColors = existingColors;
    } else {
        // Crear colores por defecto desde el dataset
        const paletteColor = this.styleProviderService?.ActualChartPalette?.['paleta']?.[0] || 
                            this.styleProviderService?.DEFAULT_PALETTE_COLOR?.['paleta']?.[0];
        
        assignedColors = chartData[1].map((dataset, index) => ({
            value: dataset.label || `Series ${index + 1}`,
            color: this.paletaActual[index % this.paletaActual.length] || paletteColor
        }));

        // Guardar assignedColors por defecto
        cfg['assignedColors'] = assignedColors;
    }

    // Aplicar colores al dataset
    for (let i = 0; i < chartData[1].length; i++) {
        const colorConfig = assignedColors[i];
        if (colorConfig) {
            chartConfig.edaChart.chartDataset[i] = {
                ...chartConfig.edaChart.chartDataset[i],
                backgroundColor: colorConfig.color,
                borderColor: colorConfig.color
            };
            
            chartConfig.edaChart.chartColors.push({
                backgroundColor: colorConfig.color,
                borderColor: colorConfig.color
            });
        }
    }

    // KPI Config
    let kpiValue: number;
    let kpiLabel = this.props.query.find((c: any) => c.column_type == 'numeric')?.display_name?.default;
    let decimals = this.props.query.find((c: any) => c.column_type == 'numeric')?.minimumFractionDigits;
    let agg = this.props.query.find((c: any) => c.column_type == 'numeric')?.aggregation_type.find((e: any) => e.selected == true)?.value;

    if (chartData[1][0]?.data) {
        kpiValue = _.sum(chartData[1][0]?.data);
        if (this.countDecimals(kpiValue) > decimals) {
            kpiValue = Number(kpiValue.toFixed(decimals));
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
        inject.linkedDashboard = this.props.linkedDashboardProps;

        // Obtener config
        const config = this.props.config.getConfig() || {};

        // Coordinates
        inject.coordinates = config['coordinates'] || this.props.coordinates || null;

        // Zoom
        inject.zoom = config['zoom'] || this.props.zoom || 5;

        // Draggable
        inject.draggable = config['draggable'] !== undefined ? config['draggable'] : (this.props.draggable !== undefined ? this.props.draggable : true);

        // Base Layer
        inject.baseLayer = config['baseLayer'] !== undefined ? config['baseLayer'] : true;

        // Logarithmic Scale
        inject.logarithmicScale = config['logarithmicScale'] || false;

        // Legend Position
        inject.legendPosition = config['legendPosition'] || 'bottomleft';

        // Cargar assignedColors según el tipo de mapa
        let assignedColors = config['assignedColors'];

        // Crear defaults colors según el tipo de mapa
        if (!assignedColors || !Array.isArray(assignedColors) || assignedColors.length === 0) {
            if (type === 'geoJsonMap') {
                // geoJsonMap: un solo color
                assignedColors = [
                    {value: 'start', color: this.paletaActual[0]}
                ];
            } else {
                // coordinatesMap: gradiente de dos colores
                assignedColors = [
                    {value: 'start', color: this.paletaActual[this.paletaActual.length - 1]},
                    {value: 'end', color: this.paletaActual[0]}
                ];
            }
            // Guardar los colores por defecto
            config['assignedColors'] = assignedColors;
        } else {
            // Verificar que tenga el número correcto de colores según el tipo
            if (type === 'geoJsonMap' && assignedColors.length !== 1) {
                assignedColors = [assignedColors[0] || {value: 'start', color: this.paletaActual[0]}];
                config['assignedColors'] = assignedColors;
            } else if (type === 'coordinatesMap' && assignedColors.length < 2) {
                assignedColors = [
                    assignedColors[0] || {value: 'start', color: this.paletaActual[this.paletaActual.length - 1]},
                    {value: 'end', color: this.paletaActual[0]}
                ];
                config['assignedColors'] = assignedColors;
            }
        }
        inject.assignedColors = assignedColors;

        if (type === 'coordinatesMap') {
            this.createMapComponent(inject);
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
        inject.assignedColors = this.resolveAndPersistColors(categories, this.props, this.paletaActual);
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
        inject.assignedColors = this.resolveAndPersistGradientColors(this.props, this.paletaActual);
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
        inject.assignedColors = this.resolveAndPersistColors(categories, this.props, this.paletaActual);
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
        inject.assignedColors = this.resolveAndPersistColors(categories, this.props, this.paletaActual);
        
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
        inject.assignedColors = this.resolveAndPersistColors(categories, this.props, this.paletaActual);
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
        inject.assignedColors = this.resolveAndPersistColors(categories, this.props, this.paletaActual);
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
                // Charts ChartJS
                if (['doughnut', 'polarArea', 'bar', 'horizontalBar', 'line', 'area', 'barline', 'histogram', 'pyramid', 'radar'].includes(this.props.chartType)) {
                    this.updateChartJSColors();
                }
                // KPI
                else if (['kpibar', 'kpiline', 'kpiarea'].includes(this.props.chartType)) {
                    this.updateKPIColors();
                }
                // Charts D3
                else if (['treeMap', 'knob', 'sunburst', 'funnel', 'parallelSets', 'bubblechart', 'scatterPlot'].includes(this.props.chartType)) {
                    this.updateD3ChartColors(this.props.chartType);
                }
                // Maps
                else if (['geoJsonMap', 'coordinatesMap'].includes(this.props.chartType)) {
                    this.updateMapColors();
                }
            } catch (err) {
                console.error('Error en updateComponent:', err);
            }
        }
    }

    public updateChartJSColors() {
    const config = this.props.config.getConfig();
    const assignedColors = config['assignedColors'];

    if (!assignedColors?.length) {
        return;
    }

    // 1️¡cancelar suscripción Angular
    if (this.chartClickSubscription) {
        this.chartClickSubscription.unsubscribe();
        this.chartClickSubscription = null;
    }

    const chartInstance = this.componentRef?.instance?.chart;

    if (chartInstance) {
        try {
            chartInstance.destroy();
        } catch (e) {
            console.warn('Error al destruir chart', e);
        }
    }

    setTimeout(() => {
        // 3️destruir componente
        if (this.componentRef) {
            this.componentRef.destroy();
            this.componentRef = null;
        }

        // recrear
        this.renderEdaChart(this.props.edaChart);
    });
}

    public updateKPIColors() {
        const config = this.props.config.getConfig();
        const assignedColors = config['assignedColors'];

        this.props.config.setConfig(new KpiConfig(assignedColors));
        // Re-renderizar KPI desde cero
        this.renderEdaKpiChart();
    }

    public updateMapColors() {
        // Setup variables de  datos
        const config = this.props.config.getConfig();
        const assignedColors = config['assignedColors'];
        if (assignedColors && Array.isArray(assignedColors) && assignedColors.length > 0) {
            // Recuperamos los colores que pertoquen depende del mapa
            if (this.props.chartType === 'geoJsonMap') {
                config['color'] = assignedColors[0].color;
            } else if (this.props.chartType === 'coordinatesMap') {
                config['initialColor'] = assignedColors[0]?.color;
                config['finalColor'] = assignedColors[1]?.color;
            }

            // Preservar todos los valores existentes
            this.props.config.setConfig(new MapConfig(
                config['coordinates'],
                config['zoom'],
                config['logarithmicScale'],
                config['legendPosition'] || 'bottomleft',
                config['color'] || assignedColors[0]?.color,
                config['draggable'] !== undefined ? config['draggable'] : true
            ));
        }
        // Re-renderizar el mapa
        this.renderMap(this.props.chartType);
    }

    public updateD3ChartColors(chartType: string) {
        const config = this.props.config.getConfig();
        const assignedColors = config['assignedColors'];

        if (!assignedColors || !Array.isArray(assignedColors) || assignedColors.length === 0) {
            return;
        }

        // Extraer solo los colores del array assignedColors
        const colors = assignedColors.map(item => item.color);

        switch (chartType) {
            case 'treeMap':
                this.props.config.setConfig(new TreeMapConfig(colors));
                this.renderTreeMap();
                break;
            case 'sunburst':
                this.props.config.setConfig(new SunburstConfig(colors));
                this.renderSunburst();
                break;
            case 'parallelSets':
                this.props.config.setConfig(new SankeyConfig(colors));
                this.renderParallelSets();
                break;
            case 'scatterPlot':
                this.props.config.setConfig(new ScatterConfig(colors));
                this.renderScatter();
                break;
            case 'funnel':
                this.props.config.setConfig(new FunnelConfig(assignedColors));
                this.renderFunnel();
                break;
            // case 'knob': // Knob deshabilitado por ahora porque no funciona
            //     this.props.config.setConfig(new KnobConfig(
            //         assignedColors[0]?.color,config['limits']));
            //     this.renderKnob();
            //     break;
            case 'bubblechart':
                this.props.config.setConfig(new BubblechartConfig(colors));
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
    private initializeTable(type: string, configs?: any, tableLabels?: string[]): EdaTable {

        const labels = tableLabels || this.props.data.labels;
        const tableColumns = [];
        if (this.props.edaChart == 'tableanalized') {
            configs = configs || {};
            configs.rows = 25;
            configs.initRows = 25;
            configs.visibleRows = 25;
            for (const label of labels) {
                tableColumns.push(new EdaColumnText({ header: label, field: label, description: label }));
            }
        } else {
            for (let i = 0, n = this.props.query.length; i < n; i += 1) {

                const label = labels[i];
                const r: Column = this.props.query[i];

                if (_.isEqual(r.column_type, 'date')) {
                    tableColumns.push(new EdaColumnDate({ header: r.display_name.default, field: label, description: r.description.default }));
                } else if (_.isEqual(r.column_type, 'numeric')) {
                    tableColumns.push(new EdaColumnNumber({ header: r.display_name.default, field: label, description: r.description.default , decimals: r.minimumFractionDigits}))
                } else if (_.isEqual(r.column_type, 'html')) {
                    tableColumns.push(new EdaColumnHtml({ header: r.display_name.default, field: label, description: r.description.default }));
                } else if (_.isEqual(r.column_type, 'text')) {
                    tableColumns.push(new EdaColumnText({ header: r.display_name.default, field: label, description: r.description.default }));
                } else if (_.isEqual(r.column_type, 'coordinate')) {
                    tableColumns.push(new EdaColumnNumber({ header: r.display_name.default, field: label, description: r.description.default }));
                }
            }
            // Columnas extra añadidas por el backend (ej. predicción) que no están en el query original.
            // Solo se procesan si hay más datos que campos en el query (hasPredictionData).
            if (labels.length > this.props.query.length) {
                for (let i = this.props.query.length; i < labels.length; i++) {
                    const label = labels[i];
                    tableColumns.push(new EdaColumnNumber({ header: label, field: label, description: label }));
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
     * Resuelve y persiste los colores asignados para un chart
     * @param categories - Array de categorías/labels actuales del chart
     * @param props - Props del chart (debe tener config y assignedColors)
     * @param paletaActual - Paleta de colores a usar como fallback
     * @returns Array de assignedColors correctamente mapeados
     */

    private _prepareTablePredictionData(labels: string[], values: any[][], queryLen: number): { tableLabels: string[], tableValues: any[][] } {
        const rowLen = values[0].length;
        const numericCol = this.props.query?.find((q: any) => q.column_type === 'numeric');
        const predColLabel = numericCol?.display_name?.default
            ? `${$localize`:@@Prediction:Predicción`} - ${numericCol.display_name.default}`
            : $localize`:@@Prediction:Predicción`;
        const tableLabels = [...labels.slice(0, queryLen), ...Array.from({ length: rowLen - queryLen }, () => predColLabel)];
        const tableValues = values.map((row: any[]) => row.map((val: any, idx: number) =>
            idx >= queryLen && (val === null || val === '') ? 0 : val));
        return { tableLabels, tableValues };
    }

    private _preparePredictionValues(
        values: any[][], dataDescription: any, dataTypes: string[], cfg: any, predQueryLen: number, hasPredCols: boolean
    ): any[][] {
        if (cfg.showPredictionLines === true) {
            const predictionIndex = values[0].length - 1;
            const baseName = dataDescription.numericColumns[0]?.name || '';
            const label = baseName
                ? `${$localize`:@@Prediction:Predicción`} - ${baseName}`
                : $localize`:@@Prediction:Predicción`;
            dataDescription.numericColumns.push({ name: label, index: predictionIndex });
            dataTypes.push('numeric');
            values = values.map(row => row.map(item => item === '' ? null : item));
        }

        if (hasPredCols) {
            if (cfg.showPredictionLines === true) {
                values = values.map(row => row.map((val, idx) =>
                    idx >= predQueryLen && (val === 0 || val === '') ? null : val));
                const actualNumericCols = dataDescription.numericColumns.filter((c: any) => c.index < predQueryLen);
                if (actualNumericCols.length > 0) {
                    const numericIdx = actualNumericCols[0].index;
                    let lastActualIdx = -1;
                    for (let i = values.length - 1; i >= 0; i--) {
                        const v = values[i][numericIdx];
                        if (v !== null && v !== '') { lastActualIdx = i; break; }
                    }
                    if (lastActualIdx >= 0) {
                        for (let j = 0; j <= lastActualIdx; j++) values[j][predQueryLen] = null;
                        values[lastActualIdx][predQueryLen] = values[lastActualIdx][numericIdx];
                    }
                }
            } else {
                values = values
                    .map(row => row.slice(0, predQueryLen))
                    .filter(row => row.some(val => val !== null && val !== ''));
            }
        }
        return values;
    }

    private _hideConnectingDot(chartData: any[]): void {
        const predSeries = chartData[1][chartData[1].length - 1];
        if (!predSeries?.data) return;
        const connIdx: number = predSeries.data.findIndex((v: any) => v !== null);
        if (connIdx < 0) return;
        const defaultR = typeof predSeries.pointRadius === 'number' ? predSeries.pointRadius : 5;
        predSeries.pointRadius = predSeries.data.map((_: any, i: number) => i === connIdx ? 0 : defaultR);
        predSeries.pointHoverRadius = predSeries.data.map((_: any, i: number) => i === connIdx ? 0 : defaultR + 1);
    }

    private resolveAndPersistColors(categories: string[], props: any, paletaActual: string[]): { value: string; color: string }[] {
    
    // Validar inputs
    if (!categories || categories.length === 0) {
        categories = ['default'];
    }
    
    if (!paletaActual || paletaActual.length === 0) {
        paletaActual = ['#10B4BD', '#1CEDB1', '#023E8A'];
    }
    
    const savedAssignedColors = 
        props.config.getConfig()['assignedColors'] || 
        props.assignedColors || 
        [];
    
    let assignedColors: { value: string; color: string }[];
    
    // Si ya existen colores guardados Y las categorías coinciden, 
    // NO regenerar (evita el loop de regeneración)
    if (savedAssignedColors.length > 0) {
        // Verificar si las categorías son las mismas
        const savedValues = savedAssignedColors.map(ac => ac.value).sort();
        const currentValues = categories.slice().sort();
        const sameCategoriesCount = savedValues.length === currentValues.length;
        
        // Si tienen el mismo número de categorías, asumir que son los mismos datos
        // y simplemente mapear los colores existentes
        if (sameCategoriesCount) {
            assignedColors = categories.map((category, index) => {
                const found = savedAssignedColors.find(ac => ac.value === category);
                return found || {
                    value: category,
                    color: paletaActual[index % paletaActual.length]
                };
            });
        } else {
            // Las categorías cambiaron (filtro aplicado), mapear lo que se pueda
            assignedColors = categories.map((category, index) => {
                const found = savedAssignedColors.find(ac => ac.value === category);
                return found || {
                    value: category,
                    color: paletaActual[index % paletaActual.length]
                };
            });
        }
    } 
    
    // Validación final
    if (!assignedColors || assignedColors.length === 0) {
        assignedColors = categories.map((cat, idx) => ({
            value: cat,
            color: paletaActual[idx % paletaActual.length]
        }));
    }
    
    
    // SOLO persistir si realmente cambió algo
    // Comparar con lo guardado para evitar escrituras innecesarias --> esto viene dado por el doble render
    const needsUpdate = JSON.stringify(savedAssignedColors) !== JSON.stringify(assignedColors);
    
    if (needsUpdate) {
        props.assignedColors = assignedColors;
        const currentConfig = props.config.getConfig();
        currentConfig['assignedColors'] = assignedColors;
        props.config.setConfig(currentConfig);
    }
    
    return assignedColors;
}

    private resolveAndPersistGradientColors(props: any, paletaActual: string[]): { value: string; color: string }[] {
        // Leer de múltiples fuentes
        const savedAssignedColors = props.config.getConfig()['assignedColors'] || props.assignedColors || [];
        let assignedColors: { value: string; color: string }[];
        
        if (savedAssignedColors.length >= 2) {
            const startColor = savedAssignedColors.find(ac => ac.value === 'start');
            const endColor = savedAssignedColors.find(ac => ac.value === 'end');
            
            assignedColors = [
                startColor || { value: 'start', color: savedAssignedColors[0]?.color || paletaActual[0] },
                endColor || { value: 'end', color: savedAssignedColors[1]?.color || paletaActual[paletaActual.length - 1] }
            ];
        } else {
            assignedColors = [
                { value: 'start', color: paletaActual[0] },
                { value: 'end', color: paletaActual[paletaActual.length - 1] }
            ];
        }
        
        // Persistir en ambos lugares
        props.assignedColors = assignedColors;
        const currentConfig = props.config.getConfig();
        currentConfig['assignedColors'] = assignedColors;
        props.config.setConfig(currentConfig);
        return assignedColors;
    }

    /**
     * @return current chart config
     */
    public getCurrentConfig() {
        return this.currentConfig;
    }
}