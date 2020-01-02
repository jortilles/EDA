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
    FilterType
} from '@eda_services/service.index';
import {
    EdaPageDialogComponent,
    EdaDialogController,
    EdaContextMenu,
    EdaContextMenuItem
} from '@eda_shared/components/shared-components.index';
import { Query, Column } from '@eda_models/model.index';
import { EdaColumnText, EdaTable } from '@eda_components/component.index';
import { EdaPanel } from './eda-panel';
import * as _ from 'lodash';

@Component({
    selector: 'eda-blank-panel',
    templateUrl: './eda-blank-panel.component.html',
    styleUrls: []
})
export class EdaBlankPanelComponent implements OnInit {
    @Input() inject: EdaPanel;
    @Output() remove: EventEmitter<any> = new EventEmitter();
    @ViewChild('pdialog', { static: false }) pdialog: EdaPageDialogComponent;

    public configController: EdaDialogController;
    public filterController: EdaDialogController;
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
    public select: any[] = [];
    public aggregationsTypes: any[] = [];
    public filtredColumns: Column[] = [];
    public ordenationTypes: any[] = [
        { display_name: 'Asc', value: 'Asc', selected: false },
        { display_name: 'Desc', value: 'Desc', selected: false },
        { display_name: 'No', value: 'No', selected: false }
    ];

    /** Chart Variables */
    public chartTypes: EdaChartType[]; // All posible chartTypes
    public chartData: any[] = [];  // Data for Charts
    public chartLabels: string[] = []; // Labels for Charts
    public graficos: any = {}; // Inject for Charts
    public filterTypes: FilterType[];
    public labeling: any[] = []; // Number of string eda-columns in the results of the query
    public table: EdaTable = new EdaTable({}); // EdaTable
    public selectedFilters: any[] = [];
    public filterValue: any = {};

    public color: any = { r: 255, g: 0, b: 0.3 };

    constructor(private formBuilder: FormBuilder,
                private dashboardService: DashboardService,
                private chartUtils: ChartUtilsService,
                private fileUtiles: FileUtiles,
                private alertService: AlertService,
                private spinnerService: SpinnerService) {

        this.chartForm = this.formBuilder.group({ chart: [null, Validators.required] });

        this.chartTypes = this.chartUtils.chartTypes; // Loading all disponibles chart type from a chartUtilService

        this.filterTypes = this.chartUtils.filterTypes;

        this.contextMenu = new EdaContextMenu({
            header: 'OPCIONES DEL PANEL',
            contextMenuItems: [
                new EdaContextMenuItem({
                    label: 'Configuración',
                    icon: 'fa fa-cog',
                    command: () => {
                        this.contextMenu.hideContextMenu();
                        this.openPanelConfig();
                    }
                }),
                new EdaContextMenuItem({
                    label: 'Eliminar',
                    icon: 'fa fa-trash',
                    command: () => {
                        this.contextMenu.hideContextMenu();
                        this.removePanel();
                    }
                })
            ]
        });
    }

    ngOnInit() {
        this.loadTablesData();

        if (this.inject.panel.content) {
            this.loadChartsData();
        }
    }

    loadTablesData() {
        // Check for 'applyToAll' Filters
        if (this.inject.applyToAllfilter.present === true) {
            this.tablesData();
            this.tableToShow = this.tables;
        } else {
            /* Copy Table Values */
            // All tables
            this.tables = JSON.parse(JSON.stringify(this.inject.data_source.model.tables.filter(table => table.visible === true).sort((a, b) => {
                return (a.table_name > b.table_name) ? 1 : ((b.table_name > a.table_name) ? -1 : 0);
            })));

            // All visible tables
            this.tableToShow = JSON.parse(JSON.stringify(this.inject.data_source.model.tables.filter(table => table.visible === true).sort((a, b) => {
                return (a.table_name > b.table_name) ? 1 : ((b.table_name > a.table_name) ? -1 : 0);
            })));
        }
    }

    reloadTablesData() {
        if (this.inject.applyToAllfilter.present === true) {
            this.tablesData();
        } else {
            this.tables =JSON.parse(JSON.stringify( this.inject.data_source.model.tables.filter(table => table.visible === true).sort((a, b) => {
                return (a.table_name > b.table_name) ? 1 : ((b.table_name > a.table_name) ? -1 : 0);
            })));
        }
    }

    private tablesData = () => {
        const allTables = JSON.parse(JSON.stringify(this.inject.data_source.model.tables));
        const originTable = allTables.filter(t => t.table_name === this.inject.applyToAllfilter.refferenceTable)[0];  // selected table
        const tablesMap = this.findRelationsRecursive(allTables, originTable, new Map());
        this.tables = Array.from(tablesMap.values());
        this.tables = this.tables
            .filter(table => table.visible === true)
            .sort((a, b) => (a.table_name > b.table_name) ? 1 : ((b.table_name > a.table_name) ? -1 : 0));
    }

    /* Quan es carrega un dashboard carrega els grafics dels seus panells */
    loadChartsData() {
        if (this.inject.panel.content) {
            const content = this.inject.panel.content;
            this.display_v.minispinner = true;
            this.dashboardService.executeQuery(content.query).subscribe(
                response => {
                    content.query.query.fields.forEach(element => {
                        this.loadColumns(this.tables.find(t => t.table_name === element.table_id));
                        this.moveItem(this.columns.find(c => c.column_name === element.column_name));
                        this.handleFilters(this.columns.find(c => c.column_name === element.column_name));
                    });

                    if (content.chart === 'table') {
                        this.initTable();
                    }

                    this.chartLabels = response[0];
                    this.chartData = response[1];

                    this.chartForm.patchValue({
                        chart: this.chartUtils.chartTypes.find(o => o.value === content.chart)
                    });

                    this.verifyData();
                    this.changeChartType(content.chart);

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
        this.inject.panel.title = this.pdialog.getTitle();

        // Si hi ha contingut l'inicialitzem, sino mostrem en blanc
        if (!_.isEmpty(this.graficos) || !_.isEmpty(this.table.value)) {
            this.initChartContent();
        } else {
            this.display_v.saved_panel = false;
        }

        this.display_v.page_dialog = false;
    }

    initChartContent() {
        this.display_v.saved_panel = true;
        const query = this.initObjectQuery();
        const chart = this.chartForm.value.chart.value ? this.chartForm.value.chart.value : this.chartForm.value.chart;
        this.inject.panel.content = { query, chart };
    }

    /**** Funcions d'execucio de la query ****/
    /* Executing Query to API */
    runQuery(globalFilters: boolean) {
        if (!globalFilters) {
            this.spinnerService.on();
        } else {
            this.display_v.minispinner = true;
        }
        this.dashboardService.executeQuery(this.initObjectQuery()).subscribe(
            res => {
                this.ableBtnSave();
                /* Labels i Data - Arrays */
                this.chartLabels = res[0];
                this.chartData = res[1];

                if (!globalFilters) {
                    this.initTable();

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
            },
            err => {
                this.alertService.addError(err);
                this.spinnerService.off();
            }
        );
    }

    initDialogConfigView() {
        const content = this.inject.panel.content;
        if (content.chart === 'table') {
            this.initTable();
        }

        this.verifyData();
        this.changeChartType(content.chart);

        this.chartForm.patchValue({
            chart: this.chartUtils.chartTypes.find(o => o.value === content.chart)
        });
    }

    // Inicalitzar la query
    initObjectQuery() {
        const labels = [];
        const queryColumns = [];
        for (let i = 0, n = this.select.length; i < n; i += 1) {
            const col: any = {};
            col.table_id = this.select[i].table_id;
            col.column_name = this.select[i].column_name;
            col.display_name = this.select[i].display_name.default;
            col.column_type = this.select[i].column_type;
            col.aggregation_type = this.select[i].aggregation_type.filter(ag => ag.selected === true);
            col.aggregation_type = col.aggregation_type[0] ? col.aggregation_type[0].value : 'none';
            col.ordenation_type = this.select[i].ordenation_type;
            col.order = i;
            col.column_granted_roles = this.select[i].column_granted_roles;
            col.row_granted_roles = this.select[i].row_granted_roles;

            queryColumns.push(col);
            labels.push(this.select[i].column_name);
        }

        const body: Query = {
            id: '1',
            model_id: this.inject.data_source._id,
            user: {
                user_id: localStorage.getItem('id'),
                user_roles: ['USER_ROLE']
            },
            dashboard: {
                dashboard_id: this.inject.data_source,
                panel_id: this.inject.panel.id
            },
            query: {
                fields: queryColumns,
                filters: this.selectedFilters,
                simple: false
            },
            output: {
                labels,
                data: []
            }
        };
        return body;
    }

    // Inicialitzar la taula on es pintaran els registres
    initTable() {
        this.chartForm.patchValue({
            chart: { label: 'Table', value: 'table', icon: 'pi pi-exclamation-triangle', ngIf: false }
        });
        const tableColumns = [];
        this.select.forEach(r => {
            tableColumns.push(new EdaColumnText({ header: r.display_name.default, field: r.column_name }));
        });
        this.table = new EdaTable({ alertService: this.alertService, cols: tableColumns });
    }

    /**** Funcions dels Grafics ****/
    // Verifica segons les dades rebudes quin tipus de grafic es pot fer i quin no
    // És realitza la comprovació sempre què s'executi una consulta a la bd
    verifyData() {
        // Reset charts
        for (const chart of this.chartTypes) {
            chart.ngIf = false;
        }
        if (!_.isEmpty(this.select)) {
            const verifyNum = [];
            const verifyLabels = [];

            for (let i = 0; i < this.chartData.length; i += 1) {
                for (let e = 0; e < this.chartData[i].length; e += 1) {
                    if (typeof this.chartData[i][e] === 'number') {
                        verifyNum.push(this.chartLabels[e]);
                    }
                    if (typeof this.chartData[i][e] === 'string') {
                        verifyLabels.push(this.chartLabels[e]);
                    }
                }
            }
            // Verificadors
            const unique1 = verifyNum.filter((v, i, a) => a.indexOf(v) === i);
            const unique2 = verifyLabels.filter((v, i, a) => a.indexOf(v) === i);
            this.labeling = unique2;

            if (unique1.length === 0 && unique2.length === 0) {
                this.alertService.addWarning('No se pudo obtener ningún registro');
                this.display_v.chart = 'no_data';
                this.notAllowedCharts(['pie', 'bar', 'line', 'kpi']);
            } else {
                if (unique1.length + unique2.length === 1) {
                    if (unique1.length !== 0) {
                        // Només table i kpi
                        this.notAllowedCharts(['pie', 'bar', 'line']);
                    }
                } else if (unique1.length + unique2.length === 2) {
                    if (unique1.length === 1 || unique2.length === 1) {
                        // Tots menys kpi
                        this.notAllowedCharts(['kpi']);
                    } else {
                        this.notAllowedCharts(['pie', 'bar', 'line', 'kpi']);
                    }
                } else if (unique1.length + unique2.length === 3) {
                    if (unique1.length === 1 && unique2.length === 2) {
                        // Tots menys kpi i pie
                        this.notAllowedCharts(['kpi', 'pie']);
                    } else {
                        this.notAllowedCharts(['pie', 'bar', 'line', 'kpi']);
                    }
                } else if (unique1.length + unique2.length === 0) {
                    // No hi ha dades
                    this.notAllowedCharts(['pie', 'bar', 'line', 'table', 'kpi']);
                }

                if (unique1.length + unique2.length !== 0) {
                    _.find(this.chartTypes, c => c.value === 'table').ngIf = false;
                }
            }
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
    changeChartType(type: string) {
        this.graficos = {};
        // Comprovara que el gràfic que es seleccioni es pugui crear o no
        let allow;
        // Variable que emmagatzemara les dades un cop ja transformades
        let chart;
        let config;

        if (!_.isEqual(this.display_v.chart, 'no_data')) {
            switch (type) {
                case 'table':
                    allow = _.find(this.chartTypes, c => c.value === 'table');
                    if (!allow.ngIf) {
                        this.initTable();
                        this.table.value = this.chartUtils.transformDataQueryForTable(this.chartLabels, this.chartData);
                        this.display_v.chart = 'table';
                    }
                    break;
                case 'pie':
                    allow = _.find(this.chartTypes, c => c.value === 'pie');
                    if (!allow.ngIf) {
                        // El propi component EdaChart serà el qui s'encarregui de prepara la data per la visualització del component
                        chart = this.chartUtils.transformDataQuery('pie', this.chartData);
                        config = this.chartUtils.initChartOptions('pie');
                        this.graficos.chartType = 'pie';
                        this.graficos.chartLabels = chart[0];
                        this.graficos.chartData = chart[1];
                        this.graficos.chartOptions = config.chartOptions;
                        this.display_v.chart = 'chart';
                    }
                    break;
                case 'bar':
                    allow = _.find(this.chartTypes, c => c.value === 'bar');
                    if (!allow.ngIf) {
                        chart = this.chartUtils.transformDataQuery('bar', this.chartData, this.labeling);
                        config = this.chartUtils.initChartOptions('bar');

                        this.graficos.chartType = 'bar';
                        this.graficos.chartLabels = chart[0];
                        this.graficos.chartDataset = chart[1];
                        this.graficos.chartOptions = config.chartOptions;
                        this.graficos.chartPlugins = config.chartPlugins;
                        this.display_v.chart = 'chart';
                    }
                    break;
                case 'line':
                    allow = _.find(this.chartTypes, c => c.value === 'line');
                    if (!allow.ngIf) {
                        chart = this.chartUtils.transformDataQuery('line', this.chartData, this.labeling);
                        config = this.chartUtils.initChartOptions('line');

                        this.graficos.chartType = 'line';
                        this.graficos.chartLabels = chart[0];
                        this.graficos.chartDataset = chart[1];
                        this.graficos.chartOptions = config.chartOptions;
                        this.display_v.chart = 'chart';
                    }
                    break;
                case 'kpi':
                    allow = _.find(this.chartTypes, c => c.value === 'kpi');
                    if (!allow.ngIf) {
                        this.graficos.value = this.chartData[0][0];
                        this.graficos.header = this.chartLabels[0];
                        this.display_v.chart = 'kpi';
                    }
                    break;
            }
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
            const matcher = _.find(this.select, (x) => c.table_id === x.table_id && c.column_name === x.column_name);
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
        table.relations.forEach(rel => {
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
        const allTables = JSON.parse(JSON.stringify(this.inject.data_source.model.tables));       // All tables are needed (hidden too);
        const tablesMap = this.findRelationsRecursive(allTables, originTable, new Map());         // Map with all related tables
        this.tableToShow = Array.from(tablesMap.values());
        this.tableToShow = this.tableToShow
            .filter(table => table.visible === true)
            .sort((a, b) => (a.table_name > b.table_name) ? 1 : ((b.table_name > a.table_name) ? -1 : 0));
    }

    /** Remove a column from Select Input */
    removeColumn(c: Column, list?: string) {
        this.disableBtnSave();
        // Busca de l'array index, la columna a borrar i ho fa
        if (list === 'select') {
            const match = _.findIndex(this.select, { column_name: c.column_name, table_id: c.table_id });
            // Reseting all configs of column removed
            this.select[match].ordenation_type = 'No';
            this.select[match].aggregation_type.forEach(ag => ag.selected = false);
            this.select.splice(match, 1);
        } else if (list === 'filter') {
            const match = _.findIndex(this.filtredColumns, { column_name: c.column_name, table_id: c.table_id });
            this.filtredColumns.splice(match, 1);
        }
        // Carregar de nou l'array Columns amb la columna borrada
        this.loadColumns(_.find(this.tables, (t) => t.table_name === c.table_id));

        // Buscar relacións per tornar a mostrar totes les taules
        if (this.select.length === 0) {
            this.tableToShow = this.tables;
        } else {
            _.map(this.select, selected => selected.table_id === c.table_id);
        }

        const filters = this.selectedFilters.filter(f => f.filter_column === c.column_name);
        filters.forEach(f => this.selectedFilters = this.selectedFilters.filter(ff => ff.filter_id !== f.filter_id));

    }

    /* Moure columnes amb l'Event Click! */
    moveItem(c: Column) {
        this.disableBtnSave();
        // Busca index en l'array de columnes
        const match = _.findIndex(this.columns, { column_name: c.column_name, table_id: c.table_id });
        // c.ordenation_type = 'No';
        this.columns.splice(match, 1); // Elimina aquella columna de l'array
        this.select.push(c); // Col·loca la nova columna a l'array Select
        this.searchRelations(c); // Busca les relacions de la nova columna afegida
        this.handleAggregationType(c);
        this.handleOrdTypes(c);
        // this.handleFilters(c);
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

    findTable(t: string) {
        return this.tables.find(table => table.table_name === t).display_name.default;
        // return table.display_name.default;
    }

    /* Condicions Drag&Drop */
    isAllowed = (drag?: CdkDrag, drop?) => false;

    /*********************************************************/

    /**** Funcions del Dialog d'Opcions de Columna  ****/
    showDialog(column: Column, isFilter?: boolean) {
        this.disableBtnSave();
        const p = {
            selectedColumn: column,
            select: this.select,
            inject: this.inject,
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

    // Es dispara quan seleccionem una columna
    handleAggregationType(column: Column) {
        if (this.inject.panel.content) {
            const tmpAggTypes = [];
            const found = this.select.find(c => c.column_name === column.column_name).aggregation_type.find(agg => agg.selected === true);

            // Si ja s'ha carregat el panell i tenim dades a this.select
            if (found) {
                column.aggregation_type.forEach(agg => {
                    tmpAggTypes.push(agg);
                });
                this.aggregationsTypes = tmpAggTypes;
                this.select.find(c => {
                    return column.column_name === c.column_name && column.table_id === c.table_id;
                }).aggregation_type = JSON.parse(JSON.stringify(this.aggregationsTypes));
                return;
            }
            // Si encara no hem carregat les dades a this.select
            const queryFromServer = this.inject.panel.content.query.query.fields;
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
            this.select.find(c => {
                return column.column_name === c.column_name && column.table_id === c.table_id;
            }).aggregation_type = JSON.parse(JSON.stringify(this.aggregationsTypes));
            return;
            // Si no hi ha dades a la consulta
        } else {
            const found = this.select.find(c => c.column_name === column.column_name);
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
        this.select.find(c => {
            return column.column_name === c.column_name && column.table_id === c.table_id;
        }).aggregation_type = JSON.parse(JSON.stringify(this.aggregationsTypes));
    }

    handleOrdTypes(column: Column) {
        let addOrd: Column;

        if (this.inject.panel.content) {
            const queryFromServer = this.inject.panel.content.query.query.fields;
            const found = this.select.find(c => c.column_name === column.column_name).ordenation_type;

            if (found) {
                this.ordenationTypes.forEach(o => {
                    o.value !== column.ordenation_type ? o.selected = false : o.selected = true;
                });

                addOrd = this.select.find(c => column.column_name === c.column_name && column.table_id === c.table_id);
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
                { display_name: 'Asc', value: 'Asc', selected: false },
                { display_name: 'Desc', value: 'Desc', selected: false },
                { display_name: 'No', value: 'No', selected: true }
            ];
        } else {
            this.ordenationTypes.forEach(ord => {
                ord.value !== column.ordenation_type ? ord.selected = false : ord.selected = true;
            });
        }

        addOrd = this.select.find(c => column.column_name === c.column_name && column.table_id === c.table_id);
        addOrd.ordenation_type = this.ordenationTypes.filter(ord => ord.selected === true)[0].value;

    }

    handleFilters(column: Column) {
        if (this.inject.panel.content && !this.selectedFilters.length) {
            this.selectedFilters = this.inject.panel.content.query.query.filters;
        }
    }

    /**** Funcions generals de la pagina ****/
    private disableBtnSave = () => this.display_v.btnSave = true;

    private ableBtnSave = () => this.display_v.btnSave = false;

    openPanelConfig() {
        this.display_v.page_dialog = true;
        this.ableBtnSave();
        this.verifyData();
    }

    closePanelConfig() {
        // Reset all the variables
        this.display_v.saved_panel = false;
        this.columns = [];
        this.select = [];
        this.selectedFilters = [];
        this.loadChartsData();
        this.userSelectedTable = undefined;
        this.tableToShow = this.tables;
        this.display_v.chart = '';
        this.index = 0;
        this.display_v.page_dialog = false;
    }

    removePanel() {
        this.remove.emit(this.inject.panel.id);
    }

    onResize(event) {
        this.display_v.responsive = event.currentTarget.innerWidth <= 1440;
    }

    handleTabChange(event: any) {
        // event.index === 1 ? this.verifyData() : false;
        this.index = event.index;
    }

    showDescription(event) {
        this.description = event.description.default;
    }
}
