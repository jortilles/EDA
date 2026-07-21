import { EdaKnob } from './../../../eda-knob/edaKnob';
import { EdaKnobComponent } from './../../../eda-knob/eda-knob.component';
import { EdaScatter } from './../../../eda-scatter/eda-scatter.component';
import { EdaTreeMap } from './../../../eda-treemap/eda-treemap.component';

import { EdaTreeTable } from './../../../eda-treetable/eda-treetable.component';

import { TreeMap } from './../../../eda-treemap/eda-treeMap';
import { EdaD3Component } from './../../../eda-d3-sankey/eda-d3-sankey.component';
import { TableConfig } from './chart-configuration-models/table-config';
import { Component, OnInit, Input, SimpleChanges, OnChanges, ViewChild, ViewContainerRef, ComponentFactoryResolver,
    OnDestroy, Output, EventEmitter, Self, ElementRef, Inject, LOCALE_ID, Type } from '@angular/core';
import { EdadynamicTextComponent } from '../../../eda-dynamicText/eda-dynamicText.component';
import { EdaTableComponent } from '../../../eda-table/eda-table.component';
import { PanelChart } from './panel-chart';
import { ChartUtilsService, StyleConfig, StyleProviderService } from '@eda/services/service.index';
import { EdaKpiComponent } from '@eda/components/eda-kpi/eda-kpi.component';
import { Column } from '@eda/models/model.index';
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
import { EdaD3 } from '@eda/components/eda-d3-sankey/eda-d3-sankey';
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
import { CommonModule, getLocaleMonthNames, FormStyle, TranslationWidth } from '@angular/common';
import { FunnelConfig } from './chart-configuration-models/funnel.config';
import { KnobConfig } from './chart-configuration-models/knob-config';
import { MapConfig } from './chart-configuration-models/map-config';
import { Subscription } from 'rxjs';
import { EdaKpiTrendComponent } from '@eda/components/eda-kpi-trend/eda-kpi-trend.component';
import { KpiTrendConfig } from './chart-configuration-models/kpi-trend-config';
import { EdaKpiDeviationComponent } from '@eda/components/eda-kpi-deviation/eda-kpi-deviation.component';
import { KpiDeviationConfig } from './chart-configuration-models/kpi-deviation-config';
import { EdaDoughnut } from '@eda/components/eda-doughnut-d3/eda-doughnut.component';
import { EdaDoughnutD3 } from '@eda/components/eda-doughnut-d3/eda-doughnut';
import { EdaPolarAreaComponent } from '@eda/components/eda-polar-area-d3/eda-polar-area.component';
import { EdaPolarArea } from '@eda/components/eda-polar-area-d3/eda-polar-area';
import { EdaBarD3Component } from '@eda/components/eda-bar-d3/eda-bar.component';
import { EdaBarD3 } from '@eda/components/eda-bar-d3/eda-bar';
import { EdaRadarComponent } from '@eda/components/eda-radar-d3/eda-radar.component';
import { EdaRadar } from '@eda/components/eda-radar-d3/eda-radar';
import { EdaLineComponent } from '@eda/components/eda-line-d3/eda-line.component';
import { EdaLineD3 } from '@eda/components/eda-line-d3/eda-line';
import { EdaAreaComponent } from '@eda/components/eda-area-d3/eda-area.component';
import { EdaAreaD3 } from '@eda/components/eda-area-d3/eda-area';
import { EdaBarlineComponent } from '@eda/components/eda-barline-d3/eda-barline.component';
import { EdaBarlineD3 } from '@eda/components/eda-barline-d3/eda-barline';

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
    @Output() onNavEvent: EventEmitter<any> = new EventEmitter<any>();
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
        public styleProviderService: StyleProviderService,
        @Inject(LOCALE_ID) private locale: string) {
        
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

        if (type === 'line' && this.props.edaChart !== 'area') {
            this.renderLine();
        }

        if (type === 'line' && this.props.edaChart === 'area') {
            this.renderArea();
        }

        if (type === 'bar' && this.props.edaChart === 'barline') {
            this.renderBarlineD3();
        }

        if (type === 'radar') {
            this.renderRadar();
        }

        if (type === 'bar' && this.props.edaChart !== 'barline') {
            this.renderBar();
        }

        if (type === 'doughnut') {
            this.renderDoughnut();
        }

        if (type === 'polarArea') {
            this.renderPolarArea();
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
        if (type === 'kpitrend') {
            this.renderEdaKpiTrend();
        }
        if (type === 'kpideviation') {
            this.renderEdaKpiDeviation();
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
     * Obtiene los labels apropiados según el tipo de chart
     * Para crear assignedColors correctamente
     */
    private getLabelsForChartType(chartConfig: any): string[] {
        const type = chartConfig.chartType;
        const edaChart = chartConfig.edaChart;
        
        switch (type) {
            case 'doughnut':
            case 'polarArea':
                // Colors go by category (X-axis labels)
                return chartConfig.chartLabels || [];
                
            case 'bar':
                if (edaChart === 'histogram') {
                    // Histogram has only one dataset/color
                    return chartConfig.chartDataset && chartConfig.chartDataset[0] 
                        ? [chartConfig.chartDataset[0].label || 'Histogram'] 
                        : ['Histogram'];
                }
            default:
                // Bar, Line, Radar, Stacked, etc.
                // Colors go by series (datasets)
                return chartConfig.chartDataset?.map(d => d.label || '') || [];
        }
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
        const hasPredictionData = rowLen > queryLen && config?.['showPredictionLines'] === true;
        const { tableLabels, tableValues } = hasPredictionData
            ? this._prepareTablePredictionData(this.props.data.labels, this.props.data.values, queryLen)
            : { tableLabels: this.props.data.labels, tableValues: this.props.data.values };
        this.componentRef.instance.inject = this.initializeTable(type, config, tableLabels);
        // Must be set before inject.value triggers PivotTable(), which reads navColumnSubstitution
        if (this.props.childNavConfig) {
            this.componentRef.instance.inject.navColumnSubstitution = this.props.childNavConfig.navColumnSubstitution || {};
        }
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

        // Child navigation support
        if (this.props.childNavConfig) {
            this.componentRef.instance.inject.parentFields = this.props.childNavConfig.parentFields;
            this.componentRef.instance.inject.childFieldMap = this.props.childNavConfig.childFieldMap;
            this.componentRef.instance.inject.navColumnSubstitution = this.props.childNavConfig.navColumnSubstitution || {};
            // Navigation feature event emitters
            this.componentRef.instance.inject.onNavIn.subscribe((event: any) =>
                this.onNavEvent.emit({ ...event, navType: 'in' })
            );
            this.componentRef.instance.inject.onNavOut.subscribe((event: any) =>
                this.onNavEvent.emit({ ...event, navType: 'out' })
            );
        }
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
        this.componentRef.instance.inject.crossSortOrder = config.crossSortOrder || 'alphabetical';
        this.componentRef.instance.inject.headerColor = config.headerColor || '';
        this.componentRef.instance.inject.bandingColor = config.bandingColor || '';
        this.componentRef.instance.inject.colorEnabled = config.colorEnabled !== false;
        this.componentRef.instance.applyBandingColors(config.headerColor, config.bandingColor, config.colorEnabled !== false);
        this.configUpdated.emit(this.currentConfig);;
    }

    /** Render knob */
    private renderKnob() {
        let chartConfig: EdaKnob = new EdaKnob();
        const dataTypes = this.props.query.map(column => column.column_type);
        chartConfig.data = this.chartUtils.transformData4Knob(this.props.data, dataTypes);
        
        chartConfig.dataDescription = this.chartUtils.describeData4Knob(this.props.query, this.chartUtils.transformData4Knob(this.props.data, dataTypes));
        chartConfig.assignedColors = this.props.config['config']['assignedColors'] ? this.props.config['config']['assignedColors'] : null;
        chartConfig.limits = this.props.config['config']['limits'] ? this.props.config['config']['limits'] : null;
        chartConfig.semaphoreColor = !!this.props.config['config']['semaphoreColor'];
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
            const kpiCfg = <KpiConfig>config.getConfig();
            chartConfig.sufix = kpiCfg?.sufix || '';
            chartConfig.alertLimits = alertLimits;
            chartConfig.modifiedFontPoints = kpiCfg?.modifiedFontPoints || 0;
            chartConfig.edaChart = kpiCfg?.edaChart;
            chartConfig.backgroundColor = kpiCfg?.backgroundColor || '';
            chartConfig.kpiColor = kpiCfg?.kpiColor || '';
            chartConfig.prefixImage = kpiCfg?.prefixImage || '';
        } else {
            chartConfig.sufix = '';
            chartConfig.alertLimits = [];
            chartConfig.modifiedFontPoints = 0;
            chartConfig.backgroundColor = '';
            chartConfig.kpiColor = '';
            chartConfig.prefixImage = '';
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
            const kpiConfig = new KpiConfig({
                sufix: data.sufix,
                alertLimits: inject.alertLimits,
                modifiedFontPoints: inject.modifiedFontPoints || 0,
                backgroundColor: inject.backgroundColor || '',
                kpiColor: inject.kpiColor || '',
                prefixImage: inject.prefixImage || '',
            });
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
    const edaCfg: any = cfg.edaChart || {};
    const supportsTrendCompare = chartSubType === 'line' || chartSubType === 'area';

    const chartConfig: any = {};
    const dataDescription = this.chartUtils.describeData(this.props.query, this.props.data.labels);
    const dataTypes = this.props.query.map((column: any) => column.column_type);

    let values = _.cloneDeep(this.props.data.values);

    // COMPARISONS - same as renderLine()/renderArea() (line/area only).
    if (supportsTrendCompare && !!edaCfg.addComparative
        && this.props.query.length === 2
        && this.props.query.filter((f: any) => f.column_type === 'date').length > 0
        && ['month', 'week', 'day'].includes(this.props.query.filter((f: any) => f.column_type === 'date')[0].format)) {

        values = this.chartUtils.comparePeriods(this.props.data, this.props.query);
        let types = this.props.query.map((f: any) => f.column_type);
        let dateIndex = types.indexOf('date');
        dataTypes.splice(dateIndex, 0, 'date');
        let dateCol = dataDescription.otherColumns.filter((c: any) => c.index === dateIndex)[0];
        let newCol = { name: dateCol.name + '_newDate', index: dateCol.index + 1 };
        dataDescription.otherColumns.push(newCol);
        dataDescription.totalColumns++;
    }

    const chartData = this.chartUtils.transformDataQuery(chartType, chartSubType, values, dataTypes, dataDescription, false, edaCfg.numberOfColumns);

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

    // chartOptions is a vestigial Chart.js-shaped structure - the D3 mini-chart never reads it,
    // initChartOptions() is only called for its other required-shape side effects.
    const chartOptions = this.chartUtils.initChartOptions(
        chartType, dataDescription.numericColumns[0]?.name,
        dataDescription.otherColumns, manySeries, false, dimensions, null,
        minMax, styles, edaCfg.showLabels, edaCfg.showLabelsPercent, edaCfg.showPointLines, edaCfg.showPredictionLines, edaCfg.numberOfColumns, chartSubType, ticksOptions, false, edaCfg.showGridLines ?? true, this.styleProviderService
    );

    // Initialize chartConfig
    chartConfig.edaChart = {}
    chartConfig.showChart = true;
    chartConfig.edaChart.id = this.randomID();
    chartConfig.edaChart.edaChart = chartSubType;
    chartConfig.edaChart.chartType = chartType;
    chartConfig.edaChart.chartLabels = chartData[0];
    chartConfig.edaChart.chartOptions = chartOptions.chartOptions;
    chartConfig.edaChart.chartColors = []; // Initialize chartColors
    chartConfig.edaChart.chartLegend = edaCfg.chartLegend ?? false;
    chartConfig.edaChart.compact = true;
    chartConfig.edaChart.categoryFieldName = dataDescription.otherColumns[0]?.name;
    chartConfig.edaChart.useGradient = edaCfg.useGradient ?? true;
    chartConfig.edaChart.useRoundedBars = edaCfg.useRoundedBars ?? true;
    chartConfig.edaChart.showGridLines = edaCfg.showGridLines ?? false;
    chartConfig.edaChart.showLabels = edaCfg.showLabels ?? false;
    chartConfig.edaChart.showLabelsPercent = edaCfg.showLabelsPercent ?? false;
    chartConfig.edaChart.labelColorMode = edaCfg.labelColorMode ?? 'series';
    chartConfig.edaChart.labelCustomColor = edaCfg.labelCustomColor;
    if (supportsTrendCompare) {
        chartConfig.edaChart.showPointLines = edaCfg.showPointLines ?? false;
    }

    // TREND (line/area only) - added before color resolution so it gets its own (editable)
    // assignedColors row, defaulting to its source series' color.
    if (supportsTrendCompare && edaCfg.addTrend && chartData[1].length > 0) {
        const trends = chartData[1].map((serie: any) => {
            const trend: any = this.chartUtils.getTrend(serie);
            trend.isTrend = true;
            trend.sourceLabel = serie.label;
            return trend;
        });
        trends.forEach((trend: any) => chartData[1].push(trend));
    }

    chartConfig.edaChart.chartDataset = chartData[1];

    // Load assignedColors or use default colors
    const existingColors = cfg['assignedColors'] || [];
    let assignedColors = [];

    if (existingColors.length > 0) {
        // Use saved colors
        assignedColors = existingColors;
    } else {
        // Create default colors from dataset
        const paletteColor = this.styleProviderService?.ActualChartPalette?.['paleta']?.[0] ||
                            this.styleProviderService?.DEFAULT_PALETTE_COLOR?.['paleta']?.[0];

        assignedColors = chartData[1].filter((d: any) => !d.isTrend).map((dataset, index) => ({
            value: dataset.label || `Series ${index + 1}`,
            color: this.paletaActual[index % this.paletaActual.length] || paletteColor
        }));

        // Save default assignedColors
        cfg['assignedColors'] = assignedColors;
    }

    // eda-bar-d3/eda-line-d3/eda-area-d3 (the same components used at full size) resolve each
    // series' color directly from assignedColors, by its own label first (so a trend row is
    // independently editable) - matched by label, with a positional fallback for legacy saved
    // colors that predate this field being label-keyed here.
    const colorMap = new Map<string, any>(assignedColors.map((c: any) => [c.value, c]));
    chartConfig.edaChart.assignedColors = chartData[1].map((dataset: any, i: number) => {
        const match = colorMap.get(dataset.label) || assignedColors[i];
        if (match) {
            const entry: any = { value: dataset.label, color: match.color };
            if (match.opacity !== undefined) entry.opacity = match.opacity;
            return entry;
        }
        // Trend defaults to its source series' resolved color and a lighter 25% opacity for area.
        const isTrend = !!dataset.isTrend;
        const sourceColor = isTrend ? colorMap.get(dataset.sourceLabel)?.color : undefined;
        const entry: any = { value: dataset.label, color: sourceColor || this.paletaActual[i % this.paletaActual.length] };
        if (isTrend && chartSubType === 'area') entry.opacity = 25;
        return entry;
    });

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
        const kpiCfgChart = <KpiConfig>propsConfig.getConfig();
        chartConfig.sufix = kpiCfgChart?.sufix || '';
        chartConfig.alertLimits = alertLimits;
        chartConfig.modifiedFontPoints = kpiCfgChart?.modifiedFontPoints || 0;
        chartConfig.backgroundColor = kpiCfgChart?.backgroundColor || '';
        chartConfig.kpiColor = kpiCfgChart?.kpiColor || '';
        chartConfig.prefixImage = kpiCfgChart?.prefixImage || '';
    } else {
        chartConfig.sufix = '';
        chartConfig.alertLimits = [];
        chartConfig.modifiedFontPoints = 0;
        chartConfig.backgroundColor = '';
        chartConfig.kpiColor = '';
        chartConfig.prefixImage = '';
    }

    this.createEdaKpiChartComponent(chartConfig);
}
    /**
     * count the decimal places in the numbers.
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
            const kpiConfig = new KpiConfig({
                sufix: data.sufix,
                alertLimits: inject.alertLimits || [],
                edaChart: inject.edaChart,
                modifiedFontPoints: inject.modifiedFontPoints || 0,
                backgroundColor: inject.backgroundColor || '',
                kpiColor: inject.kpiColor || '',
                prefixImage: inject.prefixImage || '',
            });
            (<KpiConfig><unknown>this.props.config.setConfig(kpiConfig));
        })
        this.configUpdated.emit(this.currentConfig);
    }
    /**
     * Renders a KPITrendComponent
    */
    
    private renderEdaKpiTrend() {
        const query = this.props.query;
        const data = this.props.data;
        const cfg: any = this.props.config.getConfig();

        const dateIndex = query.findIndex((c: any) => c.column_type === 'date');
        const numericIndex = query.findIndex((c: any) => c.column_type === 'numeric');
        if (dateIndex === -1 || numericIndex === -1) return;

        const dateFormat: string = query[dateIndex]?.format || 'month';
        const decimals: number = query[numericIndex]?.minimumFractionDigits || 0;
        const header: string = query[numericIndex]?.display_name?.default || '';

        // --- Parse all rows sorted chronologically ---
        const rawRows: { dateStr: string; value: number }[] = data.values
            .filter((row: any[]) => row[dateIndex] != null && row[dateIndex] !== '')
            .map((row: any[]) => ({
                dateStr: String(row[dateIndex]).trim(),
                value: Number(row[numericIndex]) || 0
            }))
            .sort((a, b) => a.dateStr < b.dateStr ? -1 : a.dateStr > b.dateStr ? 1 : 0);

        if (rawRows.length === 0) return;

        // --- Build period groups:
        //   month format → groups = years, periods = months 1-12
        //   week format  → groups = approx months (4-week buckets), periods = week ordinal (1-5)
        //   year/day     → groups = years or months, periods = 1 or day number
        const periodGroups = this._buildTrendPeriodGroups(rawRows, dateFormat);
        if (periodGroups.length === 0) return;

        // Most recent group = current, second = default comparison
        const currentGroup = periodGroups[0];
        const defaultCompKey = periodGroups.length > 1 ? periodGroups[1].key : null;
        const availableComparisons = periodGroups.slice(1).map(g => ({ key: g.key, label: g.label }));

        // --- Compute initial chart data ---
        const compGroup = defaultCompKey ? periodGroups.find(g => g.key === defaultCompKey) || null : null;
        const { kpiValue, spyValue, vsPercent, labels, currentSeries, previousSeries } =
            this._computeTrendDisplay(currentGroup, compGroup, dateFormat, decimals);

        // Computed first since assignedColors' default keys the comparison series by this same
        // label - it has to match rawDatasets[1].label below for eda-barline-d3's by-label lookup
        // (and loadChartColors() on reopen) to actually find it, unlike the old hardcoded 'prev' key.
        const compLabel = this._comparisonLabel(dateFormat);

        // --- assignedColors – same pattern as renderEdaKpiChart ---
        const existingColors = cfg['assignedColors'] || [];
        let assignedColors: any[] = [];
        const hasTwoSeries = compGroup !== null;

        if (existingColors.length > 0) {
            assignedColors = existingColors;
        } else {
            const fallback = this.styleProviderService?.ActualChartPalette?.['paleta']?.[0] ||
                             this.styleProviderService?.DEFAULT_PALETTE_COLOR?.['paleta']?.[0];
            assignedColors = [
                { value: header, color: this.paletaActual[0] || fallback },
                { value: compLabel, color: this.paletaActual[1] || fallback }
            ];
            cfg['assignedColors'] = assignedColors;
        }
        const color0 = assignedColors[0]?.color || this.paletaActual[0];
        const color1 = assignedColors[1]?.color || this.paletaActual[1] || color0;

        // --- Build datasets (label = column name for bars, comparison label for line) - color
        // resolved natively by eda-barline-d3 from assignedColors, these are just data/style fields. ---
        const rawDatasets: any[] = [{
            label: header,
            data: currentSeries,
            type: 'bar',
            borderRadius: 2,
            order: 2,
            datalabels: { display: false }
        }];
        if (hasTwoSeries) {
            rawDatasets.push({
                label: compLabel,
                data: previousSeries,
                type: 'line',
                pointRadius: 2,
                pointHoverRadius: 4,
                borderDash: [4, 3],
                fill: false,
                tension: 0.3,
                order: 1,
                datalabels: { display: false }
            });
        }

        // --- Chart options via initChartOptions – same pattern as renderEdaKpiChart ---
        const dataDescription = this.chartUtils.describeData(this.props.query, this.props.data.labels);
        const styles: StyleConfig = { fontFamily: this.fontFamily, fontSize: this.fontSize, fontColor: this.fontColor };
        const dimensions = this.getDimensions();
        dimensions.height = !dimensions.height ? 255 : dimensions.height;
        dimensions.width = !dimensions.width ? 1300 : dimensions.width;

        const ticksOptions = { xTicksLimit: 3, yTicksLimit: 0, maxRotation: 1, minRotation: 1, labelOffset: 40, padding: -2 };
        const chartOptions = this.chartUtils.initChartOptions(
            'bar', dataDescription.numericColumns[0]?.name,
            dataDescription.otherColumns, false, false, dimensions, null,
            { min: null, max: null }, styles, false, false, false, false,
            cfg.numberOfColumns, 'barline', ticksOptions, false, cfg.showGridLines ?? true,
            this.styleProviderService
        );

        // --- Build chartConfig – same pattern as renderEdaKpiChart ---
        const chartConfig: any = {};
        chartConfig.showChart = true;
        chartConfig.edaChart = {
            id: this.randomID(),
            edaChart: 'barline',
            chartType: 'bar',
            chartLabels: labels,
            chartDataset: rawDatasets,
            chartOptions: chartOptions.chartOptions,
            // eda-barline-d3 resolves each series' color directly from this - no more Chart.js-shaped
            // chartColors/backgroundColor baking needed.
            assignedColors: assignedColors,
            chartLegend: false,
            // eda-barline-d3 mini-chart mode (see eda-kpi-trend.component.html): no axes, no grid,
            // shorter entrance - the current/comparison legend chips above it already cover what a
            // full legend would show.
            compact: true,
            useGradient: true,
            useRoundedBars: true
        };

        // --- KPI values ---
        chartConfig.header = header;
        chartConfig.kpiValue = kpiValue;
        chartConfig.spyValue = spyValue;
        chartConfig.vsPercent = vsPercent;
        chartConfig.currentPeriodLabel = currentGroup.label;
        chartConfig.previousPeriodLabel = compGroup?.label || '';
        chartConfig.periodTitle = this._periodTitle(dateFormat);
        chartConfig.comparisonLabel = compLabel;
        chartConfig.decimals = decimals;

        // --- Style config – same pattern as renderEdaKpiChart ---
        const propsConfig: any = this.props.config;
        if (propsConfig) {
            const trendCfg = <KpiTrendConfig>propsConfig.getConfig();
            chartConfig.sufix = trendCfg?.sufix || '';
            chartConfig.backgroundColor = trendCfg?.backgroundColor || '';
            chartConfig.kpiColor = trendCfg?.kpiColor || '';
            chartConfig.modifiedFontPoints = trendCfg?.modifiedFontPoints || 0;
        } else {
            chartConfig.sufix = '';
            chartConfig.backgroundColor = '';
            chartConfig.kpiColor = '';
            chartConfig.modifiedFontPoints = 0;
        }
        chartConfig.currentYearColor = color0;
        chartConfig.previousYearColor = color1;

        // --- For the dropdown in the component ---
        chartConfig.dateFormat = dateFormat;
        chartConfig.currentKey = currentGroup.key;
        chartConfig.selectedComparisonKey = defaultCompKey;
        chartConfig.availableComparisons = availableComparisons;
        chartConfig.periodGroups = periodGroups;
        chartConfig.assignedColors = assignedColors;

        this.createEdaKpiTrendComponent(chartConfig);
    }

    /**
     * Groups rows according to date format:
     *  month → by year (periods = month 1-12)
     *  week  → by approx month (periods = ordinal week 1-5)
     *  year  → by year (period = 1)
     *  day   → by month (period = day of month)
     * Result ordered descending (most recent first)
     */
    private _buildTrendPeriodGroups(
        rows: { dateStr: string; value: number }[],
        format: string
    ): { key: string; label: string; entries: { period: number; value: number }[] }[] {

        // Map: groupKey → { label, weekNums: [], entries accumulated }
        const groupAcc = new Map<string, { label: string; weekNums: number[]; values: Map<number, number> }>();

        rows.forEach(row => {
            const parts = row.dateStr.split('-');
            const year = parts[0];
            let groupKey: string;
            let groupLabel: string;
            let period: number;
            let weekNum = 0;

            if (format === 'month') {
                // Group by year, period = month number
                groupKey = year;
                groupLabel = year;
                period = parts.length > 1 ? (parseInt(parts[1].replace(/^W/i, ''), 10) || 1) : 1;

            } else if (format === 'week') {
                // Group by approximate calendar month, period = ordinal (assigned later)
                weekNum = parts.length > 1 ? (parseInt(parts[1].replace(/^W/i, ''), 10) || 1) : 1;
                const approxMonth = Math.min(12, Math.ceil(weekNum * 12 / 52.18));
                groupKey = `${year}-${String(approxMonth).padStart(2, '0')}`;
                const mNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
                groupLabel = `${mNames[approxMonth - 1]} '${year.slice(-2)}`;
                period = 0; // will be assigned after sorting weeks within group

            } else if (format === 'day') {
                // Group by year-month, period = day of month
                const monthPart = parts.length > 1 ? parts[1] : '01';
                groupKey = `${year}-${monthPart}`;
                const mNum = parseInt(monthPart, 10);
                const mNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
                groupLabel = `${mNames[mNum - 1] || monthPart} '${year.slice(-2)}`;
                period = parts.length > 2 ? (parseInt(parts[2], 10) || 1) : 1;

            } else {
                // year format or unknown: group = year, period = 1
                groupKey = year;
                groupLabel = year;
                period = 1;
            }

            if (!groupAcc.has(groupKey)) {
                groupAcc.set(groupKey, { label: groupLabel, weekNums: [], values: new Map() });
            }
            const acc = groupAcc.get(groupKey);

            if (format === 'week') {
                // Store week numbers for ordinal assignment later
                acc.weekNums.push(weekNum);
                acc.values.set(weekNum, (acc.values.get(weekNum) || 0) + row.value);
            } else {
                acc.values.set(period, (acc.values.get(period) || 0) + row.value);
            }
        });

        // Convert to output format
        const groups: { key: string; label: string; entries: { period: number; value: number }[] }[] = [];

        groupAcc.forEach((acc, key) => {
            let entries: { period: number; value: number }[];

            if (format === 'week') {
                // Assign ordinal position (1,2,3,4,5) based on sorted week numbers
                const sortedWeeks = Array.from(acc.values.keys()).sort((a, b) => a - b);
                entries = sortedWeeks.map((wk, idx) => ({ period: idx + 1, value: acc.values.get(wk) || 0 }));
            } else {
                entries = Array.from(acc.values.entries()).map(([p, v]) => ({ period: p, value: v }))
                              .sort((a, b) => a.period - b.period);
            }
            groups.push({ key, label: acc.label, entries });
        });

        // Sort descending (most recent first)
        return groups.sort((a, b) => a.key < b.key ? 1 : a.key > b.key ? -1 : 0);
    }

    /** Calculates KPI, SPLY, vs% and arrays for the chart from two groups */
    private _computeTrendDisplay(
        currentGroup: { key: string; label: string; entries: { period: number; value: number }[] },
        compGroup: { key: string; label: string; entries: { period: number; value: number }[] } | null,
        format: string,
        decimals: number
    ): { kpiValue: number; spyValue: number | null; vsPercent: number | null;
         labels: string[]; currentSeries: (number | null)[]; previousSeries: (number | null)[] } {

        const currentMap = new Map(currentGroup.entries.map(e => [e.period, e.value]));
        const compMap = compGroup ? new Map(compGroup.entries.map(e => [e.period, e.value])) : null;

        // All periods union
        const allPeriods = new Set<number>(currentMap.keys());
        if (compMap) compMap.forEach((_, k) => allPeriods.add(k));
        const sortedPeriods = Array.from(allPeriods).sort((a, b) => a - b);

        const labels = sortedPeriods.map(p => this._periodToChartLabel(p, format));
        const currentSeries = sortedPeriods.map(p => currentMap.get(p) ?? null);
        const previousSeries = compMap ? sortedPeriods.map(p => compMap.get(p) ?? null) : [];

        // KPI = sum of current group
        const kpiValue = this._roundDecimals(currentGroup.entries.reduce((s, e) => s + e.value, 0), decimals);

        // SPLY = sum of comp group for same periods present in current
        let spyValue: number | null = null;
        if (compMap) {
            const currentPeriods = Array.from(currentMap.keys());
            spyValue = this._roundDecimals(
                currentPeriods.reduce((s, p) => s + (compMap.get(p) || 0), 0), decimals);
        }

        const vsPercent = (spyValue !== null && spyValue !== 0)
            ? Math.round(((kpiValue - spyValue) / spyValue) * 1000) / 10
            : null;

        return { kpiValue, spyValue, vsPercent, labels, currentSeries, previousSeries };
    }

    /** X-axis label for a given period number */
    private _periodToChartLabel(period: number, format: string): string {
        if (format === 'month') {
            const months = getLocaleMonthNames(this.locale, FormStyle.Standalone, TranslationWidth.Abbreviated);
            const raw = months[(period - 1) % 12];
            if (!raw) return String(period);
            return raw.charAt(0).toUpperCase() + raw.slice(1).replace(/\.$/, '');
        }
        if (format === 'week') return 'Sem ' + String(period);
        return String(period);
    }

    /** Current period title according to date format */
    private _periodTitle(format: string): string {
        switch (format) {
            case 'year':  return $localize`:@@trendTitleYear:Año actual`;
            case 'month': return $localize`:@@trendTitleMonth:Mes actual`;
            case 'week':  return $localize`:@@trendTitleWeek:Semana actual`;
            case 'day':   return $localize`:@@trendTitleDay:Hoy`;
            default:      return $localize`:@@trendTitlePeriod:Período actual`;
        }
    }

    /** Comparison label according to date format */
    private _comparisonLabel(format: string): string {
        switch (format) {
            case 'year':  return $localize`:@@trendCompYear:Año anterior`;
            case 'month': return $localize`:@@trendCompMonth:Año anterior`;
            case 'week':  return $localize`:@@trendCompWeek:Mes anterior`;
            case 'day':   return $localize`:@@trendCompDay:Mes anterior`;
            default:      return $localize`:@@trendCompPeriod:Período anterior`;
        }
    }

    private _roundDecimals(value: number, decimals: number): number {
        if (!decimals) return Math.round(value);
        return Number(value.toFixed(decimals));
    }

    /**
     * creates a kpiTrendComponent
     * @param inject
     */
    private createEdaKpiTrendComponent(inject: any) {
        this.entry.clear();
        this.componentRef = this.entry.createComponent(EdaKpiTrendComponent);
        this.componentRef.instance.inject = inject;
        this.currentConfig = inject;
        this.configUpdated.emit(this.currentConfig);
    }

    /**
     * Renders a KpiDeviationComponent. Supports the two data shapes the chart-type dropdown
     * advertises as valid for kpideviation (see chart-utils.service.ts's getNotAllowedChartTypesForDataDescription):
     *  - 2 numeric columns, no other columns: value/reference are that single row's two columns.
     *  - 1 numeric column (+ optionally 1 category column): value/reference are row[0]/row[1] of
     *    that one column.
     */
    private renderEdaKpiDeviation(): void {
        const query = this.props.query;
        const data = this.props.data;

        const numericIndices: number[] = query
            .map((c: any, i: number) => c.column_type === 'numeric' ? i : -1)
            .filter((i: number) => i !== -1);
        const otherIndices: number[] = query
            .map((c: any, i: number) => c.column_type !== 'numeric' ? i : -1)
            .filter((i: number) => i !== -1);

        if (numericIndices.length === 0) return;

        const twoColumnShape = numericIndices.length >= 2 && otherIndices.length === 0;

        let numIdx: number;
        let decimals: number;
        let header: string;
        let value: number;
        let refValue: number;

        if (twoColumnShape) {
            if (data.values.length === 0) return;
            numIdx = numericIndices[0];
            const refNumIdx = numericIndices[1];
            decimals = query[numIdx]?.minimumFractionDigits || 0;
            header = query[numIdx]?.display_name?.default || '';
            value = this._roundDecimals(Number(data.values[0][numIdx]) || 0, decimals);
            refValue = this._roundDecimals(Number(data.values[0][refNumIdx]) || 0, decimals);
        } else {
            if (data.values.length < 2) return;
            numIdx = numericIndices[0];
            const catIdx = otherIndices.length > 0 ? otherIndices[0] : -1;
            decimals = query[numIdx]?.minimumFractionDigits || 0;
            header = catIdx !== -1
                ? String(data.values[0][catIdx])
                : (query[numIdx]?.display_name?.default || '');
            value = this._roundDecimals(Number(data.values[0][numIdx]) || 0, decimals);
            refValue = this._roundDecimals(Number(data.values[1][numIdx]) || 0, decimals);
        }

        const vsPercent = (refValue !== null && refValue !== 0)
            ? Math.round(((value - refValue) / refValue) * 1000) / 10
            : null;

        const cfg: any = this.props.config?.getConfig() || {};

        const chartConfig: any = {};
        chartConfig.header = header;
        chartConfig.value = value;
        chartConfig.referenceValue = refValue;
        chartConfig.vsPercent = vsPercent;
        chartConfig.decimals = decimals;
        chartConfig.backgroundColor = cfg.backgroundColor || '';
        chartConfig.kpiColor = cfg.kpiColor || '';
        chartConfig.positiveColor = cfg.positiveColor || '';
        chartConfig.negativeColor = cfg.negativeColor || '';
        chartConfig.prefixImage = cfg.prefixImage || '';
        chartConfig.modifiedFontPoints = cfg.modifiedFontPoints || 0;
        chartConfig.alertLimits = cfg.alertLimits || [];

        this.createEdaKpiDeviationComponent(chartConfig);
    }

    private createEdaKpiDeviationComponent(inject: any): void {
        this.entry.clear();
        this.componentRef = this.entry.createComponent(EdaKpiDeviationComponent);
        this.componentRef.instance.inject = inject;
        this.currentConfig = inject;
        this.configUpdated.emit(this.currentConfig);
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
        chartConfig.modifiedFontPoints = cfg?.modifiedFontPoints || 0;
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

        // Get config
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

        // Load assignedColors according to map type
        let assignedColors = config['assignedColors'];

        // Create default colors according to map type
        if (!assignedColors || !Array.isArray(assignedColors) || assignedColors.length === 0) {
            if (type === 'geoJsonMap') {
                // geoJsonMap: single color
                assignedColors = [
                    {value: 'start', color: this.paletaActual[0]}
                ];
            } else {
                // coordinatesMap: gradient of two colors
                assignedColors = [
                    {value: 'start', color: this.paletaActual[this.paletaActual.length - 1]},
                    {value: 'end', color: this.paletaActual[0]}
                ];
            }
            // Save the default colors
            config['assignedColors'] = assignedColors;
        } else {
            // Verify it has the correct number of colors according to type
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
        // Review click filter 
        this.componentRef.instance.onClick.subscribe((event) => this.onChartClick.emit({...event, query: this.props.query}));
    }


    /**
     * Renders the D3-based doughnut chart
     */
    private renderDoughnut() {
        const values = _.cloneDeep(this.props.data.values);
        const dataTypes = this.props.query.map(col => col.column_type);
        const dataDescription = this.chartUtils.describeData(this.props.query, this.props.data.labels);
        const cfg: any = this.props.config.getConfig();

        const chartData = this.chartUtils.transformDataQuery('doughnut', 'doughnut', values, dataTypes, dataDescription, false, cfg.numberOfColumns);
        if (chartData.length == 0) {
            chartData.push([], []);
        }

        const inject: any = new EdaDoughnutD3();
        inject.id = this.randomID();
        inject.chartType = 'doughnut';
        inject.edaChart = 'doughnut';
        inject.chartLabels = chartData[0];
        inject.chartDataset = chartData[1];

        this.applySingleSeriesColors(inject);

        inject.chartLegend = cfg.chartLegend ?? true;
        inject.showLabels = cfg.showLabels ?? false;
        inject.showLabelsPercent = cfg.showLabelsPercent ?? false;
        // UI range is 0-95 (0 = full pie, 95 = ring collapsed to a thin line) - see draw()
        // in eda-doughnut.component.ts for how this maps to the actual inner/outer radius ratio.
        inject.innerRadiusPercent = cfg.innerRadiusPercent ?? 50;
        inject.useGradient = cfg.useGradient ?? true;
        inject.chartAnimation = cfg.chartAnimation ?? true;
        inject.linkedDashboard = this.props.linkedDashboardProps;

        this.createD3Component(inject, EdaDoughnut);
    }

    // Shared by doughnut/polarArea/bar: mount the D3 component into the entry point and wire up
    // its click output. Identical for all three except which Angular component class gets
    // instantiated.
    private createD3Component(inject: any, componentType: Type<any>) {
        this.currentConfig = inject;
        this.entry.clear();
        this.componentRef = this.entry.createComponent(componentType);
        this.componentRef.instance.inject = inject;
        this.chartClickSubscription = this.componentRef.instance.onClick.subscribe(
            (event) => this.onChartClick.emit({...event, query: this.props.query})
        );
        this.configUpdated.emit(this.currentConfig);
    }

    // Shared by renderDoughnut/renderPolarArea (both single-series, category-per-slice charts):
    // resolves assignedColors against the current category labels. eda-doughnut-d3/eda-polar-area-d3
    // resolve each slice's color directly from assignedColors by label - no chartColors/
    // backgroundColor baking needed. renderBar() isn't included - it layers 3 additional color
    // modes (threshold/unique/assigned) on top that don't apply here.
    private applySingleSeriesColors(inject: any): void {
        let assignedColors = this.props.config.getConfig()['assignedColors'] || [];
        const currentLabels = this.getLabelsForChartType(inject);

        if (assignedColors.length === 0) {
            assignedColors = this.chartUtils.resolveAssignedColors(currentLabels, [], this.paletaActual);
            this.props.config.getConfig()['assignedColors'] = assignedColors;
        } else {
            const colorMap = new Map<string, any>(assignedColors.map(ac => [ac.value, ac]));
            assignedColors = currentLabels.map((label, index) => {
                const assignedColor = colorMap.get(label);
                if (assignedColor) {
                    return { value: label, color: assignedColor.color };
                } else {
                    return { value: label, color: this.paletaActual[index % this.paletaActual.length] };
                }
            });
        }

        inject.assignedColors = assignedColors;
    }

    /**
     * Renders the D3-based polarArea (rose/Nightingale) chart. Same data shape and category-color
     * logic as doughnut, rendered as equal-angle, value-driven-radius slices instead of doughnut's
     * equal-radius/variable-angle ones. No innerRadiusPercent - polar area has no cutout concept.
     */
    private renderPolarArea() {
        const values = _.cloneDeep(this.props.data.values);
        const dataTypes = this.props.query.map(col => col.column_type);
        const dataDescription = this.chartUtils.describeData(this.props.query, this.props.data.labels);
        const cfg: any = this.props.config.getConfig();

        const chartData = this.chartUtils.transformDataQuery('polarArea', 'polarArea', values, dataTypes, dataDescription, false, cfg.numberOfColumns);
        if (chartData.length == 0) {
            chartData.push([], []);
        }

        const inject: any = new EdaPolarArea();
        inject.id = this.randomID();
        inject.chartType = 'polarArea';
        inject.edaChart = 'polarArea';
        inject.chartLabels = chartData[0];
        inject.chartDataset = chartData[1];

        this.applySingleSeriesColors(inject);

        inject.chartLegend = cfg.chartLegend ?? true;
        inject.showLabels = cfg.showLabels ?? false;
        inject.showLabelsPercent = cfg.showLabelsPercent ?? false;
        inject.showGridLines = cfg.showGridLines ?? true;
        inject.useGradient = cfg.useGradient ?? true;
        inject.chartAnimation = cfg.chartAnimation ?? true;
        inject.linkedDashboard = this.props.linkedDashboardProps;

        this.createD3Component(inject, EdaPolarAreaComponent);
    }

    /**
     * Renders the D3-based radar (spider) chart. Multi-series like bar - one dataset per
     * queried numeric column, colored per-series (no threshold/unique-color modes, those only
     * make sense for a single-numeric-column bar chart).
     */
    private renderRadar() {
        const values = _.cloneDeep(this.props.data.values);
        const dataTypes = this.props.query.map(col => col.column_type);
        const dataDescription = this.chartUtils.describeData(this.props.query, this.props.data.labels);
        const cfg: any = this.props.config.getConfig();

        const chartData = this.chartUtils.transformDataQuery('radar', 'radar', values, dataTypes, dataDescription, false, cfg.numberOfColumns);
        if (chartData.length == 0) {
            chartData.push([], []);
        }

        const inject: any = new EdaRadar();
        inject.id = this.randomID();
        inject.chartType = 'radar';
        inject.edaChart = 'radar';
        inject.chartLabels = chartData[0];
        inject.categoryFieldName = dataDescription.otherColumns[0]?.name;
        inject.chartDataset = chartData[1];

        let assignedColors = this.props.config.getConfig()['assignedColors'] || [];
        const currentLabels = this.getLabelsForChartType(inject);

        if (assignedColors.length === 0) {
            assignedColors = this.chartUtils.resolveAssignedColors(currentLabels, [], this.paletaActual);
            this.props.config.getConfig()['assignedColors'] = assignedColors;
        } else {
            const colorMap = new Map<string, any>(assignedColors.map(ac => [ac.value, ac]));
            assignedColors = currentLabels.map((label, index) => {
                const assignedColor = colorMap.get(label);
                if (assignedColor) {
                    const entry: any = { value: label, color: assignedColor.color };
                    if (assignedColor.opacity !== undefined) entry.opacity = assignedColor.opacity;
                    return entry;
                } else {
                    return { value: label, color: this.paletaActual[index % this.paletaActual.length] };
                }
            });
        }

        // eda-radar-d3 resolves each series' color/opacity directly from assignedColors - no more
        // Chart.js-shaped chartColors/backgroundColor baking needed.
        inject.assignedColors = assignedColors;

        inject.chartLegend = cfg.chartLegend ?? true;
        inject.showLabels = cfg.showLabels ?? false;
        inject.showLabelsPercent = cfg.showLabelsPercent ?? false;
        inject.labelColorMode = cfg.labelColorMode ?? 'series';
        inject.labelCustomColor = cfg.labelCustomColor;
        inject.showGridLines = cfg.showGridLines ?? true;
        inject.useGradient = cfg.useGradient ?? true;
        inject.linkedDashboard = this.props.linkedDashboardProps;

        this.createD3Component(inject, EdaRadarComponent);
    }

    /**
     * Renders the D3-based bar family: bar, horizontalBar, stackedbar, stackedbar100, pyramid,
     * histogram (everything with chartType 'bar' except 'barline', handled by renderBarlineD3()).
     */
    private renderBar() {
        let values = _.cloneDeep(this.props.data.values);
        const dataTypes = this.props.query.map(col => col.column_type);
        const dataDescription = this.chartUtils.describeData(this.props.query, this.props.data.labels);

        if (this.props.edaChart === 'histogram') {
            dataDescription.numericColumns[0].name = this.histoGramDescTxt + " " + dataDescription.numericColumns[0].name + " " + this.histoGramDescTxt2;
        }

        let cfg: any = this.props.config.getConfig();
        // COMPARISONS
        if (!!cfg.addComparative
            && this.props.query.length === 2
            && this.props.query.filter(field => field.column_type === 'date').length > 0
            && ['month', 'week', 'day'].includes(this.props.query.filter(field => field.column_type === 'date')[0].format)) {

            values = this.chartUtils.comparePeriods(this.props.data, this.props.query);
            let types = this.props.query.map(field => field.column_type);
            let dateIndex = types.indexOf('date');
            dataTypes.splice(dateIndex, 0, 'date');
            let dateCol = dataDescription.otherColumns.filter(c => c.index === dateIndex)[0];
            let newCol = { name: dateCol.name + '_newDate', index: dateCol.index + 1 };
            dataDescription.otherColumns.push(newCol);
            dataDescription.totalColumns++;
        }
        if (cfg.showPredictionLines === true) {
            const _predQueryLen = (this.props.query?.length || 0);
            const _hasPredCols = values?.length > 0 && (values[0]?.length || 0) > _predQueryLen;
            values = this._preparePredictionValues(values, dataDescription, dataTypes, cfg, _predQueryLen, _hasPredCols);
        }

        const chartData = this.chartUtils.transformDataQuery('bar', this.props.edaChart, values, dataTypes, dataDescription, false, cfg.numberOfColumns);
        if (chartData.length == 0) {
            chartData.push([], []);
        }

        if (cfg.showPredictionLines === true && chartData[1]?.length > 0) {
            this._hideConnectingDot(chartData);
        }

        const inject: any = new EdaBarD3();
        inject.id = this.randomID();
        inject.chartType = 'bar';
        inject.edaChart = this.props.edaChart;
        inject.chartLabels = chartData[0];
        // Category axis field name (e.g. "Departamento") for the tooltip title - histogram's
        // "categories" are numeric bin ranges rather than a real column, so there's no field name.
        inject.categoryFieldName = this.props.edaChart !== 'histogram' ? dataDescription.otherColumns[0]?.name : undefined;
        // Measure name for the tooltip's value row - only meaningful when there's a single
        // numeric column; with several, each series' own label already names its own measure.
        inject.valueFieldName = dataDescription.numericColumns.length === 1 ? dataDescription.numericColumns[0]?.name : undefined;
        // stackedbar100 has two unrelated data shapes (see transformDataQuery): with ONE text
        // column and several numeric ones, each numeric column's own NAME stands in for a
        // category (chartData[0]/`category` holds e.g. "Quantityordered", not a real dimension
        // value) while the text column's values become the series - so category/series need to
        // swap places in the tooltip (see tooltipHtml). With TWO text columns, `category` and
        // `seriesLabel` are both genuine dimension values already and the default (non-swapped)
        // template is correct as-is, same as every other chart type.
        inject.stackedBar100MeasureAsCategory = this.props.edaChart === 'stackedbar100' && dataDescription.otherColumns.length === 1;
        inject.chartDataset = chartData[1];

        let assignedColors = this.props.config.getConfig()['assignedColors'] || [];
        const currentLabels = this.getLabelsForChartType(inject);

        if (assignedColors.length === 0) {
            assignedColors = this.chartUtils.resolveAssignedColors(currentLabels, [], this.paletaActual);
            this.props.config.getConfig()['assignedColors'] = assignedColors;
        } else {
            const colorMap = new Map<string, any>(assignedColors.map(ac => [ac.value, ac]));
            assignedColors = currentLabels.map((label, index) => {
                const assignedColor = colorMap.get(label);
                if (assignedColor) {
                    const entry: any = { value: label, color: assignedColor.color };
                    if (assignedColor.opacity !== undefined) entry.opacity = assignedColor.opacity;
                    return entry;
                } else {
                    return { value: label, color: this.paletaActual[index % this.paletaActual.length] };
                }
            });
        }

        inject.assignedColors = assignedColors;

        // --- Determine color mode (same 3 modes as before). Modes 1/2 are genuinely per-CATEGORY,
        // not per-series - they populate categoryColorOverrides (keyed by category label) instead
        // of baking a positional array into chartDataset/chartColors; eda-bar-d3 reads color
        // natively from assignedColors (series default) and categoryColorOverrides (override). ---
        const coloredBarsConfig = cfg['coloredBarsConfig'];
        const hasThresholds = coloredBarsConfig?.thresholdHigh != null || coloredBarsConfig?.thresholdLow != null;
        if (coloredBarsConfig?.active && hasThresholds) {
            // Mode 1: Interval-based colors
            const { thresholdHigh, thresholdLow, colorAbove, colorBetween, colorBelow } = coloredBarsConfig;
            const bothThresholds = thresholdHigh != null && thresholdLow != null;
            const baseColor = assignedColors[0]?.color || '#cccccc';
            inject.categoryColorOverrides = chartData[0].map((label: string, idx: number) => {
                const value = chartData[1][0].data[idx];
                let color = baseColor;
                if (thresholdHigh != null && value > thresholdHigh) color = colorAbove;
                else if (thresholdLow != null && value < thresholdLow) color = colorBelow;
                else if (bothThresholds) color = colorBetween;
                return { value: label, color };
            });

        } else if (cfg['showUniqueColors']) {
            // Mode 2: Unique colors per bar (one color per label/category), keyed by category label.
            const uniqueBarColors: { value: string; color: string }[] = cfg['uniqueBarColors'] || [];
            const uniqueByLabel = new Map(uniqueBarColors.map(u => [u.value, u.color]));
            inject.categoryColorOverrides = chartData[0].map((label: string, idx: number) => ({
                value: label,
                color: uniqueByLabel.get(label) || this.paletaActual[idx % this.paletaActual.length]
            }));

        } else {
            // Mode 3: Assigned colors per series (default behavior) - nothing further to do,
            // eda-bar-d3 resolves each series' color directly from assignedColors.
            inject.categoryColorOverrides = undefined;
        }

        inject.chartLegend = cfg.chartLegend ?? true;
        inject.showLabels = cfg.showLabels ?? false;
        inject.showLabelsPercent = cfg.showLabelsPercent ?? false;
        inject.labelColorMode = cfg.labelColorMode ?? 'series';
        inject.labelCustomColor = cfg.labelCustomColor;
        inject.showGridLines = cfg.showGridLines ?? true;
        inject.useGradient = cfg.useGradient ?? true;
        inject.useRoundedBars = cfg.useRoundedBars ?? true;
        inject.chartAnimation = cfg.chartAnimation ?? true;
        inject.linkedDashboard = this.props.linkedDashboardProps;

        this.createD3Component(inject, EdaBarD3Component);
    }

    /**
     * Renders the D3-based line chart. Trend and prediction datasets are appended after the real
     * series get their assigned colors, inheriting their source series' color directly via the
     * isTrend/isPrediction/sourceLabel flags (eda-line-d3 resolves them by sourceLabel).
     */
    private renderLine() {
        let values = _.cloneDeep(this.props.data.values);
        const dataTypes = this.props.query.map(col => col.column_type);
        const dataDescription = this.chartUtils.describeData(this.props.query, this.props.data.labels);
        const cfg: any = this.props.config.getConfig();

        // COMPARISONS
        if (!!cfg.addComparative
            && this.props.query.length === 2
            && this.props.query.filter(field => field.column_type === 'date').length > 0
            && ['month', 'week', 'day'].includes(this.props.query.filter(field => field.column_type === 'date')[0].format)) {

            values = this.chartUtils.comparePeriods(this.props.data, this.props.query);
            let types = this.props.query.map(field => field.column_type);
            let dateIndex = types.indexOf('date');
            dataTypes.splice(dateIndex, 0, 'date');
            let dateCol = dataDescription.otherColumns.filter(c => c.index === dateIndex)[0];
            let newCol = { name: dateCol.name + '_newDate', index: dateCol.index + 1 };
            dataDescription.otherColumns.push(newCol);
            dataDescription.totalColumns++;
        }

        const hasPrediction = cfg.showPredictionLines === true;
        if (hasPrediction) {
            const _predQueryLen = (this.props.query?.length || 0);
            const _hasPredCols = values?.length > 0 && (values[0]?.length || 0) > _predQueryLen;
            values = this._preparePredictionValues(values, dataDescription, dataTypes, cfg, _predQueryLen, _hasPredCols);
        }

        const chartData = this.chartUtils.transformDataQuery('line', 'line', values, dataTypes, dataDescription, false, cfg.numberOfColumns);
        if (chartData.length == 0) {
            chartData.push([], []);
        }

        // The prediction dataset (if any) is always the last one transformDataQuery produces (see
        // _preparePredictionValues pushing an extra trailing numeric column) - pop it off before
        // resolving assignedColors so it never consumes its own palette slot/legend entry.
        const predictionDataset = hasPrediction && chartData[1].length > 0 ? chartData[1].pop() : null;

        const inject: any = new EdaLineD3();
        inject.id = this.randomID();
        inject.chartType = 'line';
        inject.edaChart = 'line';
        inject.chartLabels = chartData[0];
        inject.categoryFieldName = dataDescription.otherColumns[0]?.name;

        // TREND - a straight regression line per real series. Added before color resolution so it
        // gets its own (editable) assignedColors row, defaulting to its source series' color.
        if (cfg.addTrend && chartData[1].length > 0) {
            const trends = chartData[1].map((serie: any) => {
                const trend: any = this.chartUtils.getTrend(serie);
                trend.isTrend = true;
                trend.sourceLabel = serie.label;
                return trend;
            });
            trends.forEach(trend => chartData[1].push(trend));
        }

        // PREDICTION - dashed continuation of its source series, added after trend so its row comes
        // after it in the dialog list.
        if (predictionDataset) {
            const source = chartData[1].find((d: any) => !d.isTrend && !d.isPrediction) || chartData[1][0];
            predictionDataset.isPrediction = true;
            predictionDataset.sourceLabel = source?.label;
            chartData[1].push(predictionDataset);
        }

        inject.chartDataset = chartData[1];

        let assignedColors = this.props.config.getConfig()['assignedColors'] || [];
        const currentLabels = this.getLabelsForChartType(inject);

        if (assignedColors.length === 0) {
            assignedColors = this.chartUtils.resolveAssignedColors(currentLabels, [], this.paletaActual);
            this.props.config.getConfig()['assignedColors'] = assignedColors;
        } else {
            const colorMap = new Map<string, any>(assignedColors.map(ac => [ac.value, ac]));
            assignedColors = currentLabels.map((label, index) => {
                const assignedColor = colorMap.get(label);
                if (assignedColor) {
                    const entry: any = { value: label, color: assignedColor.color };
                    if (assignedColor.opacity !== undefined) entry.opacity = assignedColor.opacity;
                    return entry;
                } else {
                    // Trend/prediction default to their source series' resolved color, not the next palette slot.
                    const ds = chartData[1].find((d: any) => d.label === label);
                    const sourceColor = (ds?.isTrend || ds?.isPrediction) ? colorMap.get(ds.sourceLabel)?.color : undefined;
                    return { value: label, color: sourceColor || this.paletaActual[index % this.paletaActual.length] };
                }
            });
        }

        // eda-line-d3 resolves each series' color/opacity directly from assignedColors, by its own
        // label first (so trend/prediction rows are independently editable) falling back to the
        // source series' entry only when they have none of their own yet.
        inject.assignedColors = assignedColors;

        inject.chartLegend = cfg.chartLegend ?? true;
        inject.showLabels = cfg.showLabels ?? false;
        inject.showLabelsPercent = cfg.showLabelsPercent ?? false;
        inject.labelColorMode = cfg.labelColorMode ?? 'series';
        inject.labelCustomColor = cfg.labelCustomColor;
        inject.showGridLines = cfg.showGridLines ?? true;
        inject.showPointLines = cfg.showPointLines ?? false;
        inject.showLabels = cfg.showLabels ?? false;
        inject.showLabelsPercent = cfg.showLabelsPercent ?? false;
        inject.chartAnimation = cfg.chartAnimation ?? true;
        inject.linkedDashboard = this.props.linkedDashboardProps;

        this.createD3Component(inject, EdaLineComponent);
    }

    /**
     * Renders the D3-based area chart. Same trend/comparison handling as renderLine() (area is
     * conceptually a filled line). Also fixes today's broken click-to-filter (missing from
     * eda-blank-panel.component.ts's allowlist) simply by being a normal D3 component that emits
     * the same {inx, label, value, filterBy} shape as everything else.
     */
    private renderArea() {
        let values = _.cloneDeep(this.props.data.values);
        const dataTypes = this.props.query.map(col => col.column_type);
        const dataDescription = this.chartUtils.describeData(this.props.query, this.props.data.labels);
        const cfg: any = this.props.config.getConfig();

        // COMPARISONS
        if (!!cfg.addComparative
            && this.props.query.length === 2
            && this.props.query.filter(field => field.column_type === 'date').length > 0
            && ['month', 'week', 'day'].includes(this.props.query.filter(field => field.column_type === 'date')[0].format)) {

            values = this.chartUtils.comparePeriods(this.props.data, this.props.query);
            let types = this.props.query.map(field => field.column_type);
            let dateIndex = types.indexOf('date');
            dataTypes.splice(dateIndex, 0, 'date');
            let dateCol = dataDescription.otherColumns.filter(c => c.index === dateIndex)[0];
            let newCol = { name: dateCol.name + '_newDate', index: dateCol.index + 1 };
            dataDescription.otherColumns.push(newCol);
            dataDescription.totalColumns++;
        }

        const chartData = this.chartUtils.transformDataQuery('area', 'area', values, dataTypes, dataDescription, false, cfg.numberOfColumns);
        if (chartData.length == 0) {
            chartData.push([], []);
        }

        const inject: any = new EdaAreaD3();
        inject.id = this.randomID();
        inject.chartType = 'line';
        inject.edaChart = 'area';
        inject.chartLabels = chartData[0];
        inject.categoryFieldName = dataDescription.otherColumns[0]?.name;

        // TREND - a straight regression line per real series. Added before color resolution so it
        // gets its own (editable) assignedColors row, defaulting to its source series' color.
        if (cfg.addTrend && chartData[1].length > 0) {
            const trends = chartData[1].map((serie: any) => {
                const trend: any = this.chartUtils.getTrend(serie);
                trend.isTrend = true;
                trend.sourceLabel = serie.label;
                return trend;
            });
            trends.forEach(trend => chartData[1].push(trend));
        }

        inject.chartDataset = chartData[1];

        let assignedColors = this.props.config.getConfig()['assignedColors'] || [];
        const currentLabels = this.getLabelsForChartType(inject);

        if (assignedColors.length === 0) {
            assignedColors = this.chartUtils.resolveAssignedColors(currentLabels, [], this.paletaActual);
            this.props.config.getConfig()['assignedColors'] = assignedColors;
        } else {
            const colorMap = new Map<string, any>(assignedColors.map(ac => [ac.value, ac]));
            assignedColors = currentLabels.map((label, index) => {
                const assignedColor = colorMap.get(label);
                if (assignedColor) {
                    const entry: any = { value: label, color: assignedColor.color };
                    if (assignedColor.opacity !== undefined) entry.opacity = assignedColor.opacity;
                    return entry;
                } else {
                    // Trend defaults to its source series' resolved color and a lighter 25% opacity,
                    // not the next palette slot - still independently editable afterwards.
                    const ds = chartData[1].find((d: any) => d.label === label);
                    const isTrend = !!ds?.isTrend;
                    const sourceColor = isTrend ? colorMap.get(ds.sourceLabel)?.color : undefined;
                    const entry: any = { value: label, color: sourceColor || this.paletaActual[index % this.paletaActual.length] };
                    if (isTrend) entry.opacity = 25;
                    return entry;
                }
            });
        }

        // eda-area-d3 resolves each series' color/opacity directly from assignedColors, by its own
        // label first (so the trend row is independently editable) falling back to the source
        // series' entry only when it has none of its own yet.
        inject.assignedColors = assignedColors;

        inject.chartLegend = cfg.chartLegend ?? true;
        inject.showLabels = cfg.showLabels ?? false;
        inject.showLabelsPercent = cfg.showLabelsPercent ?? false;
        inject.labelColorMode = cfg.labelColorMode ?? 'series';
        inject.labelCustomColor = cfg.labelCustomColor;
        inject.showGridLines = cfg.showGridLines ?? true;
        inject.showPointLines = cfg.showPointLines ?? false;
        inject.useGradient = cfg.useGradient ?? true;
        inject.chartAnimation = cfg.chartAnimation ?? true;
        inject.linkedDashboard = this.props.linkedDashboardProps;

        this.createD3Component(inject, EdaAreaComponent);
    }

    /**
     * Renders the D3-based barline (mixed bar+line combo) chart. Unlike bar's family, barline
     * doesn't carry the 3 extra color modes (threshold/unique/assigned) - only per-series assigned
     * colors apply here.
     */
    private renderBarlineD3() {
        let values = _.cloneDeep(this.props.data.values);
        const dataTypes = this.props.query.map(col => col.column_type);
        const dataDescription = this.chartUtils.describeData(this.props.query, this.props.data.labels);
        const cfg: any = this.props.config.getConfig();

        const chartData = this.chartUtils.transformDataQuery('bar', 'barline', values, dataTypes, dataDescription, true, cfg.numberOfColumns);
        if (chartData.length == 0) {
            chartData.push([], []);
        }

        const inject: any = new EdaBarlineD3();
        inject.id = this.randomID();
        inject.chartType = 'bar';
        inject.edaChart = 'barline';
        inject.chartLabels = chartData[0];
        inject.categoryFieldName = dataDescription.otherColumns[0]?.name;
        inject.chartDataset = chartData[1];

        let assignedColors = this.props.config.getConfig()['assignedColors'] || [];
        const currentLabels = this.getLabelsForChartType(inject);

        if (assignedColors.length === 0) {
            assignedColors = this.chartUtils.resolveAssignedColors(currentLabels, [], this.paletaActual);
            this.props.config.getConfig()['assignedColors'] = assignedColors;
        } else {
            const colorMap = new Map<string, any>(assignedColors.map(ac => [ac.value, ac]));
            assignedColors = currentLabels.map((label, index) => {
                const assignedColor = colorMap.get(label);
                if (assignedColor) {
                    return { value: label, color: assignedColor.color };
                } else {
                    return { value: label, color: this.paletaActual[index % this.paletaActual.length] };
                }
            });
        }

        // eda-barline-d3 resolves each series' color directly from assignedColors - no more
        // Chart.js-shaped chartColors/backgroundColor baking needed.
        inject.assignedColors = assignedColors;

        inject.chartLegend = cfg.chartLegend ?? true;
        inject.showLabels = cfg.showLabels ?? false;
        inject.showLabelsPercent = cfg.showLabelsPercent ?? false;
        inject.labelColorMode = cfg.labelColorMode ?? 'series';
        inject.labelCustomColor = cfg.labelCustomColor;
        inject.showGridLines = cfg.showGridLines ?? true;
        inject.useGradient = cfg.useGradient ?? true;
        inject.useRoundedBars = cfg.useRoundedBars ?? true;
        inject.showPointLines = cfg.showPointLines ?? false;
        inject.secondAxis = cfg.secondAxis ?? false;
        inject.chartAnimation = cfg.chartAnimation ?? true;
        inject.linkedDashboard = this.props.linkedDashboardProps;

        this.createD3Component(inject, EdaBarlineComponent);
    }

    // Shared by the older D3 charts below (parallelSets/funnel/bubblechart/treeMap/scatter/
    // sunburst/treetable): mount the component and wire up its click output. Unlike
    // createD3Component() (doughnut/polarArea/bar), these don't track currentConfig or emit
    // configUpdated - preserved exactly as they already behaved, not changed as part of this.
    private createLegacyD3Component(inject: any, componentType: Type<any>) {
        this.entry.clear();
        this.componentRef = this.entry.createComponent(componentType);
        this.componentRef.instance.inject = inject;
        this.componentRef.instance.onClick.subscribe((event) => this.onChartClick.emit({ ...event, query: this.props.query }));
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
        inject.useGradient = this.props.config.getConfig()['useGradient'] ?? true;
        inject.chartLegend = this.props.config.getConfig()['chartLegend'] ?? true;
        this.createLegacyD3Component(inject, EdaD3Component);
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
        inject.useGradient = this.props.config.getConfig()['useGradient'] ?? true;
        inject.chartLegend = this.props.config.getConfig()['chartLegend'] ?? true;
        this.createLegacyD3Component(inject, EdaFunnelComponent);
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
        inject.useGradient = this.props.config.getConfig()['useGradient'] ?? true;
        inject.chartLegend = this.props.config.getConfig()['chartLegend'] ?? true;
        this.createLegacyD3Component(inject, EdaBubblechartComponent);
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
        inject.useGradient = this.props.config.getConfig()['useGradient'] ?? true;
        inject.chartLegend = this.props.config.getConfig()['chartLegend'] ?? true;

        this.createLegacyD3Component(inject, EdaTreeMap);
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
        inject.useGradient = this.props.config.getConfig()['useGradient'] ?? true;
        inject.chartLegend = this.props.config.getConfig()['chartLegend'] ?? true;
        this.createLegacyD3Component(inject, EdaScatter);
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
        inject.useGradient = this.props.config.getConfig()['useGradient'] ?? true;
        inject.chartLegend = this.props.config.getConfig()['chartLegend'] ?? true;
        this.createLegacyD3Component(inject, EdaSunburstComponent);
    }

    private renderTreetable() {
        const inject = this.props;
        this.createLegacyD3Component(inject, EdaTreeTable);
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
                // Doughnut (D3)
                if (this.props.chartType === 'doughnut') {
                    this.updateD3Colors(() => this.renderDoughnut());
                }
                // PolarArea (D3)
                else if (this.props.chartType === 'polarArea') {
                    this.updateD3Colors(() => this.renderPolarArea());
                }
                // Bar family (D3), except barline (its own branch below)
                else if (this.props.chartType === 'bar' && this.props.edaChart !== 'barline') {
                    this.updateD3Colors(() => this.renderBar());
                }
                // Radar (D3)
                else if (this.props.chartType === 'radar') {
                    this.updateD3Colors(() => this.renderRadar());
                }
                // Line/area/barline (D3)
                else if (this.props.chartType === 'line' && this.props.edaChart !== 'area') {
                    this.updateD3Colors(() => this.renderLine());
                }
                else if (this.props.chartType === 'line' && this.props.edaChart === 'area') {
                    this.updateD3Colors(() => this.renderArea());
                }
                else if (this.props.chartType === 'bar' && this.props.edaChart === 'barline') {
                    this.updateD3Colors(() => this.renderBarlineD3());
                }
                // KPI
                else if (['kpibar', 'kpiline', 'kpiarea'].includes(this.props.chartType)) {
                    this.updateKPIColors();
                }
                else if (this.props.chartType === 'kpitrend') {
                    this.updateKpiTrendColors();
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

    public updateKPIColors() {
        const config = this.props.config.getConfig();
        const assignedColors = config['assignedColors'];

        this.props.config.setConfig(new KpiConfig(assignedColors));
        // Re-render KPI from scratch
        this.renderEdaKpiChart();
    }

    public updateKpiTrendColors() {
        const config = this.props.config.getConfig();
        const assignedColors = config['assignedColors'];

        this.props.config.setConfig(new KpiTrendConfig({ assignedColors }));
        this.renderEdaKpiTrend();
    }

    public updateMapColors() {
        // Setup data variables
        const config = this.props.config.getConfig();
        const assignedColors = config['assignedColors'];
        if (assignedColors && Array.isArray(assignedColors) && assignedColors.length > 0) {
            // Recover the colors depending on the map type
            if (this.props.chartType === 'geoJsonMap') {
                config['color'] = assignedColors[0].color;
            } else if (this.props.chartType === 'coordinatesMap') {
                config['initialColor'] = assignedColors[0]?.color;
                config['finalColor'] = assignedColors[1]?.color;
            }

            // Preserve all existing values — must carry assignedColors forward so
            // the subsequent renderMap call finds them in the config.
            const newMapConfig = new MapConfig(
                config['coordinates'],
                config['zoom'],
                config['logarithmicScale'],
                config['legendPosition'] || 'bottomleft',
                config['color'] || assignedColors[0]?.color,
                config['draggable'] !== undefined ? config['draggable'] : true
            );
            (newMapConfig as any)['assignedColors'] = assignedColors;
            this.props.config.setConfig(newMapConfig);
        }
        // Re-render the map
        this.renderMap(this.props.chartType);
    }

    // Shared by doughnut/polarArea/bar: destroy the live D3 component and re-run its render()
    // to pick up new colors. The three used to be copy-pasted, identical except which render
    // method they called at the end.
    private updateD3Colors(render: () => void): void {
        const config = this.props.config.getConfig();
        const assignedColors = config['assignedColors'];

        if (!assignedColors?.length) {
            return;
        }

        if (this.chartClickSubscription) {
            this.chartClickSubscription.unsubscribe();
            this.chartClickSubscription = null;
        }

        setTimeout(() => {
            if (this.componentRef) {
                this.componentRef.destroy();
                this.componentRef = null;
            }
            render();
        });
    }

    public updateD3ChartColors(chartType: string) {
        const config = this.props.config.getConfig();
        const assignedColors = config['assignedColors'];

        if (!assignedColors || !Array.isArray(assignedColors) || assignedColors.length === 0) {
            return;
        }

        // Extract only the colors from the assignedColors array
        const colors = assignedColors.map(item => item.color);
        // setConfig() below replaces the whole config object with a bare *Config instance (only
        // holding `colors`) - useGradient would otherwise be silently reset to its default.
        const useGradient = config['useGradient'] ?? true;

        switch (chartType) {
            case 'treeMap':
                this.props.config.setConfig(new TreeMapConfig(colors));
                this.props.config.getConfig()['useGradient'] = useGradient;
                this.renderTreeMap();
                break;
            case 'sunburst':
                this.props.config.setConfig(new SunburstConfig(colors));
                this.props.config.getConfig()['useGradient'] = useGradient;
                this.renderSunburst();
                break;
            case 'parallelSets':
                this.props.config.setConfig(new SankeyConfig(colors));
                this.props.config.getConfig()['useGradient'] = useGradient;
                this.renderParallelSets();
                break;
            case 'scatterPlot':
                this.props.config.setConfig(new ScatterConfig(colors));
                this.props.config.getConfig()['useGradient'] = useGradient;
                this.renderScatter();
                break;
            case 'funnel':
                this.props.config.setConfig(new FunnelConfig(assignedColors));
                this.props.config.getConfig()['useGradient'] = useGradient;
                this.renderFunnel();
                break;
            // case 'knob': // Knob disabled for now because it does not work
            //     this.props.config.setConfig(new KnobConfig(
            //         assignedColors[0]?.color,config['limits']));
            //     this.renderKnob();
            //     break;
            case 'bubblechart':
                this.props.config.setConfig(new BubblechartConfig(colors));
                this.props.config.getConfig()['useGradient'] = useGradient;
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
            // Build a consumable copy of labels to correctly match each column by column_name.
            // This handles cases where currentQuery is reordered differently from the server labels
            const availableLabels = [...labels];

            for (let i = 0, n = this.props.query.length; i < n; i += 1) {

                const r: Column = this.props.query[i];
                // Find the label matching this column's column_name (consume it to handle duplicates)
                const labelIdx = availableLabels.findIndex(l => l === r.column_name);
                const label = labelIdx !== -1
                    ? availableLabels.splice(labelIdx, 1)[0]
                    : (availableLabels.shift() ?? labels[i]);

                if (_.isEqual(r.column_type, 'date')) {
                    tableColumns.push(new EdaColumnDate({ header: r.display_name.default, field: label, description: r.description.default }));
                } else if (_.isEqual(r.column_type, 'numeric')) {
                    tableColumns.push(new EdaColumnNumber({ header: r.display_name.default, field: label, description: r.description.default , decimals: r.minimumFractionDigits}))
                } else if (_.isEqual(r.column_type, 'html')) {
                    tableColumns.push(new EdaColumnHtml({ header: r.display_name.default, field: label, description: r.description.default }));
                } else if (_.isEqual(r.column_type, 'text')) {
                    let rangeOption = false;
                    if(r.ranges === undefined) {
                        tableColumns.push(new EdaColumnText({ header: r.display_name.default, field: label, description: r.description.default }));
                    } else {
                        if(r.ranges.length > 0) {
                            rangeOption = true;
                            tableColumns.push(new EdaColumnText({ header: r.display_name.default, field: label, description: r.description.default, rangeOption: rangeOption }));
                        } else {
                            tableColumns.push(new EdaColumnText({ header: r.display_name.default, field: label, description: r.description.default, rangeOption: rangeOption }));
                        }
                    }
                } else if (_.isEqual(r.column_type, 'coordinate')) {
                    tableColumns.push(new EdaColumnNumber({ header: r.display_name.default, field: label, description: r.description.default }));
                }
            }
            // Extra columns added by the backend (e.g. prediction) that are not in the original query.
            // Only process them if there are more labels than fields in the query (hasPredictionData).
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
     * Resolves and persists assigned colors for a chart
     * @param categories - Array of current chart categories/labels
     * @param props - Chart props (must have config and assignedColors)
     * @param paletaActual - Fallback color palette
     * @returns Array of correctly mapped assignedColors
     */

    private _prepareTablePredictionData(labels: string[], values: any[][], queryLen: number): { tableLabels: string[], tableValues: any[][] } {
        const rowLen = values[0].length;
        const targetSpec = this.props.predictionConfig?.targetColumn;
        let numericCol: any;
        if (targetSpec) {
            numericCol = this.props.query?.find((q: any) =>
                q.column_name === targetSpec.column_name && q.table_id === targetSpec.table_id
            );
        }
        if (!numericCol) {
            numericCol = this.props.query?.find((q: any) => q.column_type === 'numeric');
        }
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
        // Resolve target column index once for use in both blocks below
        const targetSpec = this.props.predictionConfig?.targetColumn;
        let targetQueryIdx = -1;
        if (targetSpec) {
            targetQueryIdx = (this.props.query as any[])?.findIndex((q: any) =>
                q.column_name === targetSpec.column_name && q.table_id === targetSpec.table_id
            ) ?? -1;
        }

        if (cfg.showPredictionLines === true) {
            const predictionIndex = values[0].length - 1;
            const targetNumericCol = targetQueryIdx >= 0
                ? dataDescription.numericColumns.find((c: any) => c.index === targetQueryIdx)
                : null;
            const baseName = targetNumericCol?.name || dataDescription.numericColumns[0]?.name || '';
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
                    const targetCol = targetQueryIdx >= 0
                        ? actualNumericCols.find((c: any) => c.index === targetQueryIdx)
                        : null;
                    const numericIdx = (targetCol ?? actualNumericCols[0]).index;
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
    
    // Validate inputs
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
    
    // If there are already saved colors AND categories match, 
    // do not regenerate (avoids regeneration loop)
    if (savedAssignedColors.length > 0) {
        // Check if categories are the same
        const savedValues = savedAssignedColors.map(ac => ac.value).sort();
        const currentValues = categories.slice().sort();
        const sameCategoriesCount = savedValues.length === currentValues.length;
        
        // If they have the same number of categories, assume they are the same data
        // and simply map existing colors
        if (sameCategoriesCount) {
            assignedColors = categories.map((category, index) => {
                const found = savedAssignedColors.find(ac => ac.value === category);
                // A found entry with no color (leftover from a stale/mismatched save) must still
                // fall back to the palette - otherwise an invalid color propagates to the SVG.
                return (found && found.color) ? found : {
                    value: category,
                    color: paletaActual[index % paletaActual.length]
                };
            });
        } else {
            // Categories changed (filter applied), map what you can
            assignedColors = categories.map((category, index) => {
                const found = savedAssignedColors.find(ac => ac.value === category);
                return (found && found.color) ? found : {
                    value: category,
                    color: paletaActual[index % paletaActual.length]
                };
            });
        }
    } 
    
    // Final validation
    if (!assignedColors || assignedColors.length === 0) {
        assignedColors = categories.map((cat, idx) => ({
            value: cat,
            color: paletaActual[idx % paletaActual.length]
        }));
    }
    
    
    // ONLY persist if something actually changed
    // Compare with saved data to avoid unnecessary writes --> this comes from double render
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
        // Read from multiple sources
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
        
        // Persist in both places
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