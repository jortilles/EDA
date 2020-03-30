
import { PanelChartComponent } from './panel-charts/panel-chart.component';
import { Component, Input, OnInit, ViewChild, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CdkDragDrop, moveItemInArray, transferArrayItem, CdkDrag } from '@angular/cdk/drag-drop';
import { Column, Query, EdaPanel, InjectEdaPanel } from '@eda/models/model.index';
import {
    DashboardService,
    ChartUtilsService,
    AlertService,
    SpinnerService,
    FileUtiles,
    EdaChartType,
    FilterType, QueryBuilderService, OrdenationType
} from '@eda/services/service.index';
import {
    EdaPageDialogComponent,
    EdaDialogController,
    EdaContextMenu,
    EdaContextMenuItem, EdaDialogCloseEvent
} from '@eda/shared/components/shared-components.index';
import {
    EdaChartComponent
} from '@eda/components/component.index';
import * as _ from 'lodash';
import { PanelChart } from './panel-charts/panel-chart';

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
    public contextMenu: EdaContextMenu;

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
        disablePreview : true,
        disableQueryInfo:true
    };

    public index: number = 0;
    public description: string;
    public chartForm: FormGroup;
    public userSelectedTable: string;

    /** Query Variables */
    public tables: any[] = [];
    public tableToShow: any[] = [];
    public columns: any[] = [];
    public currentQuery: any[] = [];
    public aggregationsTypes: any[] = [];
    public filtredColumns: Column[] = [];
    public ordenationTypes: OrdenationType[];

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

    constructor(private dashboardService: DashboardService,
        private chartUtils: ChartUtilsService,
        private queryBuilder: QueryBuilderService,
        private fileUtiles: FileUtiles,
        private formBuilder: FormBuilder,
        private alertService: AlertService,
        private spinnerService: SpinnerService) {

        this.initializeBlankPanelUtils();
    }

    ngOnInit(): void {
        this.loadTablesData();
        if (this.panel.content) {
            this.loadChartsData(this.panel.content);
        }
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
                        }else{
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
                            if (['line', 'doughnut', 'bar', 'horizontalBar'].includes(this.graficos.chartType)) {
                                this.contextMenu.hideContextMenu();
                                this.chartController = new EdaDialogController({
                                    params: { panelId: _.get(this.panel, 'id'), chart: this.graficos },
                                    close: (event, response) => this.onCloseChartProperties(event, response)
                                });
                            }
                        }
                    }
                }),
                new EdaContextMenuItem({
                    label: 'Exportar Excel',
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

    /**
     * Builds a query object
     */
    private initObjectQuery(): Query {
        let tableRows;
        if (this.panelChart.componentRef && ['table', 'crosstable'].includes(this.panelChart.config.chartType)) {
            tableRows = this.panelChart.componentRef.instance.inject.rows;
        }
        const params = {
            table: '',
            dataSource: this.inject.dataSource._id,
            panel: this.panel.id,
            dashboard: this.inject.dashboard_id,
            filters: this.mergeFilters(this.selectedFilters, this.globalFilters),
            layout: { styles: this.graficos.chartColors, tableConfig: tableRows, chartType: this.graficos.chartType }
        };
        return this.queryBuilder.normalQuery(this.currentQuery, params);
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
                .sort((a, b) => { return (a.table_name > b.table_name) ? 1 : ((b.table_name > a.table_name) ? -1 : 0) }));

            // All visible tables
            this.tableToShow = _.cloneDeep(this.inject.dataSource.model.tables.filter(table => table.visible === true)
                .sort((a, b) => {
                    return (a.table_name > b.table_name) ? 1 : ((b.table_name > a.table_name) ? -1 : 0)
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
                    return (a.table_name > b.table_name) ? 1 : ((b.table_name > a.table_name) ? -1 : 0)
                }));
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
            .sort((a, b) => (a.table_name > b.table_name) ? 1 : ((b.table_name > a.table_name) ? -1 : 0));
    }

    /**
     * Runs a query and sets global config for this panel
     * @param panelContent panel content to build query .
     */
    async loadChartsData(panelContent: any) {
        if (this.panel.content) {
            this.display_v.minispinner = true;
            try {
                const response = await this.dashboardService.executeQuery(panelContent.query).toPromise();
                this.chartLabels = response[0];
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
        panelContent.query.query.fields.forEach(element => {
            this.loadColumns(this.tables.find(t => t.table_name === element.table_id));
            this.moveItem(this.columns.find(c => c.column_name === element.column_name));
            this.handleFilters(this.columns.find(c => c.column_name === element.column_name));
        });
        this.chartForm.patchValue({
            chart: this.chartUtils.chartTypes.find(o => o.value === panelContent.chart)
        });

        this.handleCurrentQuery();
        this.verifyData();
        this.changeChartType(panelContent.chart, panelContent.query.output.styles);

        this.display_v.saved_panel = true;
        this.display_v.minispinner = false;
    }
    /**
     * Updates panel content with actual state
     */
    public savePanel() {
        this.panel.title = this.pdialog.getTitle();
        if (!_.isEmpty(this.graficos)) {
            this.display_v.saved_panel = true;
            const query = this.initObjectQuery();
            const chart = this.chartForm.value.chart.value ? this.chartForm.value.chart.value : this.chartForm.value.chart;
            this.panel.content = { query, chart };
        } else {
            this.display_v.saved_panel = false;
        }
        this.display_v.page_dialog = false;
    }

    /**
     * Runs a query and sets panel chart
     * @param globalFilters Global filters to apply to query.
     */
    async runQuery(globalFilters: boolean) {
        this.display_v.disablePreview = false;
        if (!globalFilters) {
            this.spinnerService.on();
        } else {
            this.display_v.minispinner = true;
        }
        try {
            this.panelChart.destroyComponent();
            // Execute query
            const response = await this.dashboardService.executeQuery(this.initObjectQuery()).toPromise();
            this.chartLabels = response[0];     // Chart data
            this.chartData = response[1];       // Chart data
            this.ableBtnSave();                 // Button save

            /* Labels i Data - Arrays */
            if (!globalFilters) {
                this.verifyData();
                this.changeChartType('table')
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

    /**
     * Reloads panels chart when runQuery() is called with globalFilters
     */
    private reloadContent() {
        const content = this.panel.content;
        const output = this.panel.content.query.output;
        this.verifyData();
        this.changeChartType(content.chart, output.styles);
        this.chartForm.patchValue({
            chart: this.chartUtils.chartTypes.find(o => o.value === content.chart)
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
    private renderChart(query: any, chartLabels: any[], chartData: any[], type: string, layout: any) {
        this.panelChartConfig = new PanelChart({
            query: query,
            data: { labels: chartLabels, values: chartData },
            chartType: type,
            layout: layout
        });
    }

    /**
     * Updates chart configuration properties
     */
    setChartProperties() {
        this.graficos = this.panelChart.getCurrentConfig();
    }

   /**
    * Check data and set notAllowed charts
    */
    private verifyData() {
        // Reset charts
        for (const chart of this.chartTypes) {
            chart.ngIf = false;
        }
        if (!_.isEmpty(this.currentQuery)) {
            let notAllowedCharts = [];
            const dataDescription = this.chartUtils.describeData(this.currentQuery, this.chartLabels);

            if (dataDescription.totalColumns === 0 || _.isEmpty(this.chartData)) {
                this.alertService.addWarning('No se pudo obtener ningún registro');
            } else {
                notAllowedCharts = this.chartUtils.getNotAllowedCharts(dataDescription);
            }
            this.notAllowedCharts(notAllowedCharts);
        }
    }

   /**
    * sets chart state (allowed, not allowed)
    * @param charts not allowedCharts
    */
    private notAllowedCharts(notAllowedCharts: any[]) {
        for (const notAllowed of notAllowedCharts) {
            for (const chart of this.chartTypes) {
                if (notAllowed === chart.value) {
                    chart.ngIf = true;
                }
            }
        }
    }

    /**
     * Changes chart type 
     * @param type chart type
     * @param content panel content
     */
    public changeChartType(type: string, content?: any) {
        this.graficos = {};
        let allow = _.find(this.chartTypes, c => c.value === type);
        this.display_v.chart = type;
        this.graficos.chartType = type;
        if (!_.isEqual(this.display_v.chart, 'no_data') && !allow.ngIf) {
            this.panelChart.destroyComponent();
            this.renderChart(this.currentQuery, this.chartLabels, this.chartData, type, content);
            //this.panelChart.changeChartType();
        }
    }

    /**
     * @return current chart layout
     */
    public getChartStyles() {
        if (this.panel.content) {
            return this.panel.content.query.output;
        } else {
            return;
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
                .sort((a, b) => (a.column_name > b.column_name) ? 1 : ((b.column_name > a.column_name) ? -1 : 0));
        });
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
            .sort((a, b) => (a.table_name > b.table_name) ? 1 : ((b.table_name > a.table_name) ? -1 : 0));
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
    handleAggregationType(column: Column): void {
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
            // console.log('Bug en la ordenacio. Això cal revisar-ho.  eda-blank-panel-component.ts linea 750');
            // console.log(this.ordenationTypes);
        }
    }

    /**
     * set local and global filters
     * @param column 
     */
    private handleFilters(column: Column): void {
        if (this.panel.content && !this.selectedFilters.length) {
            this.selectedFilters = _.cloneDeep(this.panel.content.query.query.filters);
            this.globalFilters = this.panel.content.query.query.filters.filter(f => f.isGlobal === true);
        }
        this.selectedFilters.forEach(filter => {
            filter.removed = false;
        });
        this.selectedFilters = this.selectedFilters.filter(f => f.isGlobal === false);
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
            let filters = this.globalFilters
            this.globalFilters = filters.filter(f => f.filter_id !== filter.filter_id);
        } else {
            let filters = this.globalFilters
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
        }
        this.loadChartsData(this.panelDeepCopy);
        this.userSelectedTable = undefined;
        this.tableToShow = this.tables;
        this.display_v.chart = '';
        this.index = 0;
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
                this.panel.content.query.output.styles.styles = this.graficos.chartColors;
                const layout = { styles: this.graficos.chartColors, tableConfig: 10, chartType: this.graficos.chartType };
                this.renderChart(this.currentQuery, this.chartLabels, this.chartData, this.graficos.chartType, layout);
            }
        }
        this.chartController = undefined;
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

    private debugLog(where: string): void {
        console.log(`%c ${where}`, 'color:green; font-weight:bold')
        const panel = this.panel;
        console.log({ panel });
    }
}