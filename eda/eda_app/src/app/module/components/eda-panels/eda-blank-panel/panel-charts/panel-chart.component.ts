import { TableConfig } from './chart-configuration-models/table-config';
import { Component, OnInit, Input, SimpleChanges, OnChanges, ViewChild, ViewContainerRef, ComponentFactoryResolver, OnDestroy, Output, EventEmitter, Self, ElementRef } from '@angular/core';
import { EdaKpiComponent } from '../../../eda-kpi/eda-kpi.component';
import { EdaTableComponent } from '../../../eda-table/eda-table.component';
import { PanelChart } from './panel-chart';
import { ChartUtilsService } from '@eda/services/service.index';

import { Column } from '@eda/models/model.index';
import { EdaChartComponent } from '@eda/components/eda-chart/eda-chart.component';
import { EdaColumnDate } from '@eda/components/eda-table/eda-columns/eda-column-date';
import { EdaColumnNumber } from '@eda/components/eda-table/eda-columns/eda-column-number';
import { EdaColumnText } from '@eda/components/eda-table/eda-columns/eda-column-text';
import { EdaTable } from '@eda/components/eda-table/eda-table';

import * as _ from 'lodash';
import { KpiConfig } from './chart-configuration-models/kpi-config';

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

    @ViewChild('chartComponent', { read: ViewContainerRef, static: true }) entry: ViewContainerRef;


    /*Chart's containers for panel body and preview panel*/
    public componentRef: any;
    public currentConfig: any;
    public NO_DATA: boolean;

    constructor(public resolver: ComponentFactoryResolver,
        private chartUtils: ChartUtilsService,
        @Self() private ownRef: ElementRef) { }

    ngOnInit(): void {}

    ngOnChanges(changes: SimpleChanges): void {
        this.NO_DATA = false
        if (this.props.data && this.props.data.values.length !== 0) {
            this.NO_DATA = false;
            this.changeChartType();

        } else {
            this.NO_DATA = true;
            this.destroyComponent();
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
        if (['doughnut', 'polarArea', 'bar', 'horizontalBar', 'line', 'barline'].includes(type)) {
            this.renderEdaChart(type);
        }
        if (['kpi'].includes(type)) {
            this.renderEdaKpi();
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
        const isstacked  = this.props.edaChart === 'stackedbar';

        const dataDescription = this.chartUtils.describeData(this.props.query, this.props.data.labels);
        const dataTypes = this.props.query.map(column => column.column_type);

        const chartData = this.chartUtils.transformDataQuery(this.props.chartType, this.props.data.values,
            dataTypes, dataDescription, isbarline);

        const manySeries = chartData[1].length > 10 ? true : false;
        const config = this.chartUtils.initChartOptions(this.props.chartType, dataDescription.numericColumns[0].name,
            dataDescription.otherColumns, manySeries, isstacked, this.getDimensions());

        let chartConfig: any = {};
        chartConfig.chartType = this.props.chartType;
        chartConfig.edaChart = this.props.edaChart;
        chartConfig.chartLabels = chartData[0];

        if (type === 'doughnut' || type === 'polarArea') {
            chartConfig.chartData = chartData[1];
        } else {
            chartConfig.chartDataset = chartData[1];
        }

        chartConfig.chartOptions = config.chartOptions;
        chartConfig.chartColors = this.chartUtils.recoverChartColors(this.props.chartType, this.props.config);
       
        this.createEdaChartComponent(chartConfig);
    }

    /**
     * Renders a KPIComponent
     */
    private renderEdaKpi() {
        let chartConfig: any = {};
        chartConfig.value = this.props.data.values[0][0];
        chartConfig.header = this.props.query[0].display_name.default;
        const config = this.props.config;
        if(config ){
            chartConfig.sufix = (<KpiConfig>config.getConfig()).sufix ;
        }else{
            chartConfig.sufix = '';
        }
       
        this.createEdaKpiComponent(chartConfig);

    }

    /**
     * Creates a chart component
     * @param inject chart configuration
     */
    private createEdaChartComponent(inject: any) {
        this.currentConfig = inject;
        this.entry.clear();
        const factory = this.resolver.resolveComponentFactory(EdaChartComponent);
        this.componentRef = this.entry.createComponent(factory);
        this.componentRef.instance.inject = inject;
        this.configUpdated.emit();
    }

    /**
      * Creates a table component
      * @param inject chart configuration
      */
    private createEdatableComponent(type:string) {
        this.entry.clear();
        const factory = this.resolver.resolveComponentFactory(EdaTableComponent);
        this.componentRef = this.entry.createComponent(factory);
        this.componentRef.instance.inject = this.initializeTable(type, this.props.config.getConfig());
        this.componentRef.instance.inject.value = this.chartUtils.transformDataQueryForTable(this.props.data.labels, this.props.data.values);
        const config  = this.props.config.getConfig();
        if (config) {
            this.componentRef.instance.inject.rows = (<TableConfig>config).visibleRows;
            this.setTableProperties((<TableConfig>config));
        }
        this.componentRef.instance.inject.onNotify.subscribe(data => {
            (<TableConfig>config).visibleRows = data;
        });
        this.currentConfig = this.componentRef.instance.inject;
    }

    private setTableProperties(config:TableConfig) {
        this.componentRef.instance.inject.withColTotals = config.withColTotals;
        this.componentRef.instance.inject.withColSubTotals = config.withColSubTotals;
        this.componentRef.instance.inject.withRowTotals = config.withRowTotals;
        this.componentRef.instance.inject.resultAsPecentage = config.resultAsPecentage;
        this.componentRef.instance.inject.checkTotals(null, config.visibleRows);
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
           const kpiConfig = new KpiConfig(data.sufix);
            (<KpiConfig><unknown>this.props.config.setConfig(kpiConfig));
        })
    }

    /**
     * Destroys current component
     */
    public destroyComponent() {
        if (this.componentRef) {
            this.componentRef.destroy();
        }
    }

    /**
     * Initializes table
     * @param type 
     * @param configs 
     */
    private initializeTable(type: string, configs?: any): EdaTable {
        const tableColumns = [];
        console.log("WARNING! Unique names");
        for (let i = 0, n = this.props.query.length; i < n; i += 1) {

            const label = this.props.data.labels[i];
            const r: Column = this.props.query[i];

            if (_.isEqual(r.column_type, 'date')) {
                tableColumns.push(new EdaColumnDate({ header: r.display_name.default, field: label}));
            } else if (_.isEqual(r.column_type, 'numeric')) {
                tableColumns.push(new EdaColumnNumber({ header: r.display_name.default, field: label}))
            } else if (_.isEqual(r.column_type, 'varchar')) {
                tableColumns.push(new EdaColumnText({ header: r.display_name.default, field: label }));
            } else if (_.isEqual(r.column_type, 'text')) {
                tableColumns.push(new EdaColumnText({ header: r.display_name.default, field: label }));
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