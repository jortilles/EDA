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
import { SelectButtonModule } from 'primeng/selectbutton';
import { display } from 'html2canvas/dist/types/css/property-descriptors/display';

export interface IPanelAction {
    code: string;
    data: any;
}

@Component({
    selector: 'eda-blank-panel',
    templateUrl: './eda-blank-panel.component.html',
    styleUrls: []
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
    public hiddenColumn: number;


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
    public ptooltipHiddenColumn: string = $localize`:@@hiddenColumn:Al cambiar de modo se verán las columnas marcadas como ocultas`;
    public ptooltipViewQuery: string = $localize`:@@ptooltipViewQuery:Ver consulta SQL`

    /** Query Variables */
    public tables: any[] = [];
    public tablesToShow: any[] = [];
    public columns: any[] = [];
    public aggregationsTypes: any[] = [];
    public filtredColumns: Column[] = [];
    public ordenationTypes: OrdenationType[];
    public currentQuery: any[] = [];
    public currentSQLQuery: string = '';
    public queryLimit: number;
    public joinType: string = 'inner';

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

    public queryFromServer: string = '';
    public showHiddId: boolean;

    // join types 
    joinTypeOptions: any[] = [
        { icon: 'pi pi-align-left', joinType: 'left' },
        { icon: 'pi pi-align-center', joinType: 'inner' },
        { icon: 'pi pi-align-right', joinType: 'right' }
        //,         { icon: 'pi pi-align-justify', joinType: 'full outer' }
    ];


    /**panel chart component configuration */
    public panelChartConfig: PanelChart = new PanelChart();

    constructor(
        public queryBuilder: QueryBuilderService,
        public fileUtiles: FileUtiles,
        private formBuilder: UntypedFormBuilder,
        public dashboardService: DashboardService,
        public chartUtils: ChartUtilsService,
        public alertService: AlertService,
        public spinnerService: SpinnerService,
        public groupService: GroupService,
        public userService: UserService
    ) {
        this.initializeBlankPanelUtils();
        this.initializeInputs();

    }

    ngOnInit(): void {

        this.index = 0;
        this.modeSQL = false;
        this.hiddenColumn = 0;
        
        this.showIdForHiddenMode()
        this.setTablesData();
        
        /**If panel comes from server */
        if (this.panel.content) {
            try{
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
            }catch(e){
                console.error('Error loading panen conent.....');
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

    getEditMode() {
        const user = sessionStorage.getItem('user');
        const userName = JSON.parse(user).name;
        return (userName !== 'edaanonim' && !this.inject.isObserver);
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
        this.tables = _.cloneDeep(tables.allTables);
        this.tablesToShow = _.cloneDeep(tables.tablesToShow);
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
            try{
                const queryTables = [...new Set(panelContent.query.query.fields.map((field) => field.table_id))];
                for (const idTable of queryTables) {
                    const table = this.tables.find(t => t.table_name === idTable);
                    PanelInteractionUtils.loadColumns(this, table,  this.hiddenColumn);
                    panelContent.query.query.fields.forEach((el) => {
                        const column = this.columns.find(c => c.table_id === el.table_id &&  c.column_name === el.column_name && c.display_name.default === el.display_name);
                        if (column) PanelInteractionUtils.moveItem(this, column);
                        else {
                            if(el.table_id === idTable ){
                                let duplicatedColumn = _.cloneDeep(  this.currentQuery.find(c =>  c.table_id === el.table_id && c.column_name === el.column_name ) ); // es una columna duplicada que es a la consulta
                                if(!duplicatedColumn){
                                    duplicatedColumn = _.cloneDeep(  this.columns.find(c => c.table_id === el.table_id &&  c.column_name === el.column_name )  ); // es una columna duplicada sense original a la consulta
                                }
                                if(duplicatedColumn){
                                    duplicatedColumn.display_name.default = el.display_name;
                                    this.currentQuery.push(duplicatedColumn); // Moc la columna directament perque es una duplicada.... o no....
                                }
                            }
                            
                        }
                    });
                }
                this.columns = this.columns.filter((c) => !c.isdeleted);
            }catch(e){
                console.error('Error loading columns to define query in blank panel compoment........ Do you have deleted any column?????');
                console.error(e);
            }
        }

        this.queryLimit = panelContent.query.query.queryLimit;

        try {
            PanelInteractionUtils.handleFilters(this, panelContent.query.query);
            PanelInteractionUtils.handleFilterColumns(this, panelContent.query.query.filters,panelContent.query.query.fields);
 
        }catch(e){
            console.log('Error loading filters to define query in blank panel compoment........ Do you have deleted any column?????');
            console.log(e);
        }
       


        PanelInteractionUtils.handleCurrentQuery(this);

        this.chartForm.patchValue({
            chart: this.chartUtils.chartTypes.find(o => o.subValue === panelContent.edaChart)
        });

        PanelInteractionUtils.verifyData(this);

        const config = ChartsConfigUtils.recoverConfig(panelContent.chart, panelContent.query.output.config);
        this.changeChartType(panelContent.chart, panelContent.edaChart, config);

        this.display_v.saved_panel = true;
        this.display_v.minispinner = false;


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

    }

    public initObjectQuery(modeSQL: boolean) {
        if (modeSQL) {
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

    public onChartClick(event: any): void {
        const config = this.panelChart.getCurrentConfig();
        if (config?.chartType == 'doughnut') {
            this.action.emit({ code: 'ADDFILTER', data: {...event, panel: this.panel} });
        }
    }

    /**
     * Changes chart type 
     * @param type chart type
     * @param content panel content
     */
    public changeChartType(type: string, subType: string, config?: ChartConfig) {
        this.graficos = {};
        let allow = _.find(this.chartTypes, c => c.value === type && c.subValue == subType);
        this.display_v.chart = type;
        this.graficos.chartType = type;
        this.graficos.edaChart = subType;
        this.graficos.addTrend = config && config.getConfig() ? config.getConfig()['addTrend'] : false;
        this.graficos.numberOfColumns = config && config.getConfig() ? config.getConfig()['numberOfColumns'] : null;

        if (!_.isEqual(this.display_v.chart, 'no_data') && !allow.ngIf && !allow.tooManyData) {
            this.panelChart.destroyComponent();
            const _config = config || new ChartConfig(ChartsConfigUtils.setVoidChartConfig(type));
            this.renderChart(this.currentQuery, this.chartLabels, this.chartData, type, subType, _config);
        }

    }

    /**
     * @return current chart layout
     */
    public getChartStyles( chart: string) {
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
        this.setTablesData();
        if (event.target.value) {
            this.tablesToShow = this.tablesToShow
                .filter(table => table.display_name.default.toLowerCase().includes(event.target.value.toLowerCase()));
        }

    }

    public onColumnInputKey(event: any) {
        if (!_.isNil(this.userSelectedTable)) {
            PanelInteractionUtils.loadColumns(this, this.tablesToShow.filter(table => table.table_name === this.userSelectedTable)[0], this.hiddenColumn);
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
            selectedColumn: _.cloneDeep(column),
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
                    if (response.duplicated) {
                        this.currentQuery.push(response.column);
                        this.configController = undefined;
                        setTimeout(() => this.openColumnDialog(response.column), 100);
                    } else if (response.length > 0) {
                        response.forEach(f => {
                            if (_.isNil(this.selectedFilters.find(o => o.filter_id === f.filter_id))) {
                                this.selectedFilters.push(f);
                            }
                            if (f.removed) {
                                this.selectedFilters = _.filter(this.selectedFilters, o => o.filter_id !== f.filter_id);
                            }
                        });

                        this.configController = undefined;
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
    private findTable(t: string): string {
        return this.tables.find(table => table.table_name === t).display_name.default;
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

        this.hiddenColumn = 1;
        this.columns = this.columns.filter (c => !c.hidden) ;
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
            this.modeSQL = this.panelDeepCopy.query.query.modeSQL;
        }

        this.loadChartsData(this.panelDeepCopy);
        this.userSelectedTable = undefined;
        this.tablesToShow = this.tables;
        this.display_v.chart = '';
        // this.index = this.modeSQL ? 1 : 0;
        this.display_v.page_dialog = false;
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
    * Runs actual query when execute button is pressed to check for heavy queries
    */
    public runManualQuery = () => QueryUtils.runManualQuery(this);

    public moveItem = (column: any) => PanelInteractionUtils.moveItem(this, column);

    public searchRelations = (c: Column) => PanelInteractionUtils.searchRelations(this, c);

    public loadColumns (table: any)  {

        PanelInteractionUtils.loadColumns(this, table, this.hiddenColumn);        
    } 

    public removeColumn = (c: Column, list?: string) => PanelInteractionUtils.removeColumn(this, c, list);

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

    public switchAndBuildQuery() {

        if (!this.modeSQL) return QueryUtils.initEdaQuery(this);
        else return QueryUtils.initSqlQuery(this);
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
        this.modeSQL = true;
    }

    public async changeQueryMode(): Promise<void> {

        this.currentSQLQuery = '';
        this.currentQuery = [];
        this.filtredColumns = [];
        this.display_v.btnSave = true;
    }

    /** Esta función permite al switch en la columna atributos ver u ocultar las columnas con el atributo hidden */
    public async changeHiddenMode(): Promise<void> {
        if(this.hiddenColumn == 0){
            this.hiddenColumn = 1 ;
        }else{
            this.hiddenColumn = 0;
        }
        let table = this.tablesToShow.find(table => table.table_name === this.userSelectedTable)
        this.loadColumns(table);
    }

    public accopen(e){

    }
    /** This funciton return the display name for a given table. Its used for the query resumen      */
    public getNiceTableName(  table ){
         return this.tables.find( t => t.table_name === table).display_name.default;
    }

    public showIdForHiddenMode() {
        
        if (this.inject.dataSource._id == "111111111111111111111111") {
            this.showHiddId = true;
        } else {
            this.showHiddId = false;
        }
     
    }
}