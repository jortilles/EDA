
import { KpiConfig } from './panel-charts/chart-configuration-models/kpi-config';
import { TableConfig } from './panel-charts/chart-configuration-models/table-config';
import { MAX_TABLE_ROWS_FOR_ALERT } from '../../../../config/config';
import { PanelChartComponent } from './panel-charts/panel-chart.component';
import { Component, Input, OnInit, ViewChild, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CdkDragDrop, moveItemInArray, transferArrayItem, CdkDrag } from '@angular/cdk/drag-drop';
import { Column, Query, EdaPanel, InjectEdaPanel } from '@eda/models/model.index';
import {
    DashboardService, ChartUtilsService, AlertService,
    SpinnerService, FileUtiles, EdaChartType,
    FilterType, QueryBuilderService, OrdenationType
} from '@eda/services/service.index';
import {
    EdaPageDialogComponent, EdaDialogController, EdaContextMenu,
    EdaContextMenuItem, EdaDialogCloseEvent
} from '@eda/shared/components/shared-components.index';
import { EdaChartComponent } from '@eda/components/component.index';
import { PanelChart } from './panel-charts/panel-chart';
import * as _ from 'lodash';
import { ChartConfig } from './panel-charts/chart-configuration-models/chart-config';
import { ChartJsConfig } from './panel-charts/chart-configuration-models/chart-js-config';
import { EdaInputText } from '@eda/shared/components/eda-input/eda-input-text';


@Component({
    selector: 'eda-blank-panel',
    templateUrl: './eda-blank-panel.component.html',
    styleUrls: []
})
export class EdaBlankPanelComponent implements OnInit {

    @ViewChild('pdialog', { static: false }) pdialog: EdaPageDialogComponent;
    @ViewChild('edaChart', { static: false }) edaChart: EdaChartComponent;
    @ViewChild(PanelChartComponent, { static: false }) panelChart: PanelChartComponent;

    @Input() panel: EdaPanel;
    @Input() inject: InjectEdaPanel;
    @Output() remove: EventEmitter<any> = new EventEmitter();

    public configController: EdaDialogController;
    public filterController: EdaDialogController;
    public chartController: EdaDialogController;
    public tableController: EdaDialogController;
    public alertController: EdaDialogController;
    public contextMenu: EdaContextMenu;

    public inputs: any = {};

    /**Dashbard emitter */
    // public actualSize : {litle:boolean, medium:boolean}

    /** Page variables */
    public title: string = 'Blank Panel';
    // Display variables
    public display_v = {
        page_dialog: false, // page dialog
        saved_panel: false, // saved panel
        btnSave: false, // button guardar
        aggreg_dialog: false, // aggregation dialog
        calendar: false, // calendars inputs
        between: false, // between inputs
        filterValue: true,
        filterButton: true,
        minispinner: false, // mini spinner panel
        responsive: false, // responsive option
        chart: '', // Change between chart or table
        disablePreview: true,
        disableQueryInfo: true,
        edit_mode: true,
        notSaved: false
    };

    public index: number ;
    public description: string;
    public chartForm: FormGroup;
    public userSelectedTable: string;

    /** Query Variables */
    public tables: any[] = [];
    public tableToShow: any[] = [];
    public columns: any[] = [];
    public aggregationsTypes: any[] = [];
    public filtredColumns: Column[] = [];
    public ordenationTypes: OrdenationType[];
    public currentQuery: any[] = [];
    public currentSQLQuery: string;

    public modeSQL: boolean;
    public sqlOriginTables: {}[];
    public sqlOriginTable: any;

    /** Chart Variables */
    public chartTypes: EdaChartType[]; // All posible chartTypes
    public chartData: any[] = [];  // Data for Charts
    public chartLabels: string[] = []; // Labels for Charts
    public graficos: any = {}; // Inject for Charts
    public filterTypes: FilterType[];
    public selectedFilters: any[] = [];
    public globalFilters: any[] = [];
    public filterValue: any = {};

    public color: any = { r: 255, g: 0, b: 0.3 };

    /*Deep copies for panel and color configuration to recover panel when edit changes are cancelled*/
    public panelDeepCopy: any = {};
    public colorsDeepCopy: any = {};


    /**panel chart component configuration */
    public panelChartConfig: PanelChart = new PanelChart();

    constructor(
        private dashboardService: DashboardService,
        private chartUtils: ChartUtilsService,
        private queryBuilder: QueryBuilderService,
        private fileUtiles: FileUtiles,
        private formBuilder: FormBuilder,
        private alertService: AlertService,
        private spinnerService: SpinnerService
    ) {
        this.initializeBlankPanelUtils();
        this.initializeInputs();
    }


    ngOnInit(): void {
        this.index = 0;
        this.modeSQL = false;

        this.loadTablesData();

        if (this.panel.content) {
            const query = this.panel.content.query;

            if (query.query.modeSQL) {
                this.modeSQL = true;
                this.currentSQLQuery = query.query.SQLexpression;
                this.sqlOriginTable = this.tables.filter(t => t.table_name === query.query.fields[0].table_id)
                    .map(table => {
                        return { label: table.display_name.default, value: table.table_name }
                    })[0];
            }

            this.loadChartsData(this.panel.content);
        }

        this.setEditMode();

        this.dashboardService.notSaved.subscribe(
            (data) => this.display_v.notSaved = data,
            (err) => this.alertService.addError(err)
        );
    }



    setEditMode() {
        const user = localStorage.getItem('user');
        const userName = JSON.parse(user).name;
        this.display_v.edit_mode = userName !== 'edaanonim';
    }

    private initializeBlankPanelUtils(): void {
        this.chartForm = this.formBuilder.group({ chart: [null, Validators.required] });

        this.chartTypes = this.chartUtils.chartTypes; // Loading all disponibles chart type from a chartUtilService

        this.filterTypes = this.chartUtils.filterTypes;

        this.ordenationTypes = this.chartUtils.ordenationTypes;

        this.contextMenu = new EdaContextMenu({
            header: 'OPCIONES DEL PANEL',
            contextMenuItems: [
                new EdaContextMenuItem({
                    label: 'Editar consulta',
                    icon: 'fa fa-cog',
                    command: () => {
                        if (this.panel.content) {
                            this.panelDeepCopy = _.cloneDeep(this.panel.content, true);
                            this.display_v.disablePreview = false;
                        } else {
                            this.display_v.disablePreview = true;
                        }
                        if (Object.entries(this.graficos).length !== 0) {
                            this.colorsDeepCopy = _.cloneDeep(this.graficos);
                        }
                        this.contextMenu.hideContextMenu();
                        this.openEditarConsulta();
                        this.index = 0;
                    }
                }),
                new EdaContextMenuItem({
                    label: 'Editar opciones del gráfico',
                    icon: 'mdi mdi-wrench',
                    command: () => {
                        if (Object.entries(this.graficos).length !== 0 && this.chartData.length !== 0) {
                            if (['line', 'doughnut', 'polarArea', 'bar', 'horizontalBar', 'barline'].includes(this.graficos.chartType)) {
                                this.contextMenu.hideContextMenu();
                                this.chartController = new EdaDialogController({
                                    params: { panelId: _.get(this.panel, 'id'), chart: this.graficos },
                                    close: (event, response) => this.onCloseChartProperties(event, response)
                                });
                            } else if (['table', 'crosstable'].includes(this.graficos.chartType)) {
                                this.contextMenu.hideContextMenu();
                                this.tableController = new EdaDialogController({
                                    params: { panelId: _.get(this.panel, 'id'), panelChart: this.panelChartConfig },
                                    close: (event, response) => this.onCloseTableProperties(event, response)
                                });
                            }
                        }
                    }
                }),
                new EdaContextMenuItem({
                    label: 'Exportar a Excel',
                    icon: 'mdi mdi-file',
                    command: () => this.readyToExport('excel')
                }),
                new EdaContextMenuItem({
                    label: 'Eliminar panel',
                    icon: 'fa fa-trash',
                    command: () => {
                        this.contextMenu.hideContextMenu();
                        this.removePanel();
                    }
                })
            ]
        });
    }

    private initializeInputs(): void {
        this.inputs = {
            findTable: new EdaInputText({
                name: 'find_table',
                divClass: 'input-icons',
                inputClass: 'input-field',
                icon: 'fa fa-search icon',
                onKeyUp: (event) => this.onTableInputKey(event)
            }),
            findColumn: new EdaInputText({
                name: 'find_column',
                divClass: 'input-icons',
                inputClass: 'input-field', 
                icon: 'fa fa-search icon', 
                onKeyUp: (event) => this.onColumnInputKey(event)
            })
        };
    }

    /**
     * Builds a query object
     */
    private initEdaQuery(): Query {
        const config = this.setConfig();

        const params = {
            table: '',
            dataSource: this.inject.dataSource._id,
            panel: this.panel.id,
            dashboard: this.inject.dashboard_id,
            filters: this.mergeFilters(this.selectedFilters, this.globalFilters),
            config: config.getConfig()
        };

        return this.queryBuilder.normalQuery(this.currentQuery, params);
    }

    private initSqlQuery(): Query {
        const config = this.setConfig();

        const params = {
            table: '',
            dataSource: this.inject.dataSource._id,
            panel: this.panel.id,
            dashboard: this.inject.dashboard_id,
            filters: this.mergeFilters(this.selectedFilters, this.globalFilters),
            config: config.getConfig()
        };
        
        return this.queryBuilder.normalQuery(this.currentQuery, params, true, this.currentSQLQuery);
    }

    /**
     * Sets chart config
     */
    setConfig() {
        let tableRows: number;
        let config: any = null;
        if (this.panelChart.componentRef && ['table', 'crosstable'].includes(this.panelChart.props.chartType)) {
            tableRows = this.panelChart.componentRef.instance.inject.rows;
            config =
            {
                withColTotals: this.panelChart.componentRef.instance.inject.withColTotals,
                withColSubTotals: this.panelChart.componentRef.instance.inject.withColSubTotals,
                withRowTotals: this.panelChart.componentRef.instance.inject.withRowTotals,
                resultAsPecentage: this.panelChart.componentRef.instance.inject.resultAsPecentage,
                onlyPercentages: this.panelChart.componentRef.instance.inject.onlyPercentages,
                visibleRows: tableRows
            }
        } else {
            config = this.panelChart.componentRef && this.panelChart.props.chartType === 'kpi' ?
                { sufix: this.panelChart.componentRef.instance.inject.sufix } :
                { colors: this.graficos.chartColors, chartType: this.panelChart.props.chartType };
        }
        return new ChartConfig(config);
    }

    /**
     * Merge dashboard and panel filters
     * @param localFilters panel filters
     * @param globalFilters  dashboard filters
     * @return  merged filters
     */
    mergeFilters(localFilters: any[], globalFilters: any[]) {
        const out = localFilters.filter(f => f.isGlobal === false);
        globalFilters.forEach(f => out.push(f));
        return out;
    }

    /**
     * Load tables from model
     * this.tables and this.tablesToShow are modified
     */
    public loadTablesData(): void {
        if (this.inject.applyToAllfilter.present === true) {
            this.setAllowedTables();
            this.tableToShow = this.tables;
        } else {
            // All tables
            this.tables = _.cloneDeep(this.inject.dataSource.model.tables.filter(table => table.visible === true)
                .sort((a, b) => { return (a.display_name.default > b.display_name.default) ? 1 : ((b.display_name.default > a.display_name.default) ? -1 : 0) }));

            this.sqlOriginTables = this.tables.map(table => {
                return { label: table.display_name.default, value: table.table_name }
            });

            // All visible tables
            this.tableToShow = _.cloneDeep(this.inject.dataSource.model.tables.filter(table => table.visible === true)
                .sort((a, b) => {
                    return (a.display_name.default > b.display_name.default) ? 1 : ((b.display_name.default > a.display_name.default) ? -1 : 0)
                }));
        }
    }
    /**
     * reLoad tables from model (called from dashboard component)
     */
    public reloadTablesData() {
        if (this.inject.applyToAllfilter.present === true) {
            this.setAllowedTables();
        } else {
            this.tables = _.cloneDeep(this.inject.dataSource.model.tables
                .filter(table => table.visible === true)
                .sort((a, b) => {
                    return (a.display_name.default > b.display_name.default) ? 1 : ((b.display_name.default > a.display_name.default) ? -1 : 0)
                }));
            this.sqlOriginTables = this.tables.map(table => {
                return { label: table.display_name.default, value: table.table_name }
            });
        }
    }
    /*
    * Look's for tables relations path and set allowed tables
    */
    setAllowedTables() {
        const allTables = _.cloneDeep(this.inject.dataSource.model.tables);
        const originTable = allTables.filter(t => t.table_name === this.inject.applyToAllfilter.refferenceTable)[0];  // selected table
        const tablesMap = this.findRelationsRecursive(allTables, originTable, new Map());
        this.tables = Array.from(tablesMap.values());
        this.tables = this.tables
            .filter(table => table.visible === true)
            .sort((a, b) => (a.display_name.default > b.display_name.default) ? 1 : ((b.display_name.default > a.display_name.default) ? -1 : 0));
        this.sqlOriginTables = this.tables.map(table => {
            return { label: table.display_name.default, value: table.table_name }
        });
    }

    /**
     * Runs a query and sets global config for this panel
     * @param panelContent panel content to build query .
     */
    async loadChartsData(panelContent: any) {
        if (this.panel.content) {
            this.display_v.minispinner = true;
            
            try {
                const response = await this.switchAndRun(panelContent.query);
                this.chartLabels = this.chartUtils.uniqueLabels(response[0]);
                this.chartData = response[1];
                this.buildGlobalconfiguration(panelContent);
            } catch (err) {
                this.alertService.addError(err);
                this.display_v.minispinner = false;
            }
        }
    }

    /**
     * Sets configuration dialog and chart
     * @param panelContent panel content to build configuration .
     */
    buildGlobalconfiguration(panelContent: any) {
        if (!panelContent.query.query.modeSQL) {

            panelContent.query.query.fields.forEach(element => {
                this.loadColumns(this.tables.find(t => t.table_name === element.table_id));
                this.moveItem(this.columns.find(c => c.column_name === element.column_name));
            });
        }
        this.handleFilters(panelContent.query.query);
        this.handleFilterColumns(panelContent.query.query.filters, panelContent.query.query.fields);
        this.handleCurrentQuery();
        this.chartForm.patchValue({
            chart: this.chartUtils.chartTypes.find(o => o.subValue === panelContent.edaChart)
        });
        this.verifyData();

        const config = this.recoverConfig(panelContent.chart, panelContent.query.output.config);
        this.changeChartType(panelContent.chart, panelContent.edaChart, config);

        this.display_v.saved_panel = true;
        this.display_v.minispinner = false;
    }

    private recoverConfig(type: string, config: TableConfig | KpiConfig | ChartJsConfig) {
        if (['table', 'crosstable'].includes(type)) {
            return new ChartConfig(config);
        }
        if (['bar', 'line', 'pie', 'doughnut', 'barline', 'horizontalBar'].includes(type)) {
            return new ChartConfig(config);
        }
        if (type === 'kpi') {
            return new ChartConfig(config);
        }
    }

    /**
     * Updates panel content with actual state
     */
    public savePanel() {
        this.panel.title = this.pdialog.getTitle();
        if (!_.isEmpty(this.graficos) || this.modeSQL) {

            this.display_v.saved_panel = true;

            const query = this.initObjectQuery(this.modeSQL);
            const chart = this.chartForm.value.chart.value ? this.chartForm.value.chart.value : this.chartForm.value.chart;
            const edaChart = this.panelChart.props.edaChart;

            this.panel.content = { query, chart, edaChart };
            this.renderChart(this.currentQuery, this.chartLabels, this.chartData, chart, edaChart, this.panelChartConfig.config);
        } else {
            this.display_v.saved_panel = false;
        }
        this.display_v.page_dialog = false;

        //not saved alert message
        this.dashboardService._notSaved.next(true);
    }

    public initObjectQuery(modeSQL: boolean) {
        if (modeSQL) {
            return this.initSqlQuery();
        } else {
            return this.initEdaQuery()
        }
    }

    /**
     * Runs actual query when execute button is pressed to check for heavy queries
     */
    runManualQuery() {
        /**No check in sql mode */
        if (this.modeSQL) {
            this.runQuery(false);
            return
        }

        const totalTableCount = this.currentQuery.reduce((a, b) => {
            return a + parseInt(b.tableCount);
        }, 0);

        //console.log(this.currentQuery);      
        const aggregations = this.currentQuery.filter( col => col.aggregation_type.filter(agg => (agg.value != 'none' && agg.selected === true)  ).length > 0).length;
        


        //console.log(totalTableCount);
        //console.log(MAX_TABLE_ROWS_FOR_ALERT);
        //console.log(this.selectedFilters.length);
        //console.log(aggregations);

        if (totalTableCount > MAX_TABLE_ROWS_FOR_ALERT && (this.selectedFilters.length + aggregations <= 0)) {
            this.alertController = new EdaDialogController({
                params: { totalTableCount: totalTableCount },
                close: (event, response) => {
                    if (response) {
                        this.runQuery(false);
                    }
                    this.alertController = null;
                }
            });
        } else {
            this.runQuery(false);
        }
    }
    /**
     * Runs a query and sets panel chart
     * @param globalFilters flag to apply when runQuery() is called from dashboard component.
     */
    async runQuery(globalFilters: boolean) {

        this.display_v.disablePreview = false;
        if (!globalFilters) {
            this.spinnerService.on();
        } else {
            this.panelChart.NO_DATA = false;
            this.display_v.minispinner = true;
        }

        try {
            if (this.panelChart) {
                this.panelChart.destroyComponent();
            }
            const query = this.switchAndBuildQuery();

            /**Add fake column if SQL mode and there isn't fields yet */
            if (query.query.modeSQL && query.query.fields.length === 0) {
                query.query.fields.push(this.createColumn('custom', null));
            }
            // Execute query
            const response = await this.switchAndRun(query);
            this.chartLabels = this.chartUtils.uniqueLabels(response[0]);   // Chart labels
            this.chartData = response[1];       // Chart data
            this.ableBtnSave();                 // Button save

            /* Labels i Data - Arrays */
            if (!globalFilters) {
                this.verifyData();
                this.changeChartType('table', 'table', null);
                this.chartForm.patchValue({
                    chart: this.chartUtils.chartTypes.find(o => o.value === 'table')
                });
                this.spinnerService.off();
            } else {
                this.reloadContent();
                this.display_v.minispinner = false;
            }

            this.index = 1;
            this.display_v.saved_panel = true;
        } catch (err) {
            this.alertService.addError(err);
            this.spinnerService.off();
        }
    }

    async switchAndRun(query: Query) {
        if (!this.modeSQL) {
            const response = await this.dashboardService.executeQuery(query).toPromise();
            return response;
        } else {
            const response = await this.dashboardService.executeSqlQuery(query).toPromise();
            const numFields = response[0].length;
            const types = new Array(numFields);
            types.fill(null);

            for (let row = 0; row < response[1].length; row++) {
                response[1][row].forEach((field, i) => {
                    if (types[i] === null) {
                        if (typeof field === 'number') {
                            types[i] = 'numeric';
                        } else if (typeof field === 'string') {
                            types[i] = 'varchar';
                        }
                    }
                });
                if (!types.includes(null)) {
                    break;
                }
            }
            this.currentQuery = [];
            types.forEach((type, i) => {
                this.currentQuery.push(this.createColumn(response[0][i], type));
            });

            return response;
        }
    }

    private createColumn(columnName: string, columnType: string): any {
        const column = {
            table_id: this.sqlOriginTable.value,
            column_name: columnName,
            column_type: columnType,
            description: { default: columnName, locaized: [] },
            display_name: { default: columnName, localized: [] },
            format: null,
            aggregation_type: [{ display_name: "no", value: "none", selected: true }],
            column_granted_roles: [],
            row_granted_roles: [],
            ordenation_type: 'No',
            tableCount: 0,
            visible: true,
        }
        return column;
    }

    private switchAndBuildQuery() {
        if (!this.modeSQL) {
            return this.initEdaQuery();
        }
        return this.initSqlQuery();
    }

    /**
     * Reloads panels chart when runQuery() is called with globalFilters
     */
    private reloadContent() {
        const content = this.panel.content;
        const output = this.panel.content.query.output;
        this.verifyData();
        this.changeChartType(content.chart, content.edaChart, output.styles);
        this.chartForm.patchValue({
            chart: this.chartUtils.chartTypes.find(o => o.subValue === content.edaChart)
        });
    }

    /**
     * Triggers PanelChartComponent.ngOnChanges() 
     * @param query Query object.
     * @param chartLabels data labels.
     * @param chartData data values.
     * @param type chart type.
     * @param layout chart layout.
     */
    private renderChart(query: any, chartLabels: any[], chartData: any[], type: string, subType: string, config: ChartConfig) {
        const chartConfig = config || new ChartConfig(this.setVoidChartConfig(type));
        this.panelChartConfig = new PanelChart({
            query: query,
            data: { labels: chartLabels, values: chartData },
            chartType: type,
            config: chartConfig,
            edaChart: subType
        });

    }

    /**
     * Returns a configuration object for this type
     * @param type chart type
     */
    private setVoidChartConfig(type: string) {
        if (['table', 'crosstable'].includes(type)) {
            return new TableConfig(false, false, 10, false, false, false);
        }
        if (['bar', 'line', 'piechart', 'doughnut'].includes(type)) {
            return new ChartJsConfig(null, type);
        }
        else {
            return new KpiConfig('');
        }
    }

    /**
     * Updates chart configuration properties
     */
    public setChartProperties() {
        this.graficos = this.panelChart.getCurrentConfig();
    }

    /**
     * Check data and set notAllowed charts
     */
    private verifyData() {
        // Reset charts
        for (const chart of this.chartTypes) {
            chart.ngIf = false;
            chart.tooManyData = false;
        }
        if (!_.isEmpty(this.currentQuery)) {
            let notAllowedCharts = [];
            let tooManyDataForCharts = [];
            const dataDescription = this.chartUtils.describeData(this.currentQuery, this.chartLabels);

            if (dataDescription.totalColumns === 0 || _.isEmpty(this.chartData)) {
                this.alertService.addWarning('No se pudo obtener ningún registro');
            } else {
                notAllowedCharts = this.chartUtils.getNotAllowedCharts(dataDescription);
                tooManyDataForCharts = this.chartUtils.getTooManyDataForCharts(this.chartData.length);

            }

            /// if the chart is not allowed, it doesn't matters there is too many data.
            tooManyDataForCharts = tooManyDataForCharts.filter(x => !notAllowedCharts.includes(x));

            this.notAllowedCharts(notAllowedCharts);
            this.tooManyDataForCharts(tooManyDataForCharts);

        }
    }

    /**
     * sets chart state (allowed, not allowed)
     * @param charts not allowedCharts
     */
    private notAllowedCharts(notAllowedCharts: any[]) {
        for (const notAllowed of notAllowedCharts) {
            for (const chart of this.chartTypes) {
                if (notAllowed === chart.subValue) {
                    chart.ngIf = true;
                }
            }
        }
    }

    /**
     * sets chart state (allowed, not allowed) because there are too many data 
     * @param charts not allowedCharts
     */
    private tooManyDataForCharts(tooManyDataForCharts: any[]) {
        for (const myElem of tooManyDataForCharts) {
            for (const chart of this.chartTypes) {
                if (myElem === chart.value) {
                    chart.tooManyData = true;
                }
            }
        }
    }


    /**
     * Changes chart type 
     * @param type chart type
     * @param content panel content
     */
    public changeChartType(type: string, subType: string, config?: ChartConfig) {
        this.graficos = {};
        let allow = _.find(this.chartTypes, c => c.value === type);
        this.display_v.chart = type;
        this.graficos.chartType = type;
        this.graficos.edaChart = subType;
        if (!_.isEqual(this.display_v.chart, 'no_data') && !allow.ngIf && !allow.tooManyData) {
            this.panelChart.destroyComponent();
            const _config = config || new ChartConfig(this.setVoidChartConfig(type));
            this.renderChart(this.currentQuery, this.chartLabels, this.chartData, type, subType, _config);
        }
    }

    /**
     * @return current chart layout
     */
    public getChartStyles(chart: string) {
        if (this.panel.content && this.panel.content.chart === chart) {
            return new ChartConfig(this.panel.content.query.output.config);
        } else {
            return null;
        }
    }

    /**
     * 
     */
    public onTableInputKey(event: any) {
        this.loadTablesData();
        if (event.target.value) {
            this.tableToShow = this.tableToShow
                .filter(table => table.display_name.default.toLowerCase().includes(event.target.value.toLowerCase()));
        }

    }

    public onColumnInputKey(event: any) {
        if (!_.isNil(this.userSelectedTable)) {
            this.loadColumns(this.tableToShow.filter(table => table.table_name === this.userSelectedTable)[0]);
            if (event.target.value) {
                this.columns = this.columns
                    .filter(col => col.display_name.default.toLowerCase().includes(event.target.value.toLowerCase()));
            }
        }
    }

    /**
     * loads columns from table
     * @param table  
     */
    public loadColumns(table: any) {
        this.userSelectedTable = table.table_name;
        this.disableBtnSave();
        // Clean columns
        this.columns = [];

        // Reload avaliable columns -> f(table) = this.columns
        table.columns.forEach(c => {
            c.table_id = table.table_name;
            const matcher = _.find(this.currentQuery, (x) => c.table_id === x.table_id && c.column_name === x.column_name);
            if (!matcher) {
                this.columns.push(c);
            }
            this.columns = this.columns.filter(col => col.visible === true)
                .sort((a, b) => (a.display_name.default > b.display_name.default) ? 1 : ((b.display_name.default > a.display_name.default) ? -1 : 0));
        });

        if (!_.isEqual(this.inputs.findTable.ngModel, '')) {
            this.inputs.findTable.reset();
            this.loadTablesData();
        }
    }

    /**
     * recursive function to find all related tables to given table
     * @param tables all model's tables
     * @param table  origin table to start building the path
     * @param vMap   Map() to keep tracking visited nodes -> first call is just a new Map()
     */
    private findRelationsRecursive(tables: any, table: any, vMap: any) {
        vMap.set(table.table_name, table);
        table.relations.filter(r => r.visible !== false)
            .forEach(rel => {
                const newTable = tables.find(t => t.table_name === rel.target_table);
                if (!vMap.has(newTable.table_name)) {
                    this.findRelationsRecursive(tables, newTable, vMap);
                }
            });

        return vMap;
    }

    /**
     * Sets tables and tablesToShow 
     */
    public searchRelations(c: Column, event?: CdkDragDrop<string[]>) {
        // Check to drag & drop only to correct container
        if (!_.isNil(event) && event.container.id === event.previousContainer.id) {
            return;
        }

        const originTable = this.tables.filter(t => t.table_name === c.table_id)[0];              // Selected table
        const allTables = JSON.parse(JSON.stringify(this.inject.dataSource.model.tables));        // All tables are needed (hidden too);
        const tablesMap = this.findRelationsRecursive(allTables, originTable, new Map());         // Map with all related tables
        this.tableToShow = Array.from(tablesMap.values());
        this.tableToShow = this.tableToShow
            .filter(table => table.visible === true)
            .sort((a, b) => (a.display_name.default > b.display_name.default) ? 1 : ((b.display_name.default > a.display_name.default) ? -1 : 0));
    }

    /**
     * Removes given column from content
     * @param c column to remove
     * @param list where collumn is present (select, filters)
     */
    public removeColumn(c: Column, list?: string) {
        this.disableBtnSave();
        // Busca de l'array index, la columna a borrar i ho fa
        if (list === 'select') {
            const match = _.findIndex(this.currentQuery, { column_name: c.column_name, table_id: c.table_id });
            // Reseting all configs of column removed
            this.currentQuery[match].ordenation_type = 'No';
            this.currentQuery[match].aggregation_type.forEach(ag => ag.selected = false);
            this.currentQuery.splice(match, 1);
        } else if (list === 'filter') {
            const match = _.findIndex(this.filtredColumns, { column_name: c.column_name, table_id: c.table_id });
            this.filtredColumns.splice(match, 1);
        }

        // Carregar de nou l'array Columns amb la columna borrada
        this.loadColumns(_.find(this.tables, (t) => t.table_name === c.table_id));

        // Buscar relacións per tornar a mostrar totes les taules
        if (this.currentQuery.length === 0) {
            this.tableToShow = this.tables;
        } else {
            _.map(this.currentQuery, selected => selected.table_id === c.table_id);
        }

        const filters = this.selectedFilters.filter(f => f.filter_column === c.column_name);
        filters.forEach(f => this.selectedFilters = this.selectedFilters.filter(ff => ff.filter_id !== f.filter_id));
    }

    /**
     * moves given column to [select or filters] in config panel
     * @param c column to move
     */
    public moveItem(c: Column) {
        this.disableBtnSave();
        // Busca index en l'array de columnes
        const match = _.findIndex(this.columns, { column_name: c.column_name, table_id: c.table_id });
        this.columns.splice(match, 1);  // Elimina aquella columna de l'array
        this.currentQuery.push(c);      // Col·loca la nova columna a l'array Select
        this.searchRelations(c);        // Busca les relacions de la nova columna afegida
        this.handleAggregationType(c);  // Comprovacio d'agregacions
        this.handleOrdTypes(c);         // Comprovacio ordenacio

        if (!_.isEqual(this.inputs.findColumn.ngModel, '')) {
            this.inputs.findColumn.reset();
            this.loadColumns(this.tableToShow.filter(table => table.table_name === this.userSelectedTable)[0]);
        }
    }

    /**
     * Move column with drag and drop
     * @param event 
     */
    public drop(event: CdkDragDrop<string[]>) {
        if (event.previousContainer === event.container) {
            moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
        } else {
            transferArrayItem(event.previousContainer.data,
                event.container.data,
                event.previousIndex,
                event.currentIndex);
        }
    }

    /* Condicions Drag&Drop */
    public isAllowed = (drag?: CdkDrag, drop?) => false;

    /**
     * Opens columnDialog
     * @param column 
     * @param isFilter is filter column or normal column
     */
    public openColumnDialog(column: Column, isFilter?: boolean): void {
        this.disableBtnSave();
        const p = {
            selectedColumn: column,
            currentQuery: this.currentQuery,
            inject: this.inject,
            panel: this.panel,
            table: this.findTable(column.table_id),
            filters: this.selectedFilters
        };

        if (!isFilter) {
            this.configController = new EdaDialogController({
                params: p,
                close: (event, response) => {
                    if (response.length > 0) {
                        response.forEach(f => {
                            if (_.isNil(this.selectedFilters.find(o => o.filter_id === f.filter_id))) {
                                this.selectedFilters.push(f);
                            }
                            if (f.removed) {
                                this.selectedFilters = _.filter(this.selectedFilters, o => o.filter_id !== f.filter_id);
                            }
                        });
                    }
                    this.configController = undefined;
                }
            });
        } else {
            this.filterController = new EdaDialogController({
                params: p,
                close: (event, response) => {
                    if (response.length > 0) {
                        response.forEach(f => {
                            if (_.isNil(this.selectedFilters.find(o => o.filter_id === f.filter_id))) {
                                this.selectedFilters.push(f);
                            }
                            if (f.removed) {
                                this.selectedFilters = _.filter(this.selectedFilters, o => o.filter_id !== f.filter_id);
                            }
                        });
                    }
                    this.filterController = undefined;
                }
            });
        }
    }

    /**
     * find table by name
     * @param t table name
     */
    private findTable(t: string): string {
        return this.tables.find(table => table.table_name === t).display_name.default;
    }

    /**
     * set aggregation types
     * @param column 
     */
    public handleAggregationType(column: Column): void {
        const voidPanel = this.panel.content === undefined;
        const tmpAggTypes = [];
        const colName = column.column_name;
        const initializeAgregations = (column, tmpAggTypes) => {
            column.aggregation_type.forEach((agg) => {
                tmpAggTypes.push({ display_name: agg.display_name, value: agg.value, selected: agg.value === 'none' });
            });
        }
        if (!voidPanel) {
            const colInCurrentQuery = this.currentQuery.find(c => c.column_name === colName).aggregation_type.find(agg => agg.selected === true);
            const queryFromServer = this.panel.content.query.query.fields;
            // Column is in currentQuery
            if (colInCurrentQuery) {
                column.aggregation_type.forEach(agg => tmpAggTypes.push(agg));
                this.aggregationsTypes = tmpAggTypes;
                //Column isn't in currentQuery
            } else {
                const columnInServer = queryFromServer.filter(c => c.column_name === colName && c.table_id === column.table_id)[0];
                // Column is in server's query
                if (columnInServer) {
                    const aggregation = columnInServer.aggregation_type;
                    column.aggregation_type.forEach(agg => {
                        tmpAggTypes.push(agg.value === aggregation ? { display_name: agg.display_name, value: agg.value, selected: true }
                            : { display_name: agg.display_name, value: agg.value, selected: false });
                    });
                    //Column is not in server's query
                } else initializeAgregations(column, tmpAggTypes);
                this.aggregationsTypes = tmpAggTypes;
            }
            // New panel
        } else {
            initializeAgregations(column, tmpAggTypes);
            this.aggregationsTypes = tmpAggTypes;
        }
        this.currentQuery.find(c => {
            return colName === c.column_name && column.table_id === c.table_id
        }).aggregation_type = _.cloneDeep(this.aggregationsTypes);
    }

    /**
     * Set order types
     * @param column 
     */
    private handleOrdTypes(column: Column): void {
        let addOrd: Column;
        const voidPanel = this.panel.content === undefined;
        if (!voidPanel) {
            const queryFromServer = this.panel.content.query.query.fields;
            const colInCurrentQuery = this.currentQuery.find(c => c.column_name === column.column_name).ordenation_type;

            if (colInCurrentQuery) {
                this.ordenationTypes.forEach(o => {
                    o.value !== column.ordenation_type ? o.selected = false : o.selected = true;
                });

                addOrd = this.currentQuery.find(c => column.column_name === c.column_name && column.table_id === c.table_id);
                addOrd.ordenation_type = column.ordenation_type;
                return;
            }
            if (!column.ordenation_type) {
                column.ordenation_type = 'No';
            }

            const colInServer = queryFromServer.filter(c => c.column_name === column.column_name && c.table_id === column.table_id)[0];
            let ordenation = colInServer ? colInServer.ordenation_type : column.ordenation_type;
            const d = this.ordenationTypes.find(ag => ag.selected === true && ordenation !== ag.value);
            const ord = this.ordenationTypes.find(o => o.value === ordenation);

            if (!_.isNil(d)) {
                d.selected = false;
            }
            if (!_.isNil(ord)) {
                ord.selected = true;
            }

        } else if (!column.ordenation_type) {
            this.ordenationTypes = [
                { display_name: 'ASC', value: 'Asc', selected: false },
                { display_name: 'DESC', value: 'Desc', selected: false },
                { display_name: 'NO', value: 'No', selected: true }
            ];

        } else {
            this.ordenationTypes.forEach(ord => {
                ord.value !== column.ordenation_type ? ord.selected = false : ord.selected = true;
            });
        }

        const colIncurrentQuery = this.currentQuery.find(c => column.column_name === c.column_name && column.table_id === c.table_id);
        try {
            colIncurrentQuery.ordenation_type = this.ordenationTypes.filter(ord => ord.selected === true)[0].value;
        } catch (e) {
            colIncurrentQuery.ordenation_type = 'No';
        }
    }

    /**
     * set local and global filters
     * @param column 
     */
    private handleFilters(content: any): void {
        this.selectedFilters = _.cloneDeep(content.filters);
        this.globalFilters = content.filters.filter(f => f.isGlobal === true);
        this.selectedFilters.forEach(filter => { filter.removed = false; });
        this.selectedFilters = this.selectedFilters.filter(f => f.isGlobal === false);
    }

    private handleFilterColumns(filterList: Array<any>, query: Array<any>): void {

        filterList.forEach(filter => {
            const table = this.tables.filter(table => table.table_name === filter.filter_table)[0];
            const column = table.columns.filter(column => column.column_name === filter.filter_column)[0];
            const columnInQuery = query.filter(col => col.column_name === filter.filter_column).length > 0;
            if (!filter.isGlobal && !columnInQuery) {
                this.filtredColumns.push(column);
            }
        })
    }

    /**
     *  WTF
     */
    private handleCurrentQuery(): void {
        if (this.panel.content) {
            const fields = this.panel.content.query.query.fields;
            for (let i = 0, n = fields.length; i < n; i++) {
                this.currentQuery[i].format = fields[i].format;
            }
        }
    }
    /**
     * Sets global filter (called from dashboardComponent)
     * @param filter filter so set
     */
    public setGlobalFilter(filter) {
        if (filter.filter_elements[0].value1.length === 0) {
            let filters = this.globalFilters;
            this.globalFilters = filters.filter(f => f.filter_id !== filter.filter_id);
        } else {
            let filters = this.globalFilters;
            this.globalFilters = filters.filter(f => f.filter_id !== filter.filter_id)
            this.globalFilters.push(filter)
        }
    }

    /* Funcions generals de la pagina */
    private disableBtnSave = () => this.display_v.btnSave = true;

    private ableBtnSave = () => this.display_v.btnSave = false;

    private readyToExport(fileType: string): void {
        if (!this.panel.content) {
            return this.alertService.addError(`No tienes contenido para exportar`);
        }
        const cols = this.chartUtils.transformDataQueryForTable(this.chartLabels, this.chartData);
        const headers = this.currentQuery.map(o => o.display_name.default);

        if (_.isEqual(fileType, 'excel')) {
            this.fileUtiles.exportToExcel(headers, cols, this.panel.title);
        }

        this.contextMenu.hideContextMenu();
    }

    private openEditarConsulta(): void {
        this.display_v.page_dialog = true;
        this.ableBtnSave();
        this.verifyData();
    }

    /**
     * Reset state when panel edition is cancelled
     */
    public closeEditarConsulta(): void {
        // Reset all the variables
        this.display_v.saved_panel = false;
        this.columns = [];
        this.currentQuery = [];
        if (this.panelDeepCopy.query) {
            this.panelDeepCopy.query.query.filters = this.mergeFilters(this.panelDeepCopy.query.query.filters, this.globalFilters)
            this.filtredColumns = [];
            //Reassing sqlQuery -if exists
            this.currentSQLQuery = this.panelDeepCopy.query.query.SQLexpression;
            this.modeSQL = this.panelDeepCopy.query.query.modeSQL;
        }
        
        this.loadChartsData(this.panelDeepCopy);
        this.userSelectedTable = undefined;
        this.tableToShow = this.tables;
        this.display_v.chart = '';
        // this.index = this.modeSQL ? 1 : 0;
        this.display_v.page_dialog = false;
    }

    /**
     * Set new chart properties when editionChartPanel is closed
     * @param event 
     * @param properties properties to set
     */
    private onCloseChartProperties(event, properties): void {
        if (!_.isEqual(event, EdaDialogCloseEvent.NONE)) {
            if (properties) {
                this.graficos = {};
                this.graficos = _.cloneDeep(properties);
                this.panel.content.query.output.config = { colors: this.graficos.chartColors, chartType: this.graficos.chartType };
                const layout = new ChartConfig(new ChartJsConfig(this.graficos.chartColors, this.graficos.chartType))
                this.renderChart(this.currentQuery, this.chartLabels, this.chartData, this.graficos.chartType, this.graficos.edaChart, layout);
            }
            //not saved alert message
            this.dashboardService._notSaved.next(true);
        }
        this.chartController = undefined;
    }

    private onCloseTableProperties(event, properties: TableConfig): void {
        if (!_.isEqual(event, EdaDialogCloseEvent.NONE)) {
            if (properties) {

                this.panel.content.query.output.config = properties;
                const config = new ChartConfig(properties)
                this.renderChart(this.currentQuery, this.chartLabels, this.chartData, this.graficos.chartType, this.graficos.edaChart, config);
            }
            //not saved alert message
            this.dashboardService._notSaved.next(true);
        }
        this.tableController = undefined;
    }

    public handleTabChange(event: any): void {
        this.index = event.index;
    }

    public onResize(event) {
        this.display_v.responsive = event.currentTarget.innerWidth <= 1440;
    }

    public removePanel(): void {
        this.remove.emit(this.panel.id);
    }

    public showDescription(event): void {
        this.description = event.description.default;
    }

    public changeQueryMode() : void{   
        this.display_v.btnSave = true; 
        this.currentSQLQuery = '';
        this.currentQuery = [];
    }

    private debugLog(where: string): void {
        console.log(`%c ${where}`, 'color:green; font-weight:bold')
        const panel = this.panel;
        console.log({ panel });
    }

    public getOptionDescription(value: string): string {
        let description = 'Los datos seleccionados no permiten utilizar este gráfico.';

        switch (value) {
            case 'kpi':
                description += '\n Un KPI necesita un único número';
                break;
            case 'barline':
                description += '\n Un grafico combinado necesita una categoría y dos séries numéricas';
                break;
            case 'stackedbar':
                description += '\n Un grafico combinado necesita una categoría y dos séries numéricas';
                break;
            case 'line':
                description += '\n Un grafico de línea necesita una o más categorías y una série numérica';
                break;
            case 'horizontalBar':
                description += '\n Un grafico de barras necesita una o más categorías y una série numérica';
                break;
            case 'bar':
                description += '\n Un grafico de barras necesita una o más categorías y una série numérica';
                break;
            case 'polarArea':
                description += '\n Un grafico polar necesita una categoría y una série numérica';
                break;
            case 'doughnut':
                description += '\n Un grafico de pastel necesita una categoría y una série numérica';
                break;
            case 'crosstable':
                description = 'Los datos seleccionados no permiten utilizar esta visualización. \n Una tabla cruzada necesita dos o más categorías y una série numérica';
                break;
            default:
                description = 'Los datos seleccionados no permiten utilizar este gráfico';
                break;
        }

        return description;
    }

    public getOptionIcon(value: string): string {
        let description = '';

        switch (value) {
            case 'table':
                description = 'table_chart';
                break
            case 'crosstable':
                description = 'grid_on';
                break
            case 'kpi':
                description = 'attach_money';
                break
            case 'barline':
                description = 'multiline_chart';
                break
            case 'line':
                description = 'timeline';
                break
            case 'horizontalBar':
                description = 'notes';
                break
            case 'bar':
                description = 'bar_chart';
                break
            case 'polarArea':
                description = 'scatter_plot';
                break
            case 'doughnut':
                description = 'pie_chart';
                break
        }

        return description;
    }

    public chartType(type: string): number {
        if (['table', 'crosstable'].includes(type)) {
            return 0;
        }
        if (['bar', 'line', 'piechart'].includes(type)) {
            return 1;
        }
        if (type === 'kpi') {
            return 3;
        }
        return -1;
    }

    public getTooManyDataDescription(): string {
        return 'Hay demasiados valores para este gráfico. Agrega o filtra los datos para poder visualizarlos mejor';
    }
}