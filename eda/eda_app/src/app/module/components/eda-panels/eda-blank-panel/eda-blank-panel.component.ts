import { Component, Input, OnInit, ViewChild, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CdkDragDrop, moveItemInArray, transferArrayItem, CdkDrag } from '@angular/cdk/drag-drop';
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
import { Column, Query, EdaPanel, InjectEdaPanel } from '@eda/models/model.index';
import {
    EdaColumnText,
    EdaColumnNumber,
    EdaColumnDate,
    EdaTable,
    EdaChartComponent
} from '@eda/components/component.index';
import * as _ from 'lodash';

@Component({
    selector: 'eda-blank-panel',
    templateUrl: './eda-blank-panel.component.html',
    styleUrls: []
})
export class EdaBlankPanelComponent implements OnInit {
    @ViewChild('pdialog', { static: false }) pdialog: EdaPageDialogComponent;
    @ViewChild('edaChart', { static: false }) edaChart: EdaChartComponent;
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
    public labeling: any[] = []; // Number of string eda-columns in the results of the query
    public table: EdaTable = new EdaTable({}); // EdaTable
    public crosstable: EdaTable = new EdaTable({});
    public selectedFilters: any[] = [];
    public filterValue: any = {};

    public color: any = { r: 255, g: 0, b: 0.3 };

    public panelDeepCopy: any = {};
    public colorsDeepCopy: any = {};

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
            this.loadChartsData(this.panelDeepCopy);
        }


        this.debugLog('onInit');
       
    }

    loadTablesData(): void {
        // Check for 'applyToAll' Filters
        if (this.inject.applyToAllfilter.present === true) {
            this.tablesData();
            this.tableToShow = this.tables;
        } else {
            /* Copy Table Values */
            // All tables
            this.tables = JSON.parse(JSON.stringify(
                this.inject.dataSource.model.tables
                    .filter(table => table.visible === true)
                    .sort((a, b) => {
                        return (a.table_name > b.table_name) ? 1 : ((b.table_name > a.table_name) ? -1 : 0);
                    })
            ));

            // All visible tables
            this.tableToShow = JSON.parse(JSON.stringify(
                this.inject.dataSource.model.tables
                    .filter(table => table.visible === true)
                    .sort((a, b) => {
                        return (a.table_name > b.table_name) ? 1 : ((b.table_name > a.table_name) ? -1 : 0);
                    })
            ));
        }
    }

    reloadTablesData() {
        if (this.inject.applyToAllfilter.present === true) {
            this.tablesData();
        } else {
            this.tables = JSON.parse(JSON.stringify(
                this.inject.dataSource.model.tables
                    .filter(table => table.visible === true)
                    .sort((a, b) => {
                        return (a.table_name > b.table_name) ? 1 : ((b.table_name > a.table_name) ? -1 : 0);
                    })
            ));
        }
    }

    tablesData() {
        const allTables = JSON.parse(JSON.stringify(this.inject.dataSource.model.tables));
        const originTable = allTables.filter(t => t.table_name === this.inject.applyToAllfilter.refferenceTable)[0];  // selected table
        const tablesMap = this.findRelationsRecursive(allTables, originTable, new Map());
        this.tables = Array.from(tablesMap.values());
        this.tables = this.tables
            .filter(table => table.visible === true)
            .sort((a, b) => (a.table_name > b.table_name) ? 1 : ((b.table_name > a.table_name) ? -1 : 0));
    }

    /* Quan es carrega un dashboard carrega els grafics dels seus panells
    si cancelem l'edició es carrega en l'estat previ a l'edició */
    loadChartsData(cancelEdit?: any): void {
        if (this.panel.content) {
            if (Object.entries(this.panelDeepCopy).length !== 0) {
                this.selectedFilters.forEach(filter => {
                    this.panelDeepCopy.query.query.filters.push(filter);
                });
            }
            const content = Object.entries(cancelEdit).length !== 0 ? cancelEdit : this.panel.content;
            this.display_v.minispinner = true;
            this.dashboardService.executeQuery(content.query).subscribe(
                response => {
                    content.query.query.fields.forEach(element => {
                        this.loadColumns(this.tables.find(t => t.table_name === element.table_id));
                        this.moveItem(this.columns.find(c => c.column_name === element.column_name));
                        this.handleFilters(this.columns.find(c => c.column_name === element.column_name));
                    });

                    this.handleCurrentQuery();

                    this.chartLabels = response[0];
                    this.chartData = response[1];

                    this.chartForm.patchValue({
                        chart: this.chartUtils.chartTypes.find(o => o.value === content.chart)
                    });

                    if (_.startsWith(content.chart, 'table')) {
                        this.initializeTable();
                    }

                    this.verifyData();
                    let cancelQuery = Object.entries(cancelEdit).length !== 0;
                    if (!cancelQuery) {
                        this.changeChartType(content.chart, content.query.output.styles);
                    } else {
                        this.recoverChartProperties(content.chart);
                    }
                    this.display_v.saved_panel = true;
                    this.display_v.minispinner = false;
                }, err => {
                    this.alertService.addError(err);
                    this.display_v.minispinner = false;
                }

            );
        }
    }

    /* Saving the content from a selected Panel */
    savePanel() {
        this.panel.title = this.pdialog.getTitle();

        // Si hi ha contingut l'inicialitzem, sino mostrem en blanc
        if (!_.isEmpty(this.graficos) || !_.isEmpty(this.table.value) || !_.isEmpty(this.crosstable.value)) {
            this.display_v.saved_panel = true;
            const query = this.initObjectQuery();
            const chart = this.chartForm.value.chart.value ? this.chartForm.value.chart.value : this.chartForm.value.chart;
            this.panel.content = { query, chart };
        } else {
            this.display_v.saved_panel = false;
        }

        this.display_v.page_dialog = false;
    }

    /**** Funcions d'execucio de la query ****/
    /* Executing Query to API */
    async runQuery(globalFilters: boolean) {
        if (!globalFilters) {
            this.spinnerService.on();
        } else {
            this.display_v.minispinner = true;
        }

        try {
            // Execute query
            const response = await this.dashboardService.executeQuery(this.initObjectQuery()).toPromise();
            this.chartLabels = response[0]; // Chart data
            this.chartData = response[1]; // Chart data

            this.ableBtnSave(); // Button save

            /* Labels i Data - Arrays */
            if (!globalFilters) {
                this.initializeTable();
                // Introduim els valors a la taula
                this.table.value = this.chartUtils.transformDataQueryForTable(this.chartLabels, this.chartData);
                this.display_v.chart = 'table';

                this.verifyData();
                this.spinnerService.off();
            } else {
                this.initDialogConfigView();
                this.display_v.minispinner = false;
            }

            this.index = 1;
            this.display_v.saved_panel = true;
        } catch(err) {
            this.alertService.addError(err);
            this.spinnerService.off();
        }
    }

    initDialogConfigView() {
        const content = this.panel.content;
        const styles = this.panel.content.query.output.styles;

        if (content.chart === 'table') {
            this.initializeTable();
        }

        this.verifyData();
        this.changeChartType(content.chart, styles);

        this.chartForm.patchValue({
            chart: this.chartUtils.chartTypes.find(o => o.value === content.chart)
        });
    }

    // Inicalitzar la query
    initObjectQuery(): Query {
        const params = {
            table: '',
            dataSource: this.inject.dataSource._id,
            panel: this.panel.id,
            dashboard: this.inject.dashboard_id,
            filters: this.selectedFilters,
            styles: this.graficos.chartColors
        };
        return this.queryBuilder.normalQuery(this.currentQuery, params);
    }

    // Inicialitzar la taula on es pintaran els registres
    initializeTable(): void {
        const tableColumns = [];

        this.chartForm.patchValue({
            chart: { label: 'Table', value: 'table', icon: 'pi pi-exclamation-triangle', ngIf: false }
        });

        this.currentQuery.forEach((r: Column) => {
            if (_.isEqual(r.column_type, 'date')) {
                tableColumns.push(new EdaColumnDate({header: r.display_name.default, field: r.column_name}));
            } else if (_.isEqual(r.column_type, 'numeric')) {
                tableColumns.push(new EdaColumnNumber({header: r.display_name.default, field: r.column_name}))
            } else if (_.isEqual(r.column_type, 'varchar')) {
                tableColumns.push(new EdaColumnText({ header: r.display_name.default, field: r.column_name }));
            }  else if (_.isEqual(r.column_type, 'text')) {
                tableColumns.push(new EdaColumnText({ header: r.display_name.default, field: r.column_name }));
            }
        });

        this.table = new EdaTable({ alertService: this.alertService, cols: tableColumns });
    }

    initCrossTable() {
        this.chartForm.patchValue({
            chart: { label: 'CrossTable', value: 'crosstable', icon: 'pi pi-exclamation-triangle', ngIf: false }
        });
        const tableColumns = [];
        this.currentQuery.forEach(r => {
            tableColumns.push(new EdaColumnText({ header: r.display_name.default, field: r.column_name }));
        });

        this.crosstable = new EdaTable({ alertService: this.alertService, cols: tableColumns, pivot: true });

    }

    /**** Funcions dels Grafics ****/
    // Verifica segons les dades rebudes quin tipus de grafic es pot fer i quin no
    // És realitza la comprovació sempre què s'executi una consulta a la bd
    verifyData() {
        // Reset charts
        for (const chart of this.chartTypes) {
            chart.ngIf = false;
        }
        
        if (!_.isEmpty(this.currentQuery)) {
            let colTypes = [];
            let notAllowed = ['table', 'crosstable', 'kpi', 'doughnut', 'line', 'bar'];
            
            this.labeling = [];
            this.currentQuery.forEach((col, i) => {
                if (col.column_type === 'numeric') colTypes.push(1);
                else {
                    colTypes.push(0);
                    this.labeling.push(this.chartLabels[i]);
                }
            });

            if (colTypes.length === 0 || _.isEmpty(this.chartData)) {
                this.alertService.addWarning('No se pudo obtener ningún registro');
                this.display_v.chart = 'no_data';
            } else {
                // Table
                notAllowed.splice(notAllowed.indexOf('table'), 1);
                // KPI
                if (colTypes.length === 1 && colTypes[0] === 1) {
                    notAllowed.splice(notAllowed.indexOf('kpi'), 1);
                }
                // Pie
                if (colTypes.length > 1 && colTypes.reduce((p, c) => p + c) > 0 && colTypes.reduce((p, c) => p + c) < 2 && colTypes.length < 3) {
                    notAllowed.splice(notAllowed.indexOf('doughnut'), 1);
                }
                // Bar && Line
                if (colTypes.length > 1 && colTypes.reduce((p, c) => p + c) > 0 && colTypes.reduce((p, c) => p + c) < 2 && colTypes.length < 4) {
                    notAllowed.splice(notAllowed.indexOf('bar'), 1);
                    notAllowed.splice(notAllowed.indexOf('line'), 1);
                }
                // Crosstable
                if (colTypes.length === 3 && colTypes[2] === 1) {
                    notAllowed.splice(notAllowed.indexOf('crosstable'), 1);
                }
            }
            this.notAllowedCharts(notAllowed);
        }
    }

    // Restricció dels charts
    notAllowedCharts(charts: any[]) {
        for (const notAllowed of charts) {
            for (const chart of this.chartTypes) {
                if (notAllowed === chart.value) {
                    chart.ngIf = true;
                }
            }
        }
    }

    // Agafa el event onChange i realitza el cambi d'un chart a l'altre
    changeChartType(type: string, styles?: any[]) {
        let prevChartType = this.graficos.chartType;
        this.graficos = {};
        // Comprovara que el gràfic que es seleccioni es pugui crear o no
        let allow = _.find(this.chartTypes, c => c.value === type);
        // Variable que emmagatzemara les dades un cop ja transformades
        let chart;
        let config;
        let dataTypes = this.currentQuery.map(column => column.column_type);

        //for pie, line and bar charType is reseted to 'chart';
        this.display_v.chart = type;
        this.graficos.chartType = type;

        if (!_.isEqual(this.display_v.chart, 'no_data') && !allow.ngIf) {

            switch (type) {
                case 'table':
                    this.initializeTable();
                    this.table.value = this.chartUtils.transformDataQueryForTable(this.chartLabels, this.chartData);
                    break;

                case 'crosstable':
                    this.initCrossTable();
                    this.crosstable.value = this.chartUtils.transformDataQueryForTable(this.chartLabels, this.chartData);
                    break;

                case 'doughnut':
                    // El propi component EdaChart serà el qui s'encarregui de prepara la data per la visualització del component
                    chart = this.chartUtils.transformDataQuery('doughnut', this.chartData, dataTypes);
                    config = this.chartUtils.initChartOptions('doughnut');
                    this.graficos.chartLabels = chart[0];
                    this.graficos.chartData = chart[1];
                    this.graficos.chartOptions = config.chartOptions;
                    if (styles) {
                        this.graficos.chartColors = this.recoverChartColors(prevChartType, 'doughnut', styles, chart);
                    }
                    this.display_v.chart = 'chart';
                    break;

                case 'bar':
                    chart = this.chartUtils.transformDataQuery('bar', this.chartData, dataTypes, this.labeling);
                    config = this.chartUtils.initChartOptions('bar');
                    this.graficos.chartLabels = chart[0];
                    this.graficos.chartDataset = chart[1];
                    this.graficos.chartOptions = config.chartOptions;
                    this.graficos.chartPlugins = config.chartPlugins;
                    if (styles) {
                        this.graficos.chartColors = this.recoverChartColors(prevChartType, 'bar', styles, chart);
                    }
                    this.display_v.chart = 'chart';
                    break;

                case 'line':
                    chart = this.chartUtils.transformDataQuery('line', this.chartData, dataTypes, this.labeling);
                    config = this.chartUtils.initChartOptions('line');
                    this.graficos.chartLabels = chart[0];
                    this.graficos.chartDataset = chart[1];
                    this.graficos.chartOptions = config.chartOptions;
                    if (styles) {
                        this.graficos.chartColors = this.recoverChartColors(prevChartType, 'line', styles, chart);
                    }
                    this.display_v.chart = 'chart';
                    break;

                case 'kpi':
                    this.graficos.value = this.chartData[0][0];
                    this.graficos.header = this.chartLabels[0];
                    break;
            }
        } else {
            this.display_v.chart = 'no_data';
        }
    }

    recoverChartProperties(type) {
        let allow = _.find(this.chartTypes, c => c.value === type);
        if (!_.isEqual(this.display_v.chart, 'no_data') && !allow.ngIf) {
            switch (type) {
                case 'table':
                    this.initializeTable();
                    this.table.value = this.chartUtils.transformDataQueryForTable(this.chartLabels, this.chartData);
                    this.display_v.chart = 'table';
                    break;

                case 'crosstable':
                    this.initCrossTable();
                    this.crosstable.value = this.chartUtils.transformDataQueryForTable(this.chartLabels, this.chartData);
                    this.display_v.chart = 'crosstable';
                    break;

                case 'doughnut':
                    // El propi component EdaChart serà el qui s'encarregui de prepara la data per la visualització del component
                    this.graficos = this.colorsDeepCopy;
                    this.display_v.chart = 'chart';

                    break;

                case 'bar':
                    this.graficos = this.colorsDeepCopy;
                    this.display_v.chart = 'chart';
                    break;

                case 'line':
                    this.graficos = this.colorsDeepCopy;
                    this.display_v.chart = 'chart';
                    break;

                case 'kpi':
                    this.graficos = this.colorsDeepCopy;
                    this.display_v.chart = 'kpi';
                    break;

            }
        }

        else {
            this.display_v.chart = 'no_data';
        }

    }

    recoverChartColors(prevChartType: string, currentChartype: string, styles: any, data: any) {
        if (!prevChartType || currentChartype === prevChartType) {
            return styles
        }
        else {
            switch (currentChartype) {
                case 'doughnut': return EdaChartComponent.defaultPieColors;
                case 'bar': return EdaChartComponent.defaultChartColors;
                case 'line': return EdaChartComponent.defaultChartColors;
            }
        }
    }

    getChartStyles(type: string) {
        if (this.panel.content) {
            return this.panel.content.query.output.styles;
        } else {
            return;
        }
    }

    /* Loading Columns when click any Table */
    loadColumns(table: any) {
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
     * @param table  origin table
     * @param vMap   Map() to keep tracking visited nodes -> first call is just a new Map()
     */
    findRelationsRecursive(tables: any, table: any, vMap: any) {
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

    /* Search for a tables with relations with the column clicked */
    searchRelations(c: Column, event?: CdkDragDrop<string[]>) {
        let selectedTable: any = {};
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

    /* Remove a column from Select Input */
    removeColumn(c: Column, list?: string) {
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

    /* Moure columnes amb l'Event Click! */
    moveItem(c: Column) {
        this.disableBtnSave();
        // Busca index en l'array de columnes
        const match = _.findIndex(this.columns, { column_name: c.column_name, table_id: c.table_id });
        this.columns.splice(match, 1); // Elimina aquella columna de l'array
        this.currentQuery.push(c); // Col·loca la nova columna a l'array Select
        this.searchRelations(c); // Busca les relacions de la nova columna afegida
        this.handleAggregationType(c); // Comprovacio d'agregacions
        this.handleOrdTypes(c); // Comprovacio ordenacio
    }

    /* Moure columnes amb l'Event Drag&Drop */
    drop(event: CdkDragDrop<string[]>) {
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
    isAllowed = (drag?: CdkDrag, drop?) => false;

    /*********************************************************/

    /* Funcions del Dialog d'Opcions de Columna */
    openColumnDialog(column: Column, isFilter?: boolean): void {
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

    findTable(t: string) {
        return this.tables.find(table => table.table_name === t).display_name.default;
    }

    // Es dispara quan seleccionem una columna
    handleAggregationType(column: Column): void {
        if (this.panel.content) {
            const tmpAggTypes = [];
            const found = this.currentQuery.find(c => c.column_name === column.column_name).aggregation_type.find(agg => agg.selected === true);
            // Si ja s'ha carregat el panell i tenim dades a this.select
            if (found) {
                column.aggregation_type.forEach(agg => {
                    tmpAggTypes.push(agg);
                });
                this.aggregationsTypes = tmpAggTypes;
                this.currentQuery.find(c => {
                    return column.column_name === c.column_name && column.table_id === c.table_id;
                }).aggregation_type = JSON.parse(JSON.stringify(this.aggregationsTypes));
                return;
            }

            // Si encara no hem carregat les dades a this.select
            // const queryFromServer = this.controller.params.panel.content.query.query.fields;
            // let aggregation = queryFromServer.filter(c => c.column_name === column.column_name && c.table_id === column.table_id)[0];
            // if (aggregation ){
            //     // aggregation = aggregation.aggregation_type;
            //     // column.aggregation_type.forEach((agg, index) => {
            //     //     tmpAggTypes.push(agg.value === aggregation ? { display_name: agg.display_name, value: agg.value, selected: true }
            //     //         : { display_name: agg.display_name, value: agg.value, selected: false });
            //     //});

            //     // Si tenim panell però hem de carregar les dades d'una columna nova que no era a la consulta original
            // } else {
            //     column.aggregation_type.forEach((agg, index) => {
            //         tmpAggTypes.push({ display_name: agg.display_name, value: agg.value, selected: agg.value === 'none' });
            //     });
            // }
            // this.aggregationsTypes = tmpAggTypes;
            // this.controller.params.select.find(c => {
            //     return column.column_name === c.column_name && column.table_id === c.table_id;
            // }).aggregation_type = JSON.parse(JSON.stringify(this.aggregationsTypes));
            // return;
            // Si no hi ha dades a la consulta

            // Si encara no hem carregat les dades a this.select
            const queryFromServer = this.panel.content.query.query.fields;
            let aggregation = queryFromServer.filter(c => c.column_name === column.column_name && c.table_id === column.table_id)[0];
            if (aggregation) {
                aggregation = aggregation.aggregation_type;
                column.aggregation_type.forEach(agg => {
                    tmpAggTypes.push(agg.value === aggregation ? { display_name: agg.display_name, value: agg.value, selected: true }
                        : { display_name: agg.display_name, value: agg.value, selected: false });
                });

                // Si tenim panell però hem de carregar les dades d'una columna nova que no era a la consulta original
            } else {
                column.aggregation_type.forEach((agg) => {
                    tmpAggTypes.push({ display_name: agg.display_name, value: agg.value, selected: agg.value === 'none' });
                });
            }
            this.aggregationsTypes = tmpAggTypes;
            this.currentQuery.find(c => {
                return column.column_name === c.column_name && column.table_id === c.table_id;
            }).aggregation_type = JSON.parse(JSON.stringify(this.aggregationsTypes));
            return;
            // Si no hi ha dades a la consulta
        } else {
            const found = this.currentQuery.find(c => c.column_name === column.column_name);
            if (!found) {
                const tmpAggTypes = [];
                column.aggregation_type.forEach((agg) => {
                    tmpAggTypes.push({ display_name: agg.display_name, value: agg.value, selected: agg.value === 'none' });
                });
                this.aggregationsTypes = tmpAggTypes;
            } else {
                this.aggregationsTypes = JSON.parse(JSON.stringify(column.aggregation_type));
            }
        }
        this.currentQuery.find(c => {
            return column.column_name === c.column_name && column.table_id === c.table_id;
        }).aggregation_type = JSON.parse(JSON.stringify(this.aggregationsTypes));
    }

    handleOrdTypes(column: Column): void {
        let addOrd: Column;

        if (this.panel.content) {
            const queryFromServer = this.panel.content.query.query.fields;
            const found = this.currentQuery.find(c => c.column_name === column.column_name).ordenation_type;

            if (found) {
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

            let ordenation = queryFromServer.filter(c => c.column_name === column.column_name && c.table_id === column.table_id)[0];
            ordenation = ordenation ? ordenation.ordenation_type : column.ordenation_type;

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

        addOrd = this.currentQuery.find(c => column.column_name === c.column_name && column.table_id === c.table_id);
        try {
            addOrd.ordenation_type = this.ordenationTypes.filter(ord => ord.selected === true)[0].value;
        } catch (e) {
            addOrd.ordenation_type = 'No';
            // console.log('Bug en la ordenacio. Això cal revisar-ho.  eda-blank-panel-component.ts linea 750');
            // console.log(this.ordenationTypes);
        }
    }

    private handleFilters(column: Column): void {
        if (this.panel.content && !this.selectedFilters.length) {
            this.selectedFilters = _.cloneDeep(this.panel.content.query.query.filters);
        }
        this.selectedFilters.forEach(filter => {
            filter.removed = false;
        });
    }


    private handleCurrentQuery(): void {
        if (this.panel.content) {
            const fields = this.panel.content.query.query.fields;
            for (let i = 0, n = fields.length; i < n; i++) {
                this.currentQuery[i].format = fields[i].format;
            }
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

    public closeEditarConsulta(): void {
        // Reset all the variables
        this.display_v.saved_panel = false;
        this.columns = [];
        this.currentQuery = [];
        this.selectedFilters = this.panel.content.query.query.filters;
        this.loadChartsData(this.panelDeepCopy);
        this.userSelectedTable = undefined;
        this.tableToShow = this.tables;
        this.display_v.chart = '';
        this.index = 0;
        this.display_v.page_dialog = false;
    }

    private onCloseChartProperties(event, properties): void {
        if (!_.isEqual(event, EdaDialogCloseEvent.NONE)) {
            if (properties) {
                if (properties.chartType === 'doughnut') {
                    this.edaChart.updateChart();
                }
                this.graficos = {};
                this.graficos = _.cloneDeep(properties);
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

    private debugLog(where : string): void {
        console.log(`%c ${where}`, 'color:green; font-weight:bold')
        const panel = this.panel;
        console.log({panel});
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
                    label: 'Editar gráfico',
                    icon: 'mdi mdi-wrench',
                    command: () => {
                        if (Object.entries(this.graficos).length !== 0 && this.chartData.length !== 0) {
                            if (['line', 'doughnut', 'bar'].includes(this.graficos.chartType)) {
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
}
