import { GroupService } from './../../../../services/api/group.service';
import { LinkedDashboardProps } from '@eda/components/eda-panels/eda-blank-panel/link-dashboards/link-dashboard-props';
import { TableConfig } from './panel-charts/chart-configuration-models/table-config';
import { PanelChartComponent } from './panel-charts/panel-chart.component';
import { Component, Input, OnInit, ViewChild, Output, EventEmitter } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { CdkDragDrop, moveItemInArray, transferArrayItem, CdkDrag } from '@angular/cdk/drag-drop';
import { Column, EdaPanel, InjectEdaPanel } from '@eda/models/model.index';
import {
    DashboardService, ChartUtilsService, AlertService,
    SpinnerService, FileUtiles, EdaChartType,
    FilterType, QueryBuilderService, OrdenationType, UserService
} from '@eda/services/service.index';
import {
    EdaPageDialogComponent, EdaDialogController, EdaContextMenu, EdaDialogCloseEvent
} from '@eda/shared/components/shared-components.index';
import { EdaChartComponent } from '@eda/components/component.index';
import { PanelChart } from './panel-charts/panel-chart';
import * as _ from 'lodash';
import { ChartConfig } from './panel-charts/chart-configuration-models/chart-config';
import { ChartJsConfig } from './panel-charts/chart-configuration-models/chart-js-config';
import { EdaInputText } from '@eda/shared/components/eda-input/eda-input-text';

/** Panel utils  */
import { PanelOptions } from './panel-utils/panel-menu-options';
import { TableUtils } from './panel-utils/tables-utils';
import { QueryUtils } from './panel-utils/query-utils';
import { EbpUtils } from './panel-utils/ebp-utils';
import { ChartsConfigUtils } from './panel-utils/charts-config-utils';
import { PanelInteractionUtils } from './panel-utils/panel-interaction-utils'

import {NULL_VALUE} from '../../../../config/personalitzacio/customizables'

import { aggTypes } from 'app/config/aggretation-types';


export interface IPanelAction {
    code: string;
    data: any;
}

@Component({
    selector: 'eda-blank-panel',
    templateUrl: './eda-blank-panel.component.html',
    styleUrls: ['./eda-blank-panel.component.css']
})
export class EdaBlankPanelComponent implements OnInit {

    @ViewChild('pdialog', { static: false }) pdialog: EdaPageDialogComponent;
    @ViewChild('edaChart', { static: false }) edaChart: EdaChartComponent;
    @ViewChild(PanelChartComponent, { static: false }) panelChart: PanelChartComponent;
    @ViewChild('panelChartComponentPreview', { static: false }) panelChartPreview: PanelChartComponent;
    @ViewChild('op', { static: false }) op: any;



    @Input() panel: EdaPanel;
    @Input() inject: InjectEdaPanel;
    @Output() remove: EventEmitter<any> = new EventEmitter();
    @Output() duplicate: EventEmitter<any> = new EventEmitter();
    @Output() action: EventEmitter<IPanelAction> = new EventEmitter<IPanelAction>();

    /** propietats que s'injecten al dialog amb les propietats específiques de cada gràfic. */
    public configController: EdaDialogController;
    public filterController: EdaDialogController;
    public chartController: EdaDialogController;
    public tableController: EdaDialogController;
    public alertController: EdaDialogController;
    public cumsumAlertController : EdaDialogController;
    public mapController: EdaDialogController;
    public kpiController: EdaDialogController;
    public dynamicTextController: EdaDialogController;
    public sankeyController: EdaDialogController;
    public treeMapController: EdaDialogController;
    public funnelController:EdaDialogController;
    public bubblechartController:EdaDialogController;
    public linkDashboardController: EdaDialogController;
    public scatterPlotController: EdaDialogController;
    public knobController: EdaDialogController;
    public sunburstController: EdaDialogController;
    public contextMenu: EdaContextMenu;
    public lodash: any = _;
/* SDA CUSTOM  */ public showHiddenColumn: boolean = false;



    public inputs: any = {};

    /**Dashbard emitter */
    // public actualSize : {litle:boolean, medium:boolean}

    /** Page variables */
    public title: string = '';
    // Display variables
    public display_v = {
        page_dialog: false, // page dialog
        saved_panel: false, // saved panel
        btnSave: false, // button guardar
        aggreg_dialog: false, // aggregation dialog
        whatIf_dialog: false,
        calendar: false, // calendars inputs
        between: false, // between inputs
        filterValue: true,
        joinType:true,
        filterButton: true,
        minispinner: false, // mini spinner panel
        responsive: false, // responsive option
        chart: '', // Change between chart or table
        disablePreview: true,
        disableQueryInfo: true,
        notSaved: false,
        minispinnerSQL: false
    };

    public index: number;
    public description: string;
    public chartForm: UntypedFormGroup;
    public userSelectedTable: string;

    /**Strings */
    public editQuery: string = $localize`:@@EditQuery:EDITAR CONSULTA`;
    public editSQLQuery: string = $localize`:@@EditSQLQuery:EDITAR CONSULTA SQL`;

    public limitRowsInfo: string = $localize`:@@limitRowsInfo:Establece un Top n para la consulta`;
    public draggFields: string = $localize`:@@dragFields:Arrastre aquí los atributos que quiera ver en su panel`;
    public draggFilters: string = $localize`:@@draggFilters:Arrastre aquí los atributos sobre los que quiera filtrar`;
    public ptooltipSQLmode: string = $localize`:@@sqlTooltip:Al cambiar de modo perderás la configuración de la consulta actual`;
/* SDA CUSTOM  */ public ptooltipHiddenColumn: string = $localize`:@@hiddenColumn:Al cambiar de modo se verán las columnas marcadas como ocultas`;
    public ptooltipViewQuery: string = $localize`:@@ptooltipViewQuery:Ver consulta SQL`;
    public aggregationText: string = $localize`:@@aggregationText:Agregación`;
    public textBetween: string = $localize`:@@textBetween:Entre`


    /** Query Variables */
    public tables: any[] = [];
    public tablesToShow: any[] = [];
    public assertedTables: any[] = [];
    public columns: any[] = [];
    public aggregationsTypes: any[] = [];
    public filtredColumns: Column[] = [];
    public ordenationTypes: OrdenationType[];
    public currentQuery: any[] = [];
    public currentSQLQuery: string = '';
    public queryLimit: number;
    public joinType: string = 'inner';

    public queryModes: any[] = [
        { label: $localize`:@@PanelModeSelectorEDA:Modo EDA`, value: 'EDA' },
        { label: $localize`:@@PanelModeSelectorSQL:Modo SQL`, value: 'SQL' },
        { label: $localize`:@@PanelModeSelectorTree:Modo Árbol`, value: 'EDA2' }
    ];
    public selectedQueryMode: string = 'EDA2';

    // Depreacted use selectedQueryMode instead of
    // public modeSQL: boolean;
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

    public loadingNodes: boolean = false;
    public rootTable: any;
    public tableNodes: any = [];
    public selectedTableNode: any;
    public nodeJoins: any[] = [];

    public color: any = { r: 255, g: 0, b: 0.3 };

    /*Deep copies for panel and color configuration to recover panel when edit changes are cancelled*/
    public panelDeepCopy: any = {};
    public colorsDeepCopy: any = {};

    public queryFromServer: string = '';
/* SDA CUSTOM  */    public showHiddId: boolean;

    // join types
    joinTypeOptions: any[] = [
        { icon: 'pi pi-align-left', joinType: 'left', description: 'Se mostrarán todos los registros de la tabla principal a los que el usuario tenga acceso, y los registros relacionados del resto de tablas.' },
        { icon: 'pi pi-align-center', joinType: 'inner', description: 'Solo se mostrarán los registros relacionados en ambas tablas a los que el usuario tenga acceso.' },
        // { icon: 'pi pi-align-right', joinType: 'right' }
        //,         { icon: 'pi pi-align-justify', joinType: 'full outer' }
    ];


    /**panel chart component configuration */
    public panelChartConfig: PanelChart = new PanelChart();


    // for the drag-drop component
    public axes:any[]=[];
    public newAxesChanged: boolean = false;
    public graphicType: string; // We extract the type of graph at the beginning and when executing
    public configCrossTable: any;
    public copyConfigCrossTable: any = {};
    public dragAndDropAvailable: boolean = false;

    // Hide the executing button
    public hiddenButtonExecuter: boolean = false;

    constructor(
        public queryBuilder: QueryBuilderService,
        public fileUtiles: FileUtiles,
        private formBuilder: UntypedFormBuilder,
        public dashboardService: DashboardService,
        public chartUtils: ChartUtilsService,
        public alertService: AlertService,
        public spinnerService: SpinnerService,
        public groupService: GroupService,
        public userService: UserService,
    ) {
        this.initializeBlankPanelUtils();
        this.initializeInputs();
    }

    ngOnInit(): void {
        this.index = 0;
/* SDA CUSTOM  */ this.showHiddenColumn = false;
/* SDA CUSTOM  */ this.showIdForHiddenMode();

        this.setTablesData();

        /**If panel comes from server */
        if (this.panel.content) {
            try{
                const contentQuery = this.panel.content.query;

                const modeSQL = contentQuery.query.modeSQL; // Comptabilitzar dashboard antics sense queryMode informat
                let queryMode = contentQuery.query.queryMode;

                if (!queryMode) {
                    queryMode = modeSQL ? 'SQL' : 'EDA';
                }

                this.selectedQueryMode = queryMode;

                if (queryMode == 'EDA2') {
                    this.rootTable = contentQuery.query.rootTable;
                }

                if (modeSQL || queryMode=='SQL') {
                    this.currentSQLQuery = contentQuery.query.SQLexpression;

                    this.sqlOriginTable = this.tables.filter(t => t.table_name === contentQuery.query.fields[0].table_id)
                        .map(table => ({ label: table.display_name.default, value: table.table_name }))[0];
                }

                this.loadChartsData(this.panel.content);
            } catch(e){
                console.error('Error loading panen conent.....');
                throw e;
            }
        }

        this.dashboardService.notSaved.subscribe(
            (data) => this.display_v.notSaved = data,
            (err) => this.alertService.addError(err)
        );

        this.contextMenu = new EdaContextMenu({
            header: $localize`:@@panelOptions0:OPCIONES DEL PANEL`,
            contextMenuItems: PanelOptions.generateMenu(this)
        });
    }

    /**
     * When selecting a node from the tree, it loads the columns to display.
     * @param event selected node. Can be rootNode (table_id) or childNode (child_id).
     */
    public tableNodeSelect(event: any): void {
        // clean columns filter.
        this.inputs.findColumn.reset();

        if (this.currentQuery.length == 0) {
            this.nodeJoins = [];
            this.rootTable = undefined;
        }

        const node = event?.node;
        if (node) {
            this.selectedTableNode = event.node;
            let table_id = node.table_id || node.child_id //.split('.')[0];

            PanelInteractionUtils.loadColumns(this, this.findTable(table_id));

            if (node.joins) {
                // Add the sourceJoins from this node.
                // When select a column then will add this join to this column for generate the query
                this.nodeJoins.push(node.joins);
            }
        }
    }

    /**
     * Expand table relations
     * @param event node to expand. Empty for nodes without more paths.
    */
    public tableNodeExpand(event: any): void {
        this.loadingNodes = true;

        const node = event?.node;

        if (node) {
            PanelInteractionUtils.expandTableNode(this, node);
        }

        this.loadingNodes = false;
    }

    public checkNodeSelected(node: any) {
        if (node?.child_id) {
            const nodeJoins = JSON.stringify((node.joins || ['root'])[0]);
            const nodeTableId = node.child_id;


            return this.currentQuery.some((query: any) => {
                const queryJoins = JSON.stringify((query.joins || ['root'])[0]);
                return query.table_id === nodeTableId && queryJoins === nodeJoins;
            }) || this.filtredColumns.some((filter: any) => {
                const filterJoins = JSON.stringify((filter.joins || ['root'])[0]);
                return filter.table_id === nodeTableId && filterJoins === nodeJoins;
            });
        } else {
            return false;
        }
    }

    getEditMode() {
        const user = sessionStorage.getItem('user');
        const userName = JSON.parse(user).name;
        return (userName !== 'edaanonim' && !this.inject.isObserver);
    }

    public showWhatIfSection(): boolean {
        return this.currentQuery.some((query: any) => query.whatif_column);
    }

    public getWhatIfColumns(): any[] {
        return this.currentQuery.filter((query: any) => query.whatif_column);
    }

    public async runWhatIfQuery(column?: any): Promise<void> {
        try {
            /* Este código actualiza el nombre de la columna. pero No lo actualizamos
            const updateDisplayName = (col: any) => {
                const origin = col.whatif.origin;
                if (origin) {
                    col.display_name.default = `${origin.display_name.default}(${col.whatif.operator}${col.whatif.value})`;
                }
            };

            if (!column) {
                for (const col of this.getWhatIfColumns()) {
                    updateDisplayName(col);
                }
            } else {
                updateDisplayName(column);
            }
*/

            await this.runQueryFromDashboard(true);
            this.panelChart.updateComponent();
        } catch (err) {
            throw err;
        }
    }

    private initializeBlankPanelUtils(): void {

        this.chartForm = this.formBuilder.group({ chart: [null, Validators.required] });

        this.chartTypes = this.chartUtils.chartTypes; // Loading all disponibles chart type from a chartUtilService

        this.filterTypes = this.chartUtils.filterTypes;

        this.ordenationTypes = this.chartUtils.ordenationTypes;
    }

    private initializeInputs(): void {
        this.inputs = {
            findTable: new EdaInputText({
                name: 'find_table',
                divClass: 'p-input-icon-left input-icons',
                inputClass: 'input-field',
                icon: 'fa fa-search',
                onKeyUp: (event) => this.onTableInputKey(event)
            }),
            findColumn: new EdaInputText({
                name: 'find_column',
                divClass: 'p-input-icon-left input-icons',
                inputClass: 'input-field',
                icon: 'fa fa-search',
                onKeyUp: (event) => this.onColumnInputKey(event)
            })
        };
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

    public setTablesData = () => {
        const tables = TableUtils.getTablesData(this.inject.dataSource.model.tables, this.inject.applyToAllfilter);
        this.tables = [].concat(_.cloneDeep(tables.allTables), this.assertedTables);
        this.tablesToShow = [].concat(_.cloneDeep(tables.tablesToShow), this.assertedTables);
        this.sqlOriginTables = _.cloneDeep(tables.sqlOriginTables);
    }

    /**
     * reLoad tables from model (called from dashboard component)
     */
    public reloadTablesData() {
        this.setTablesData();
    }

    /**
     * Runs a query and sets global config for this panel
     * @param panelContent panel content to build query .
     */
    async loadChartsData(panelContent: any) {
        if (this.panel.content) {
            this.display_v.minispinner = true;

            try {
                const response = await QueryUtils.switchAndRun(this, panelContent.query);
                this.chartLabels = this.chartUtils.uniqueLabels(response[0]);
                this.chartData = response[1].map(item => item.map(a => a == null ? NULL_VALUE : a)); // canviem els null per valor customitzable
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

    public buildGlobalconfiguration(panelContent: any) {

        const modeSQL = panelContent.query.query.modeSQL;
        const queryMode = this.selectedQueryMode;
        /*SDA CUSTOM*/ this.showHiddenColumn = true;

        const currentQuery = panelContent.query.query.fields;

        if ((queryMode && queryMode != 'SQL') || modeSQL === false) {

            try {
                if (queryMode == 'EDA2') {
                    this.rootTable = this.tables.find((t) => t.table_name == this.rootTable);
                    // Assert Relation Tables
                    const currentQuery = panelContent.query.query.fields;
                    for (const column of currentQuery) {
                        PanelInteractionUtils.assertTable(this, column);
                    }

                    PanelInteractionUtils.handleCurrentQuery2(this);

                    this.reloadTablesData();
                    PanelInteractionUtils.loadTableNodes(this);
                    this.userSelectedTable = undefined;
                    this.columns = [];
                } else {
                    PanelInteractionUtils.handleCurrentQuery(this);
                    this.columns = this.columns.filter((c) => !c.isdeleted);
                }


            } catch(e) {
                console.error('Error loading columns to define query in blank panel compoment........ Do you have deleted any column?????');
                console.error(e);
                throw e;
            }
        }


        this.queryLimit = panelContent.query.query.queryLimit;
        PanelInteractionUtils.handleFilters(this, panelContent.query.query);
        PanelInteractionUtils.handleFilterColumns(this, panelContent.query.query.filters, panelContent.query.query.fields);
        this.chartForm.patchValue({chart: this.chartUtils.chartTypes.find(o => o.subValue === panelContent.edaChart)});
        PanelInteractionUtils.verifyData(this);

        const config = ChartsConfigUtils.recoverConfig(panelContent.chart, panelContent.query.output.config);
        this.changeChartType(panelContent.chart, panelContent.edaChart, config);

        /*SDA CUSTOM*/ this.showHiddenColumn = false;
        this.display_v.saved_panel = true;
        this.display_v.minispinner = false;

        this.graphicType = this.chartForm.value.chart.value; // We start the type of Crosstable graphics

        // Verify if it is a cross table to show it on home screen
        this.dragAndDropAvailable = !this.chartTypes.filter( grafico => grafico.subValue === 'crosstable')[0].ngIf;
    }


    /**
     * Updates panel content with actual state
     */
    public savePanel() {

        this.panel.title = this.pdialog.getTitle();

        if (this.panel?.content) {
            this.panel.content.query.query.queryMode = this.selectedQueryMode;
            this.panel.content.query.query.rootTable = this.rootTable;
        }

        if (!_.isEmpty(this.graficos) || this.selectedQueryMode == 'SQL') {

            this.display_v.saved_panel = true;

            const query = this.initObjectQuery();
            const chart = this.chartForm.value.chart.value ? this.chartForm.value.chart.value : this.chartForm.value.chart;
            const edaChart = this.panelChart.props.edaChart;

            this.panel.content = { query, chart, edaChart };

            /**This is to repaint on panel redimension */
            if (['parallelSets', 'kpi','dynamicText', 'treeMap', 'scatterPlot', 'knob', 'funnel','bubblechart', 'sunburst'].includes(chart)) {
                this.renderChart(this.currentQuery, this.chartLabels, this.chartData, chart, edaChart, this.panelChartConfig.config);
            }
        } else {
            this.display_v.saved_panel = false;
        }
        this.display_v.page_dialog = false;


        //not saved alert message
        this.dashboardService._notSaved.next(true);

        // Se mantiene en falso luego de guardar
        this.hiddenButtonExecuter = false;
    }

    public initObjectQuery() {
        if (this.selectedQueryMode == 'SQL') {
            return QueryUtils.initSqlQuery(this);
        } else {
            return QueryUtils.initEdaQuery(this)
        }
    }

    /**
     * Reloads panels chart when runQuery() is called with globalFilters
     */
    public reloadContent() {
        const content = this.panel.content;
        const output = this.panel.content.query.output;
        PanelInteractionUtils.verifyData(this);
        const config = output.styles ? new ChartConfig(output.styles) : new ChartConfig(output.config);
        this.changeChartType(content.chart, content.edaChart, config);
        this.chartForm.patchValue({ chart: this.chartUtils.chartTypes.find(o => o.subValue === content.edaChart) });
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


        const chartConfig = config || new ChartConfig(ChartsConfigUtils.setVoidChartConfig(type));

        this.panelChartConfig = new PanelChart({
            query: query,
            data: { labels: chartLabels, values: chartData },
            chartType: type,
            config: chartConfig,
            edaChart: subType,
            maps: this.inject.dataSource.model.maps,
            size: { x: this.panel.w, y: this.panel.h },
            linkedDashboardProps: this.panel.linkedDashboardProps,

        });
    }

    /**
     * Updates chart configuration properties
     */
    public setChartProperties() {
        const config = this.panelChart.getCurrentConfig();
        //W T F F!!!!!!!!!!!=)&/=)!/(!&=)&)!=
        if (config
            && ['bar', 'line', 'horizontalBar', 'polarArea', 'doughnut', 'pyramid'].includes(config.chartType)
            && config.chartType === this.graficos.chartType ) {
            this.graficos = this.panelChart.getCurrentConfig();
        }
    }

    /**
     * Chart click event
    */
    public onChartClick(event: any): void {
        const config = this.panelChart.getCurrentConfig();
        if (config?.chartType == 'doughnut' || config?.chartType == 'polarArea' || config?.chartType == 'bar'   || config?.chartType == 'line'  ) {
            this.action.emit({ code: 'ADDFILTER', data: {...event, panel: this.panel} });
        }else{
            console.log('No filter here... yet');
        }
    }

    /**
     * Changes chart type
     * @param type chart type
     * @param content panel content
     */
    public changeChartType(type: string, subType: string, config?: ChartConfig) {

        this.graphicType = type; // Actualizamos el tipo de variable para el componente drag-drop
        this.graficos = {};
        let allow = _.find(this.chartTypes, c => c.value === type && c.subValue == subType);
        this.display_v.chart = type;
        this.graficos.chartType = type;
        this.graficos.edaChart = subType;
        this.graficos.addTrend = config && config.getConfig() ? config.getConfig()['addTrend'] : false;
        this.graficos.numberOfColumns = config && config.getConfig() ? config.getConfig()['numberOfColumns'] : null;

        if (!_.isEqual(this.display_v.chart, 'no_data') && !allow.ngIf && !allow.tooManyData) {
            // this.panelChart.destroyComponent();
            const _config = config || new ChartConfig(ChartsConfigUtils.setVoidChartConfig(type));
            this.renderChart(this.currentQuery, this.chartLabels, this.chartData, type, subType, _config);
        }

        // Control if a cross table is executed
       // It is verified if the length of the variable axes

        const configCrossTable = this.panelChartConfig.config.getConfig()

        if(subType === 'crosstable'){

            if(config===null){

                if(Object.keys(this.copyConfigCrossTable).length !== 0) {
                    this.axes = this.copyConfigCrossTable['ordering'][0].axes;
                    configCrossTable['ordering'] = [{axes: this.axes}];

                } else {
                    this.axes = this.initAxes(this.currentQuery);
                    configCrossTable['ordering'] = [{axes: this.axes}];
                }


            } else {

                if(config['config']['ordering'] === undefined) {
                    this.axes = this.initAxes(this.currentQuery);
                } else {
                    if(config['config']['ordering'].length===0) {
                        this.axes = this.initAxes(this.currentQuery);
                    } else {
                        this.axes = config['config']['ordering'][0]['axes']
                    }
                }
            }

        }

    }

    /**
     * @return current chart layout
     */
    public getChartStyles( chart: string) {
        if (this.panel.content && this.panel.content.chart === chart) {

            if(chart === 'crosstable' && Object.keys(this.copyConfigCrossTable).length !== 0) {
                return new ChartConfig(this.copyConfigCrossTable);
            } else {
                return new ChartConfig(this.panel.content.query.output.config);
            }

        } else {
            return null;
        }
    }

    public getUserSelectedTable(): any {
        let selectedTable: any;
        if (this.selectedQueryMode !== 'EDA2') {
          selectedTable = this.tablesToShow.filter(table => table.table_name === this.userSelectedTable)[0];
          if (!selectedTable) selectedTable = this.tablesToShow.filter(table => table.table_name === this.userSelectedTable.split('.')[0])[0];
        } else {
          selectedTable = this.tables.find((table) => table.table_name === this.userSelectedTable);
        }

        return selectedTable;
    }

    /**
     *
     */
    public onTableInputKey(event: any) {
        this.setTablesData();
        if (event.target.value) {
            this.tablesToShow = this.tablesToShow
                .filter(table => table.display_name.default.toLowerCase().includes(event.target.value.toLowerCase()));
        }

    }

    public onColumnInputKey(event: any) {
        if (!_.isNil(this.userSelectedTable)) {
            const selectedTable = this.getUserSelectedTable();
            PanelInteractionUtils.loadColumns(this, selectedTable) ;
            if (event.target.value) {
                this.columns = this.columns
                    .filter(col => col.display_name.default.toLowerCase().includes(event.target.value.toLowerCase()));
            }
        }
    }

    /**
     * Move column with drag and drop
     * @param event
     */
    public drop(event: CdkDragDrop<string[]>) {
        if (event.previousContainer === event.container) {
            //Reordeno
            moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
        } else {
            transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
            //obor dialeg o filre
            const column = <Column><unknown>event.container.data[event.currentIndex];
            if(event.container.element.nativeElement.className.toString().includes('select-list')) {
                this.moveItem(column);
                this.openColumnDialog(column);
            } else {
                this.openColumnDialog(column, true);
                // Trec la agregació si puc.
                try{
                    const c:Column = <Column><unknown>event.container.data[event.currentIndex];
                    c.aggregation_type.forEach( e=> e.selected = false);
                    c.aggregation_type.map( e=> e.value == 'none'? e.selected = true:true );
                }catch(e){
                    console.error(e)
                    throw e;
                }
            }
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

        if (column.table_id !== this.rootTable?.table_name) {
            column.joins = (column.joins||[]).length == 0 ? this.nodeJoins[this.nodeJoins.length-1] : column.joins;
        }

        const p = {
            selectedColumn: _.cloneDeep(column),
            currentQuery: this.currentQuery,
            inject: this.inject,
            panel: this.panel,
            table: this.findTable(column.table_id)?.display_name?.default,
            filters: this.selectedFilters
        };

        if (!isFilter) {
            this.configController = new EdaDialogController({
                params: p,
                close: (event, response) => {
                    if (response.duplicated) {
                        this.currentQuery.push(response.column);
                        this.configController = undefined;
                        setTimeout(() => this.openColumnDialog(response.column), 100);
                    } else if (response.length > 0) {
                        for (const f of response) {
                            if (_.isNil(this.selectedFilters.find(o => o.filter_id === f.filter_id))) {
                                this.selectedFilters.push(f);
                            }
                            if (f.removed) {
                                this.selectedFilters = _.filter(this.selectedFilters, o => o.filter_id !== f.filter_id);
                            }
                        }
                        this.configController = undefined;
                    }

                    for (const field of this.currentQuery) {
                        const aggregationSelected = field.aggregation_type.find((agg: any) => agg.selected)
                        if (aggregationSelected?.value) {
                            if (field.column_type === 'text' && aggregationSelected.value !== 'none') {
                                field.old_column_type = 'text';
                                field.column_type = 'numeric';
                            }

                            if (field.old_column_type === 'text' && aggregationSelected.value === 'none') {
                                field.column_type = 'text';
                                field.old_column_type = 'numeric';
                            }

                            if (field.column_type === 'date' && aggregationSelected.value !== 'none') {
                                field.old_column_type = 'date';
                                field.column_type = 'numeric';
                            }

                            if (field.old_column_type === 'date' && aggregationSelected.value === 'none') {
                                field.column_type = 'date';
                                field.old_column_type = 'numeric';
                            }
                        }
                    }

                    if (event === EdaDialogCloseEvent.NONE) {
                        this.configController = undefined;
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
    private findTable(t: string): any {
        return this.tables.find(table => table.table_name === t);
    }

    /**
     * Adds or Updates a globalFilter (called from dashboardComponent)
     * @param filter filter so set
     */
    public assertGlobalFilter(_filter: any) {
        const globalFilter = _.cloneDeep(_filter);

        if (_filter.pathList && _filter.pathList[this.panel.id]) {
            globalFilter.joins = _filter.pathList[this.panel.id].path
            globalFilter.filter_table = _filter.pathList[this.panel.id].table_id;
        }
        const filterInx = this.globalFilters.findIndex((gf: any) => gf.filter_id === globalFilter.filter_id)

        if (filterInx != -1) {
            this.globalFilters.splice(this.globalFilters[filterInx], 1);
            this.globalFilters.push(globalFilter);
        } else {
            this.globalFilters.push(globalFilter);
        }
    }

    /* Funcions generals de la pagina */
    public disableBtnSave = () => this.display_v.btnSave = true;

    public ableBtnSave = () => this.display_v.btnSave = false;

    onTopChange() {
        this.display_v.btnSave = true;
    }


    onJoinTypeChange(){
        this.display_v.joinType = true;
    }

    public openEditarConsulta(): void {
        this.display_v.page_dialog = true;
        this.ableBtnSave();
        PanelInteractionUtils.verifyData(this);
/* SDA CUSTOM  */       this.showHiddenColumn = false;
/* SDA CUSTOM  */       this.columns = this.columns.filter (c => !c.hidden) ;
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
            this.panelDeepCopy.query.query.filters = this.mergeFilters(this.panelDeepCopy.query.query.filters, this.globalFilters);

            this.filtredColumns = [];
            //Reassing sqlQuery -if exists
            this.currentSQLQuery = this.panelDeepCopy.query.query.SQLexpression;

            const queryMode = this.panelDeepCopy.query.query.queryMode;
            const modeSQL = this.panelDeepCopy.query.query.modeSQL;

            this.selectedQueryMode = _.isNil(queryMode) ? (modeSQL ? 'SQL' : 'EDA') : queryMode;
            this.rootTable = this.panelDeepCopy.rootTable;
        }

        this.loadChartsData(this.panelDeepCopy);
        this.userSelectedTable = undefined;
        this.tablesToShow = this.tables;
        this.display_v.chart = '';
        this.display_v.page_dialog = false;

        // After canceling, the value returns to false
        this.hiddenButtonExecuter = false
    }

    /**
     * Set new chart properties when editionChartPanel is closed
     * @param event
     * @param properties properties to set
     */
    public onCloseChartProperties(event, properties): void {
        if (!_.isEqual(event, EdaDialogCloseEvent.NONE)) {
            if (properties) {

                this.graficos = {};
                this.graficos = _.cloneDeep(properties);
                this.panel.content.query.output.config = { colors: this.graficos.chartColors, chartType: this.graficos.chartType };
                const layout = new ChartConfig(new ChartJsConfig(this.graficos.chartColors, this.graficos.chartType, this.graficos.addTrend, this.graficos.addComparative, this.graficos.showLabels, this.graficos.showLabelsPercent,this.graficos.numberOfColumns));

                this.renderChart(this.currentQuery, this.chartLabels, this.chartData, this.graficos.chartType, this.graficos.edaChart, layout);
            }
            //not saved alert message
            this.dashboardService._notSaved.next(true);
        }
        this.chartController = undefined;
    }

    public onCloseTableProperties(event, properties: TableConfig): void {
        if (!_.isEqual(event, EdaDialogCloseEvent.NONE)) {
            if (properties) {
                this.panel.content.query.output.config = properties;
                const config = new ChartConfig(properties);

                this.renderChart(this.currentQuery, this.chartLabels, this.chartData, this.graficos.chartType, this.graficos.edaChart, config);

            }
            //not saved alert message
            this.dashboardService._notSaved.next(true);
        }
        this.tableController = undefined;
    }

    public onCloseMapProperties(event, response: { color: string, logarithmicScale: boolean, legendPosition: string }): void {
        if (!_.isEqual(event, EdaDialogCloseEvent.NONE)) {
            this.panel.content.query.output.config.color = response.color;
            this.panel.content.query.output.config.logarithmicScale = response.logarithmicScale;
            this.panel.content.query.output.config.legendPosition = response.legendPosition;
            const config = new ChartConfig(this.panel.content.query.output.config);
            this.renderChart(this.currentQuery, this.chartLabels, this.chartData, this.graficos.chartType, this.graficos.edaChart, config);
            this.dashboardService._notSaved.next(true);
        }
        this.mapController = undefined;
    }

    public onCloseSankeyProperties(event, response): void {
        if (!_.isEqual(event, EdaDialogCloseEvent.NONE)) {

            this.panel.content.query.output.config.colors = response.colors;
            const config = new ChartConfig(this.panel.content.query.output.config);
            this.renderChart(this.currentQuery, this.chartLabels, this.chartData, this.graficos.chartType, this.graficos.edaChart, config);

            this.dashboardService._notSaved.next(true);

        }
        this.sankeyController = undefined;
    }

    public onCloseTreeMapProperties(event, response): void {
        if (!_.isEqual(event, EdaDialogCloseEvent.NONE)) {

            this.panel.content.query.output.config.colors = response.colors;
            const config = new ChartConfig(this.panel.content.query.output.config);
            this.renderChart(this.currentQuery, this.chartLabels, this.chartData, this.graficos.chartType, this.graficos.edaChart, config);

            this.dashboardService._notSaved.next(true);

        }
        this.treeMapController = undefined;
    }

    public onCloseFunnelProperties(event, response): void {
        if (!_.isEqual(event, EdaDialogCloseEvent.NONE)) {

            this.panel.content.query.output.config.colors = response.colors;
            const config = new ChartConfig(this.panel.content.query.output.config);
            this.renderChart(this.currentQuery, this.chartLabels, this.chartData, this.graficos.chartType, this.graficos.edaChart, config);

            this.dashboardService._notSaved.next(true);

        }
        this.funnelController = undefined;
    }

    public onCloseBubblechartProperties(event, response): void {
        if (!_.isEqual(event, EdaDialogCloseEvent.NONE)) {
            this.panel.content.query.output.config.colors = response.colors;
            const config = new ChartConfig(this.panel.content.query.output.config);
            this.renderChart(this.currentQuery, this.chartLabels, this.chartData, this.graficos.chartType, this.graficos.edaChart, config);
            this.dashboardService._notSaved.next(true);
        }
        this.bubblechartController = undefined;
    }





    public onCloseScatterProperties(event, response): void {
        if (!_.isEqual(event, EdaDialogCloseEvent.NONE)) {

            this.panel.content.query.output.config.colors = response.colors;
            const config = new ChartConfig(this.panel.content.query.output.config);
            this.renderChart(this.currentQuery, this.chartLabels, this.chartData, this.graficos.chartType, this.graficos.edaChart, config);
            this.dashboardService._notSaved.next(true);

        }
        this.scatterPlotController = undefined;
    }
    public onCloseSunburstProperties(event, response): void {
        if (!_.isEqual(event, EdaDialogCloseEvent.NONE)) {
            this.panel.content.query.output.config.colors = response.colors;
            const config = new ChartConfig(this.panel.content.query.output.config);
            this.renderChart(this.currentQuery, this.chartLabels, this.chartData, this.graficos.chartType, this.graficos.edaChart, config);
            this.dashboardService._notSaved.next(true);
        }
        // Fa que desapareixi el dialeg
        this.sunburstController = undefined;
    }
    public onCloseKnobProperties(event, response): void {
        if (!_.isEqual(event, EdaDialogCloseEvent.NONE)) {

            this.panel.content.query.output.config = response;
            const config = new ChartConfig(this.panel.content.query.output.config);
            this.renderChart(this.currentQuery, this.chartLabels, this.chartData, this.graficos.chartType, this.graficos.edaChart, config);

            this.dashboardService._notSaved.next(true);

        }
        this.knobController = undefined;
    }

    public onCloseLinkDashboardProperties(event, response: LinkedDashboardProps): void {

        if (!_.isEqual(event, EdaDialogCloseEvent.NONE)) {

            this.panel.linkedDashboard = response ? true : false;
            this.panel.linkedDashboardProps = response;
            this.renderChart(
                this.currentQuery, this.chartLabels, this.chartData,
                this.graficos.chartType, this.graficos.edaChart, ChartsConfigUtils.setConfig(this)
            );

            this.dashboardService._notSaved.next(true);
        }

        this.linkDashboardController = undefined;
    }

    public onCloseKpiProperties(event, response): void {
        if (!_.isEqual(event, EdaDialogCloseEvent.NONE)) {
            this.panel.content.query.output.config.alertLimits = response.alerts;
            this.panel.content.query.output.config.sufix = response.sufix;
            const config = new ChartConfig(this.panel.content.query.output.config);
            this.renderChart(this.currentQuery, this.chartLabels, this.chartData, this.graficos.chartType, this.graficos.edaChart, config);
            this.dashboardService._notSaved.next(true);
        }
        this.kpiController = undefined;
    }

    public onClosedynamicTextProperties(event, response): void {
        if (!_.isEqual(event, EdaDialogCloseEvent.NONE)) {
            const config = new ChartConfig(response.color);
            this.renderChart(this.currentQuery, this.chartLabels, this.chartData, this.graficos.chartType, this.graficos.edaChart, config);
            this.dashboardService._notSaved.next(true);
        }
        this.dynamicTextController = undefined;
    }

    public handleTabChange(event: any): void {
        this.hiddenButtonExecuter = !this.hiddenButtonExecuter;

        this.index = event.index;
        if (this.index === 1) {
            const content = this.panel.content;
            /**Reload  to render, needs timeOut for whatever reason :/  */
            if (content &&
                (
                    content.chart === 'coordinatesMap'
                    || content.chart === 'geoJsonMap'
                    || content.chart === 'parallelSets'
                    || content.chart === 'treeMap'
                    || content.chart === 'scatterPlot'
                    || content.chart === 'funnel'
                    || content.chart === 'knob'
                    || content.chart === 'sunburst'
                    || content.chart === 'bubblechart'
                    || content.chart === 'dynamicText')
            ) {

                setTimeout(() => {
                    const config = ChartsConfigUtils.recoverConfig(content.chart, content.query.output.config);
                    this.changeChartType(content.chart, content.edaChart, config);
                })
            }
        }
    }

    public onResize(event) {
        this.display_v.responsive = event.currentTarget.innerWidth <= 1440;
    }

    /** Run query From dashboard component */
    public runQueryFromDashboard = (globalFilters: boolean) => QueryUtils.runQuery(this, globalFilters);

    /**
    * Función que inicializa el axes en su forma básica --> Tabla cruzada básica.
    */
    public initAxes(currenQuery) {

        let currenQueryCopy = [...currenQuery];

        let vx = currenQuery.find( (v:any) => v.column_type==='text' || v.column_type==='date')
        let objx = {}
        let itemX = []
        let indexX

        if(vx === undefined) {
            indexX = currenQueryCopy.findIndex((v:any) => v.column_type==='numeric');
            vx = currenQueryCopy.find( (v:any) => v.column_type==='numeric')
            objx = {column_name: vx.column_name, column_type: vx.column_type, description: vx.display_name.default}
            itemX = [objx]
            if (indexX !== -1) {
                currenQueryCopy.splice(indexX, 1); // Elimina el elemento encontrado
            }
        } else {
            objx = {column_name: vx.column_name, column_type: vx.column_type, description: vx.display_name.default}
            itemX = [objx]
        }


        let itemY = [];
        currenQueryCopy.forEach( (v:any) => {
            if(v.column_type!=='numeric'){
                itemY.push({column_name: v.column_name, column_type: v.column_type, description: v.display_name.default})
            }
        })
        itemY.shift()

        let itemZ = [];
        currenQueryCopy.forEach( (v:any) => {
            if(v.column_type==='numeric'){
                itemZ.push({column_name: v.column_name, column_type: v.column_type, description: v.display_name.default})
            }
        })

        if(itemY.length===0){
            itemY.push(itemZ[0]);
            itemZ.shift();
        }

        return [{ itemX: itemX, itemY: itemY, itemZ: itemZ }]


    }

    /**
    * Runs actual query when execute button is pressed to check for heavy queries
    */
    public runManualQuery = () => {
        this.hiddenButtonExecuter = true;
        // isNewAxes --> Verifica si la construcción del axes es nueva.
        QueryUtils.runManualQuery(this)
    };

    public moveItem = (column: any) => {
        PanelInteractionUtils.moveItem(this, column);

        if (this.selectedQueryMode == 'EDA2' && this.currentQuery.length === 1) {
            PanelInteractionUtils.loadTableNodes(this);
       }
    }

    public searchRelations = (c: Column) => PanelInteractionUtils.searchRelations(this, c);

    public loadColumns = (table: any) => PanelInteractionUtils.loadColumns(this, table);

    public removeColumn = (c: Column, list?: string, event?: Event) => PanelInteractionUtils.removeColumn(this, c, list);

    public getOptionDescription = (value: string): string => EbpUtils.getOptionDescription(value);

    public getOptionIcon = (value: string): string => EbpUtils.getOptionIcon(value);

    public chartType = (type: string): number => EbpUtils.chartType(type);

    public getTooManyDataDescription = ():
        string => $localize`:@@tooManyValuestext:Hay demasiados valores para este gráfico. Agrega o filtra los datos para poder visualizarlos mejor.`

    public getChartType() {
        if (this.panel.content) {
            return this.panel.content.chart;
        } else return null;
    }

    /** duplica un patell del dashboard i el posiciona un punt per sota del origina./ */
    public duplicatePanel(): void {
        let duplicatedPanel =   _.cloneDeep(this.panel, true);
        duplicatedPanel.id = this.fileUtiles.generateUUID();
        duplicatedPanel.y = duplicatedPanel.y+1;
        this.duplicate.emit(duplicatedPanel);
    }


    public removePanel(): void {
        this.remove.emit(this.panel.id);
    }


    public showDescription(event): void {
        this.description = event.description.default;
    }

    public async getQuery($event) {

        this.display_v.minispinnerSQL = true;
        this.queryFromServer = null;

        this.op.toggle($event);

        const query = QueryUtils.initEdaQuery(this);
        let serverQuery = await QueryUtils.getQueryFromServer(this, query);

        let whereIndex = serverQuery.lastIndexOf('where 1 = 1');
        const TO_REPLACE_SIZE = 16;
        if (whereIndex >= 0) {
            serverQuery = serverQuery.substring(0, whereIndex - 1) + '\nwhere ' + serverQuery.substring(whereIndex + TO_REPLACE_SIZE, serverQuery.length);
        }
        let length = serverQuery.length;

        for (let i = 0; i < length; i++) {
            if (serverQuery[i] === '\n') {
                serverQuery = serverQuery.slice(0, i) + " " + serverQuery.slice(i);
                length++;
                i++;
            }
        }
        this.display_v.minispinnerSQL = false;
        this.queryFromServer = serverQuery;
    }

    public migrateQuery() {
        this.currentSQLQuery = this.queryFromServer;
        this.queryFromServer = '';
        this.currentQuery = [];
        this.filtredColumns = [];
        this.selectedQueryMode = 'SQL';
    }

    public changeQueryMode(): void {
        this.index = 0;
        this.currentSQLQuery = '';
        this.currentQuery = [];
        this.filtredColumns = [];
        this.display_v.btnSave = true;
        this.rootTable = undefined;
        this.action.emit({ code: 'QUERYMODE', data: { queryMode: this.selectedQueryMode, panel: this.panel } })
    }

/** Esta función permite al switch en la columna atributos ver u ocultar las columnas con el atributo hidden */
/* SDA CUSTOM  */    public async changeHiddenMode(): Promise<void> {
/* SDA CUSTOM  */       this.showHiddenColumn = !this.showHiddenColumn;
/* SDA CUSTOM  */       const selectedTable = this.getUserSelectedTable();
/* SDA CUSTOM  */       this.loadColumns(selectedTable);
/* SDA CUSTOM  */    }


    public accopen(e) { }

    /** This funciton return the display name for a given table. Its used for the query resumen      */
    public getNiceTableName(table: any) {
        return this.tables.find( t => t.table_name === table)?.display_name?.default;
    }

    public getColumnJoins(column: Column) {
        let pathStr = '';
        if (column.joins?.length > 0) {


            for (const path of column.joins) {
                const table = (path[0]||'');
                let tableName = this.getNiceTableName(table);
                if (!tableName) tableName = this.getNiceTableName(table.split('.')[0]);

                pathStr += ` ${tableName} <i class="pi pi-angle-right"></i> `;
            }
        } else if (column.valueListSource) {
            const tableName = this.getNiceTableName(column.valueListSource.target_table);
            if (tableName) pathStr += ` ${tableName} → `;
        }


        return pathStr
    }

    public getFilterJoins(filter: any) {
        let pathStr = '';
        if (filter.joins?.length > 0) {

            for (const path of filter.joins) {
                const table = (path[0]||'');
                let tableName = this.getNiceTableName(table);
                if (!tableName) tableName = this.getNiceTableName(table.split('.')[0]);

                pathStr += ` ${tableName} <i class="pi pi-angle-right"></i> `;
            }
        } else if (filter.valueListSource) {
            const tableName = this.getNiceTableName(filter.valueListSource.target_table);
            if (tableName) pathStr += ` ${tableName} → `;
        }

        return pathStr
    }

    public getDisplayAggregation(aggregation: any) {
        let str = '';
        const aggregationText = aggTypes.filter(agg => agg.value === aggregation.value)[0].label
        str = `&nbsp<strong>( ${aggregationText} )</strong>&nbsp`;
        return str;
    }

    public getDisplayFilterStr(filter: any) {

        let str = '';

        const table = this.findTable(filter.filter_table.split('.')[0]);

        if (table && table.table_name) {
            const tableName = table.display_name?.default;
            const columnName = table.columns.find((c) => c.column_name == filter.filter_column)?.display_name?.default;

            const values = filter.filter_elements[0]?.value1;
            const values2 = filter.filter_elements[1]?.value2;

            const whereMessage: string = $localize`:@@whereMessage: Filtro sobre todos los registros`;
            const havingMessage: string = $localize`:@@havingMessage: Filtro sobre los resultados`;
        
            // Nomenclatura:  WHERE => Filtro sobre todos los registros | HAVING => Filtro sobre los resultados
            const filterBeforeGroupingText = filter.filterBeforeGrouping ? whereMessage : havingMessage

            // Agregación
            const aggregation = filter.aggregation_type;

            let valueStr = '';

            if (values) {
                if (values.length == 1 && !['in', 'not_in'].includes(filter.filter_type)) {
                    valueStr = `"${values[0]}"`;
                }  else if (values.length > 1 || ['in', 'not_in'].includes(filter.filter_type)) {
                    valueStr = `[${values.map((v: string) => (`"${v}"`) ).join(', ')}]`;
                }

                if (values2) {
                    if (values2.length == 1) {
                        valueStr = `"${values[0]}" - "${values2[0]}"`;
                    }  else if (values2.length > 1) {
                        valueStr = `AND [${values2.map((v: string) => (`"${v}"`) ).join(', ')}]`;
                    }
                }
            }

            let aggregationLabel = '';
            if(aggTypes.filter(agg => agg.value === aggregation).length !== 0) aggregationLabel = aggTypes.filter(agg => agg.value === aggregation)[0].label;

            // Agregado de internacionalización del between
            let filterType = filter.filter_type
            if(filterType === 'between') filterType = this.textBetween;

            str = `<strong>${tableName}</strong>&nbsp[${columnName}]&nbsp<strong>${filterType}</strong>&nbsp${valueStr}  &nbsp<strong>${filterBeforeGroupingText}</strong>&nbsp - ${this.aggregationText}: &nbsp<strong>${aggregationLabel}</strong>&nbsp`;
        }

        return str;
    }



/* SDA CUSTOM */     public showIdForHiddenMode() {
/* SDA CUSTOM */         if (this.inject.dataSource._id == "111111111111111111111111") {
/* SDA CUSTOM */             this.showHiddId = true;
/* SDA CUSTOM */         } else {
/* SDA CUSTOM */             this.showHiddId = false;
/* SDA CUSTOM */         }
/* SDA CUSTOM */     }

    public onWhatIfDialog(): void {
        this.display_v.whatIf_dialog = true;
    }

    public onCloseWhatIfDialog(): void {
        this.display_v.whatIf_dialog = false;
    }

    public disableRunQuery(): boolean {
        let disable = false;

        if (this.selectedQueryMode !== 'SQL') {
            if (this.currentQuery.length === 0 && this.index === 0) {
                disable = true;
            }
        } else {
            if (_.isNil(this.sqlOriginTables)) {
                disable = true;
            }
        }

        return disable;
    }

    /**
    * Funcion que reordena el arreglo currentQuery segun el nuevo valor de ordenamiento de la variable axes devuelta por el componete drag-drop
    */
    public newCurrentQuery(currenQuery, axes) {

        let newCurrentQuery = []

        axes[0].itemX.forEach(e => {
            currenQuery.forEach(cq => {
                if(e.description===cq.display_name.default) {
                    newCurrentQuery.push(cq);
                    return;
                }
            });
        });

        axes[0].itemY.forEach(e => {
            currenQuery.forEach(cq => {
                if(e.description===cq.display_name.default) {
                    newCurrentQuery.push(cq);
                    return;
                }
            });
        });

        axes[0].itemZ.forEach(e => {
            currenQuery.forEach(cq => {
                if(e.description===cq.display_name.default) {
                    newCurrentQuery.push(cq);
                    return;
                }
            });
        });

        return newCurrentQuery;

    }

    // Funcion que recibe la variable axes moficicada por el componente drag-drop
    public newAxesOrdering(newAxes) {
        this.axes = newAxes;
        this.newAxesChanged = true; // Indica que se utilizara la tabla cruzada generica
        const config = this.panelChartConfig.config.getConfig(); // Adquiera la configuración config
        this.currentQuery = this.newCurrentQuery(this.currentQuery, newAxes); // Reordeno el currentQuery
        config['ordering'] = [{axes: newAxes}]; // Agrego el nuevo axes a la config
        this.copyConfigCrossTable = JSON.parse(JSON.stringify(config));;
        QueryUtils.runManualQuery(this) // Ejecutando con la nueva configuracion de currentQuery
    }

}
