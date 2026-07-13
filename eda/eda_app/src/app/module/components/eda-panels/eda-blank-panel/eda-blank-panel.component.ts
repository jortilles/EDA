// Angular
import { Component, Input, Output, EventEmitter, ViewChild, OnInit, inject, computed, CUSTOM_ELEMENTS_SCHEMA, ChangeDetectorRef, ElementRef } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { DragDropModule, CdkDrag, CdkDragDrop, moveItemInArray, transferArrayItem, copyArrayItem } from '@angular/cdk/drag-drop';
import { ActivatedRoute } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import * as _ from 'lodash';
import Swal from 'sweetalert2';
// PrimeNG
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, SharedModule } from 'primeng/api';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TreeModule } from 'primeng/tree';
// Eda config
import { AGG_TYPES, NULL_VALUE, EMPTY_VALUE, SHOW_LOCK_IN_PANEL_HEADER } from '@eda/configs/customizable/customizable_default';
import {Column, EdaPanel, InjectEdaPanel } from '@eda/models/model.index';

import { PanelChart } from './panel-charts/panel-chart';
import { PanelOptions } from './panel-utils/panel-menu-options';
import { TableConfig } from './panel-charts/chart-configuration-models/table-config';
import { ChartConfig } from './panel-charts/chart-configuration-models/chart-config';
import { ChartJsConfig } from './panel-charts/chart-configuration-models/chart-js-config';
import { KpiConfig } from './panel-charts/chart-configuration-models/kpi-config';
import { KpiDeviationConfig } from './panel-charts/chart-configuration-models/kpi-deviation-config';
import { DynamicTextConfig } from './panel-charts/chart-configuration-models/dynamicText-config';
import { LinkedDashboardProps } from '@eda/components/eda-panels/eda-blank-panel/link-dashboards/link-dashboard-props';
// Eda Services
import { EdaChartType, FilterType, OrdenationType} from '@eda/services/service.index';
import { DashboardService, ChartUtilsService, AlertService, SpinnerService, FileUtiles, QueryBuilderService, UserService } from '@eda/services/service.index';
import { GroupService } from '../../../../services/api/group.service';
import { QueryService } from '@eda/services/api/query.service';
import { IaFormStateService } from '@eda/services/shared/IaFormState.service'; 

// Standalone components
import { EdaDialog2Component, EdaDialogController, EdaContextMenu, EdaDialogCloseEvent, EdaContextMenuComponent} from '@eda/shared/components/shared-components.index';
import { FocusOnShowDirective } from '@eda/shared/directives/autofocus.directive';
import { EdaInputText } from '@eda/shared/components/eda-input/eda-input-text';
import { PanelChartComponent } from './panel-charts/panel-chart.component';
import { DragDropComponent } from '@eda/components/drag-drop/drag-drop.component';
import { ColumnDialogComponent } from '@eda/components/component.index';
import { FilterDialogComponent } from '@eda/components/component.index';
import { WhatIfDialogComponent } from '@eda/components/component.index';
import { FilterMapperDialog } from '@eda/components/filter-mapper-dialog/filter-mapper.dialog';
import { FilterMapperComponent } from '@eda/components/filter-mapper/filter-mapper.component';
import { ChatEdaAIComponent } from '@eda/components/ebp-chatgpt/chat-eda-ai.component';
import { LinkDashboardsComponent } from '@eda/components/component.index';
import { DashboardPage } from 'app/module/pages/dashboard/dashboard.page';
import { EdadynamicTextComponent } from '@eda/components/component.index';
import { EdaTitlePanelComponent } from '@eda/components/component.index';
import { PanelMenuModule } from 'primeng/panelmenu';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { ChartTypeSelectorDialogComponent } from './chart-type-selector-dialog/chart-type-selector-dialog.component';
import { PromptComponent } from '@eda/components/prompt/prompt.component';
import { FilterAndOrDialogComponent } from './filter-and-or-dialog/filter-and-or-dialog.component';
import { EdaFilterAndOrComponent } from '../../eda-filter-and-or/eda-filter-and-or.component';

// Panel Utils
import { TableUtils } from './panel-utils/tables-utils';
import { QueryUtils } from './panel-utils/query-utils';
import { EbpUtils } from './panel-utils/ebp-utils';
import { ChartsConfigUtils, CUSTOM_CHART_CONFIG_FIELDS } from './panel-utils/charts-config-utils';
import { PanelInteractionUtils } from './panel-utils/panel-interaction-utils';
import { NavigationUtils } from './panel-utils/navigation-utils';

//
import { CumSumAlertDialogComponent } from '@eda/components/component.index';
import { AlertDialogComponent } from '@eda/components/component.index';
import { IconComponent } from '@eda/shared/components/icon/icon.component';

// Tests
import { MapEditDialogComponent } from '@eda/components/component.index';
import { MapCoordDialogComponent } from '@eda/components/component.index';
import { ChartDialogComponent } from '@eda/components/component.index';
import { BubblechartDialog } from '@eda/components/component.index';
import { TreeTableDialogComponent } from '@eda/components/component.index';
import { SunburstDialogComponent } from '@eda/components/component.index';
import { ScatterPlotDialog } from '@eda/components/component.index';    
import { TreeMapDialog } from '@eda/components/component.index';
import { FunnelDialog } from '@eda/components/component.index';
import { KnobDialogComponent } from '@eda/components/component.index';
import { SankeyDialog } from '@eda/components/component.index';
import { dynamicTextDialogComponent } from '@eda/components/component.index';
import { TableDialogComponent } from '@eda/components/component.index';
import { TableGradientDialogComponent } from '@eda/components/component.index';
import { KpiEditDialogComponent } from '@eda/components/component.index';
import { DoughnutDialog } from '@eda/components/component.index';
import { PolarAreaDialog } from '@eda/components/component.index';
export interface IPanelAction {
    code: string;
    data: any;
}

interface ChatMessage {
    id?: string | number;
    role: 'user' | 'assistant' | 'system' | 'error';
    content: string;
    timestamp?: number;
}

const DIALOGS_COMPONENTS = [
    ChartDialogComponent,BubblechartDialog, MapCoordDialogComponent, MapEditDialogComponent,
    TreeTableDialogComponent, SunburstDialogComponent, TreeMapDialog, ScatterPlotDialog,
    FunnelDialog, KnobDialogComponent, SankeyDialog, dynamicTextDialogComponent, TableDialogComponent,
    TableGradientDialogComponent, AlertDialogComponent, KpiEditDialogComponent, DoughnutDialog, PolarAreaDialog
];
const ANGULAR_MODULES = [FormsModule, ReactiveFormsModule, CommonModule, NgClass, CumSumAlertDialogComponent];
const PRIMENG_MODULES = [ ButtonModule, DragDropModule, DropdownModule, TooltipModule, SharedModule, TreeModule, ProgressSpinnerModule, PanelMenuModule, OverlayPanelModule];
const STANDALONE_COMPONENTS = [
    EdaDialog2Component, WhatIfDialogComponent, ChatEdaAIComponent, FilterMapperComponent, EdadynamicTextComponent, EdaTitlePanelComponent,
    PanelChartComponent, EdaContextMenuComponent, FilterMapperDialog, ColumnDialogComponent, FilterDialogComponent, LinkDashboardsComponent,
    DragDropComponent, ChartTypeSelectorDialogComponent,
    IconComponent, FocusOnShowDirective, PromptComponent,
    FilterAndOrDialogComponent,
]
@Component({
    standalone: true,
    imports : [ STANDALONE_COMPONENTS,PRIMENG_MODULES, ANGULAR_MODULES, DIALOGS_COMPONENTS],
    selector: 'eda-blank-panel',
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    templateUrl: './eda-blank-panel.component.html',
    styleUrls: ['./eda-blank-panel.component.css'],
})
export class EdaBlankPanelComponent implements OnInit {
    /** Reference to the dashboard root element (used for image capture during Excel export) */
    public elRef = inject(ElementRef);

    @ViewChild('PanelChartComponent', { static: false }) panelChart: PanelChartComponent;
    @ViewChild('panelChartComponentPreview', { static: false }) panelChartPreview: PanelChartComponent;
    @ViewChild('op', { static: false }) op: any;
    @ViewChild(DragDropComponent) dragDrop: DragDropComponent;



    @Input() panelContent: any = {};
    @Input() panelText: any;
    @Input() dashboard: DashboardPage;
    @Input() panel: EdaPanel;
    @Input() inject: InjectEdaPanel;
    @Input() availableChatGpt: any;
    @Output() remove: EventEmitter<any> = new EventEmitter();
    @Output() duplicate: EventEmitter<any> = new EventEmitter();
    @Output() action: EventEmitter<IPanelAction> = new EventEmitter<IPanelAction>();
    @Output() panelConfigChanged: EventEmitter<any> = new EventEmitter<IPanelAction>();

    /** Properties injected into the dialog with chart-specific properties. */
    public configController: EdaDialogController;
    public filterController: EdaDialogController;
    public chartController: EdaDialogController;
    public tableController: EdaDialogController;
    public alertController: EdaDialogController;
    public cumsumAlertController : EdaDialogController;
    public mapController: EdaDialogController;
    public mapCoordController: EdaDialogController;
    public kpiController: EdaDialogController;
    public dynamicTextController: EdaDialogController;
    public sankeyController: EdaDialogController;
    public treeMapController: EdaDialogController;
    public funnelController:EdaDialogController;
    public doughnutController: EdaDialogController;
    public polarAreaController: EdaDialogController;
    public bubblechartController:EdaDialogController;
    public linkDashboardController: EdaDialogController;
    public scatterPlotController: EdaDialogController;
    public knobController: EdaDialogController;
    public sunburstController: EdaDialogController;
    public treeTableController: EdaDialogController;
    public contextMenu: EdaContextMenu;
    public lodash: any = _;

    // public screenWidth: number = window.innerWidth;  Used to display the screen width for debugging purposes.

    public dataSource: any;
    public isImported: boolean = false;
    public readonly: boolean = false;
    public extraStyles;
    public indextab = 0;

    public inputs: any = {};
    /**Dashbard emitter */
    // public actualSize : {litle:boolean, medium:boolean}

    /** Page variables */
    public titleClick: boolean = false;
    public descriptionClick: boolean = false;
    public title: string = '';
    // Display variables
    public display_v = {
        page_dialog: false, // page dialog
        saved_panel: false, // saved panel
        btnSave: false, // save button
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
        minispinnerSQL: false,
        advancedSetting: 0,
        filterMapperDialog: false,
        showQueryContainer: false,
        filterAndOr_dialog: false,
    };

    public index: number;
    public description: string;
    public chartForm: UntypedFormGroup;
    public previousChartForm: UntypedFormGroup;
    public userSelectedTable: string;

    /**Strings */
    public editQuery: string = $localize`:@@EditQuery:Editar consulta`;
    public editSQLQuery: string = $localize`:@@EditSQLQuery:EDITAR CONSULTA SQL`;

    public limitRowsInfo: string = $localize`:@@limitRowsInfo:Establece un Top n para la consulta`;
    public draggFields: string = $localize`:@@dragFields:Arrastre aquí los atributos que quiera ver en su panel`;
    public draggFilters: string = $localize`:@@draggFilters:Arrastre aquí los atributos sobre los que quiera filtrar`;
    public draggResultSorting: string = $localize`:@@draggFilters:Arrastre aquí los atributos sobre los que quiere ordenar`;
    public ptooltipSQLmode: string = $localize`:@@sqlTooltip:Al cambiar de modo perderás la configuración de la consulta actual`;
    public ptooltipViewQuery: string = $localize`:@@ptooltipViewQuery:Ver consulta SQL`
    public aggregationText: string = $localize`:@@aggregationText:Agregación`;
    public textBetween: string = $localize`:@@textBetween:Entre`
    /** Query Variables */
    public tables: any[] = [];
    public tablesToShow: any[] = [];
    public tablesToShowBase: any[] = [];
    public assertedTables: any[] = [];
    public columns: any[] = [];
    public aggregationsTypes: any[] = [];
    public filtredColumns: Column[] = [];
    public resultSortingColumns: any[] = [];
    public ordenationTypes: OrdenationType[];
    public currentQuery: any[] = [];
    public currentSQLQuery: string = '';
    public queryLimit: number = 5000; // 5.000 by default
    public groupByEnabled: boolean = true;
    public dynamicFilters: boolean = true;

    public queryModes: any[] = [
        { label: $localize`:@@PanelModeSelectorEDA:Modo EDA`, value: 'EDA' },
        { label: $localize`:@@PanelModeSelectorSQL:Modo SQL`, value: 'SQL' },
        { label: $localize`:@@PanelModeSelectorTree:Modo Árbol`, value: 'EDA2' }
    ];
    public selectedQueryMode: string = 'EDA';

    // Depreacted use selectedQueryMode instead of
    // public modeSQL: boolean;
    public sqlOriginTables: any[];
    public sqlOriginTable: any;
    public sqlIndicationOpenSection = 'general';

    /** Chart Variables */
    public chartTypes: EdaChartType[]; // All posible chartTypes
    public chartData: any[] = [];  // Data for Charts
    public chartLabels: string[] = []; // Labels for Charts
    public graficos: any = {}; // Inject for Charts
    public filterTypes: FilterType[];
    public selectedFilters: any[] = [];
    public globalFilters: any[] = [];
    public sortedFilters: any[] = [];
    public globalFiltersBackup: any[];
    public temporalSortedFilters: any[] = [];
    public filterValue: any = {};
    public tableInput: string;
    public columnInput: string;

    public loadingNodes: boolean = false;
    public rootTable: any;
    public tableNodes: any = [];
    public displayedTableNodes: any[] = [];
    public selectedTableNode: any;
    public nodeJoins: any[] = [];

    public color: any = { r: 255, g: 0, b: 0.3 };

    /*Deep copies for panel and color configuration to recover panel when edit changes are cancelled*/
    public panelDeepCopy: any = {};
    public colorsDeepCopy: any = {};

    public queryFromServer: string = '';
    
    // Message history.
    public promptMessages: ChatMessage[] = []; 

    // join types 
    joinTypeOptions: any[] = [
        { icon: 'pi pi-align-left', label: 'Left', joinType: 'left' },
        { icon: 'pi pi-align-center', label: 'Inner', joinType: 'inner' },
        { icon: 'pi pi-align-right', label: 'Right', joinType: 'right' }
    ];

    public joinType = this.joinTypeOptions[1].joinType; // default init in Inner

    
    /**panel chart component configuration */
    public panelChartConfig: PanelChart = new PanelChart();

    /* Navigation state is not saved at runtime. */
    public navState: Array<{
        rootKey: string;
        navPath: any[];
        currentIndex: number;
        navFilters: any[];
    }> = [];

    /* Date-based navigation state (runtime year → month → day) */
    public dateNavState: Array<{
        columnKey: string;
        initialFormat: string;
        formatChain: string[];
        currentFormatIndex: number;
        navFilters: any[];
    }> = [];

    
    public connectionProperties: any;

    // ChatGPT dialog
    public isVisibleEbpChatGpt = false;
    public dataChatGpt: any;
    public chartTypeSelectorController: EdaDialogController;

    // for the drag-drop component
    public axes:any[]=[]; 
    public newAxesChanged: boolean = false;
    public graphicType: string; // We extract the chart type at initialization and at runtime execution.
    public copyConfigCrossTable: any = {};
    public dragAndDropAvailable: boolean = false;

    private route = inject(ActivatedRoute);
    private formBuilder = inject(UntypedFormBuilder);
    private iaFormStateService = inject(IaFormStateService);


    public editingTitle: boolean = false;
    public promptAvailable = computed(() => this.iaFormStateService.formData().AVAILABLE);


    constructor(
        public queryBuilder: QueryBuilderService,
        public fileUtiles: FileUtiles,
        public dashboardService: DashboardService,
        public queryService: QueryService,
        public chartUtils: ChartUtilsService,
        public alertService: AlertService,
        public spinnerService: SpinnerService,
        public groupService: GroupService,
        public userService: UserService,
        private confirmationService: ConfirmationService,
        private cdr: ChangeDetectorRef,
    ) {
        this.initializeBlankPanelUtils();
        this.initializeInputs();
        this.connectionProperties = computed(() => this.route.snapshot.paramMap.get('cnproperties'));

        this.dashboardService.notSaved.subscribe(
            (data) => this.display_v.notSaved = data,
            (err) => this.alertService.addError(err)
        );
    }

    public async setPanelDataSource() {
        if (!this.dataSource) {
            const panelDataSource = this.panel.dataSource?._id;

            if (panelDataSource && panelDataSource !== this.inject.dataSource._id) {
                this.dataSource = await lastValueFrom(this.dashboardService.getDataSource(panelDataSource));
                this.isImported = true;
            } else {
                this.dataSource = this.inject.dataSource;
            }
        }
    }

    async ngOnInit() {
        this.index = 0;
        this.readonly = this.panel.readonly;
        if (this.panel.description === undefined) this.panel.description = '';

        await this.setTablesData();

        /**If panel comes from server */
        if (this.panel.content) {
            try {
                const contentQuery = this.panel.content.query;

                // Ensure compatibility with legacy dashboards where queryMode is not provided.
                const modeSQL = contentQuery.query.modeSQL;
                let queryMode = contentQuery.query.queryMode;

                if (!queryMode) {
                    queryMode = modeSQL ? 'SQL' : 'EDA';
                }

                this.selectedQueryMode = queryMode;

                if (queryMode == 'EDA2') {
                    this.rootTable = contentQuery.query.rootTable;
                }

                this.sortedFilters = contentQuery.query.sortedFilters || [];

            if (modeSQL || queryMode == 'SQL') {
                this.currentSQLQuery = contentQuery.query.SQLexpression;
                this.sqlOriginTable = this.sqlOriginTables.find(t => t.value === contentQuery.query.fields[0].table_id);
                this.cdr.detectChanges();
            }
            this.loadChartsData(this.panel.content);
            this.dynamicFilters = this.panel.content.dynamicFilters ?? true;
            this.resultSortingColumns = this.panel.content.resultSortingColumns ?? [];
            } catch(e){
                console.error('Error loading panel conent: ');
                throw e;
            }
        }

        this.contextMenu = new EdaContextMenu({
            header: $localize`:@@panelOptions0:OPCIONES DEL PANEL`,
            contextMenuItems: PanelOptions.generateMenu(this)
        });

        this.extraStyles =
            ['knob', 'radar'].includes(this.panel.content?.chart) ? { minHeight: '55vh', minWidth: '55vw', display: 'inline-block', alignItems: 'center' } :
            ['kpi'].includes(this.panel.content?.chart) ? {height: '100%', width: '100%', alignContent: 'center'} : 
            {height: '100%', width: '100%'};
        
        if(this.sortedFilters === undefined) this.sortedFilters = []; // Si se trata de un informe antiguo, definimos el informe como vacío.


    }
    
    public openContextMenu(event: MouseEvent): void {
        this.contextMenu.contextMenuItems = PanelOptions.generateMenu(this);
        this.contextMenu.showContextMenu(event);
    }

    /**
     * When selecting a node from the tree, it loads the columns to display.
     * @param event selected node. Can be rootNode (table_id) or childNode (child_id).
     */
    public tableNodeSelect(event: any): void {
        // TODO
        // clean columns filter.
        // this.inputs.findColumn.reset();

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
  const node = event?.node;
  if (!node) return;

  this.loadingNodes = true;

  const targetNode = this.tableInput ? (this.findOriginalNode(node) || node) : node;
  PanelInteractionUtils.expandTableNode(this, targetNode);

  setTimeout(() => {
    // If the expansion did not produce children, we remove the expandable folder properties.
    if (targetNode.children?.length === 0) {
      delete targetNode.children;
      delete targetNode.expandedIcon;
      delete targetNode.collapsedIcon;
    }
    this.loadingNodes = false;
    // Reapply the filter after expansion to include the newly loaded children.
    if (this.tableInput) {
      this.displayedTableNodes = this.filterTreeNodes(this.tableNodes, this.tableInput.toLowerCase());
    }
  });
}




    public checkNodeSelected(node: any) {
        // If it is the parent, it will always have a selected value.
        if(node?.parent === undefined)
            return true

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

    isEditable() {
        const user = localStorage.getItem('user');
        const userName = JSON.parse(user)._id;
        const userRole = JSON.parse(user).role;
        const isAdmin = userRole.includes('135792467811111111111110');
        const imProperty = userName === this.dashboard.dashboard.user;
        return (userName !== '135792467811111111111112' && !this.inject.isObserver) && !this.readonly && (!this.dashboard.dashboard.config.onlyIcanEdit || imProperty || isAdmin);
    }

    isRemovable() {
        const user = localStorage.getItem('user');
        const userName = JSON.parse(user).name;
        return (userName !== 'edaanonim' && !this.inject.isObserver);
    }

    readonly showLockInHeader = SHOW_LOCK_IN_PANEL_HEADER;

    isPanelLocked(): boolean {
        return (this.panel as any).dragEnabled === false;
    }

    togglePanelLock(): void {
        const panel = this.panel as any;
        const locked = this.isPanelLocked();
        panel.dragEnabled = locked;
        panel.resizeEnabled = locked;
        this.dashboard.gridsterOptions.api?.optionsChanged();
        this.dashboardService.setNotSaved(true);
    }

    public showWhatIfSection(): boolean {
        return this.currentQuery.some((query: any) => query.whatif_column);
    }

    public getWhatIfColumns(): any[] {
        return this.currentQuery.filter((query: any) => query.whatif_column);
    }

    public async runWhatIfQuery(column?: any): Promise<void> {
        try {
            await this.runQueryFromDashboard(true);
        } catch (err) {
            console.log(err);
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
        const out = localFilters.filter(f => f.isGlobal !== true);
        globalFilters.forEach(f => out.push(f));
        return out;
    }

    public async setTablesData()  {
        await this.setPanelDataSource();

        const tables = TableUtils.getTablesData(this.dataSource.model.tables, this.inject.applyToAllfilter);
        this.tables = [].concat(_.cloneDeep(tables.allTables), this.assertedTables);
        this.tablesToShow = [].concat(_.cloneDeep(tables.tablesToShow), this.assertedTables);
        this.tablesToShowBase = [...this.tablesToShow];
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
     * @param panelContent Panel content with query to execute
     */
    async loadChartsData(panelContent: any) {
        try {
            if (!panelContent?.query) return;

            this.display_v.minispinner = true;

            PanelInteractionUtils.handleGlobalFilterMapper(this);
            this.setupQueryContext(panelContent);          // 1. build currentQuery + navState
            if (NavigationUtils.panelHasNavigation(panelContent)) {
                this.restoreDateNavState(panelContent);    // 2. restore date nav (uses currentQuery to update formats)
            }
            PanelInteractionUtils.handleFilters(this, panelContent.query.query); // 3. populate selectedFilters (reads dateNavState)

            const hasNavChildren = this.currentQuery.some((col: any) => col.downChild);
            const baseQuery = panelContent.query;
            const queryToRun = hasNavChildren
                ? QueryUtils.initEdaQuery(this)
                : {
                    ...baseQuery,
                    dashboard: baseQuery.dashboard ?? {
                        dashboard_id: this.inject.dashboard_id,
                        panel_id: this.panel.id,
                        connectionProperties: this.connectionProperties
                    }
                };
            const response = await QueryUtils.switchAndRun(this, queryToRun);
            
            const [labels, values] = response;
            
            this.chartLabels = this.chartUtils.uniqueLabels(labels);
                this.chartData = response[1].map(item => item.map(a => {
                
                        if(a === null  && NULL_VALUE != 'LEAVE_THE_NULL'){
                          return NULL_VALUE;
                        }
                        if(a === ''){
                          return EMPTY_VALUE;
                        }
                
                        return a;
                
                })); // We replace nulls and empty strings with a customizable value.
            
            this.buildGlobalconfiguration(panelContent);
        } catch (err) {
            this.alertService.addError(err);
            this.display_v.minispinner = false;
            throw err;
        }
    }

    /**
     * Sets configuration dialog and chart
     * @param panelContent Panel content to build configuration
     */
    public buildGlobalconfiguration(panelContent: any): void {
        const { query, chart, edaChart } = panelContent;
        const { modeSQL, fields, filters, queryLimit, groupByEnabled, config } = query.query;
        const queryMode = this.selectedQueryMode;
        const isEdaMode = queryMode && queryMode !== 'SQL';
        const isModeSqlDisabled = modeSQL === false;

        // Only process if we are not in SQL mode or read-only mode!
        if (isEdaMode || isModeSqlDisabled) {
            if (queryMode === 'EDA2') {
            this.rootTable = this.tables.find(t => t.table_name === this.rootTable);

            for (const column of fields) {
                    PanelInteractionUtils.assertTable(this, column);
                }

                PanelInteractionUtils.handleCurrentQuery2(this);
                if (NavigationUtils.panelHasNavigation(panelContent)) { this.restoreNavigationLinks(panelContent); }
                this.reloadTablesData();
                PanelInteractionUtils.loadTableNodes(this);

                this.displayedTableNodes = this.tableNodes;

                this.userSelectedTable = undefined;
                this.columns = [];
            } else {
                this.rootTable = null; // No root table in EDA mode.
                PanelInteractionUtils.handleCurrentQuery(this);
                if (NavigationUtils.panelHasNavigation(panelContent)) { this.restoreNavigationLinks(panelContent); }
                this.columns = this.columns.filter(c => !c.isdeleted);
            }
        }

        // Global panel configuration
        this.queryLimit = queryLimit;
        this.joinType = panelContent.query.query.joinType || 'inner';
        this.groupByEnabled = groupByEnabled ?? true;
        PanelInteractionUtils.handleFilters(this, query.query);
        PanelInteractionUtils.handleFilterColumns(this, filters, fields);

        PanelInteractionUtils.verifyData(this);

        // Configure chart type
        const chartOption = this.chartUtils.chartTypes.find(c => c.subValue === edaChart);
        this.chartForm.patchValue({ chart: chartOption });

        const recoveredConfig = ChartsConfigUtils.recoverConfig(chart, panelContent.query.output.config);
        this.changeChartType(chart, edaChart, recoveredConfig);

        // Show panel and configure chart type
        this.display_v.saved_panel = true;
        this.display_v.minispinner = false;

        this.graphicType = chartOption?.value;

        // Check if the chart is a pivot table.
        const crossTableChart = this.chartTypes.find(g => g.subValue === 'crosstable');
        this.dragAndDropAvailable = !crossTableChart?.ngIf;
    }


    /**
     * Updates panel content with actual state
     */
    public savePanel() {
        this.indextab = 0;

        if (this.panel?.content) {
            this.panel.content.query.query.queryMode = this.selectedQueryMode;
            this.panel.content.query.query.rootTable = this.rootTable;
        }

        if (!_.isEmpty(this.graficos) || this.selectedQueryMode == 'SQL') {

            this.display_v.saved_panel = true;

            const query = this.initObjectQuery();
            // Nav filters are runtime-only — strip before saving so they don't pollute
            // the saved filters. They are restored via navActiveNodes.navFilters on reload.
            query.query.filters = (query.query.filters || []).filter((f: any) => !f.isNavFilter);
            const formChart = this.chartForm?.value.chart?.value ? this.chartForm?.value.chart?.value : this.chartForm?.value.chart;
            const chart = formChart || this.graficos?.chartType;
            const edaChart = this.panelChart?.props.edaChart || this.graficos?.edaChart;
            const navigationLinks: any[] = this.buildNavigationLinks(query);
            const navActiveNodes = (this.navState || []).map((entry: any) => ({
                parentKey: entry.rootKey,
                currentIndex: entry.currentIndex,
                navFilters: entry.navFilters || []
            }));
            const savedDateNavState = (this.dateNavState || []).map((entry: any) => ({
                columnKey: entry.columnKey,
                initialFormat: entry.initialFormat,
                formatChain: entry.formatChain,
                currentFormatIndex: entry.currentFormatIndex,
                navFilters: entry.navFilters
            }));
            this.panel.content = { query, chart, edaChart, dynamicFilters: this.dynamicFilters, navigationLinks, navActiveNodes, savedDateNavState, fullCurrentQuery: this.currentQuery, resultSortingColumns: this.resultSortingColumns };

            /**This is to repaint on panel redimension */
            if (['parallelSets', 'kpi','dynamicText', 'treeMap', 'scatterPlot', 'knob', 'funnel','bubblechart', 'sunburst','radar'].includes(chart)) {
                this.renderChart(this.currentQuery, this.chartLabels, this.chartData, chart, edaChart, this.panelChartConfig.config);
            }
        } else {
            this.display_v.saved_panel = false;
        }
        this.display_v.page_dialog = false;


        //not saved alert message
        this.dashboardService.setNotSaved(true);

        // Reset the prompt chat.
        this.promptMessages = [];

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
        // If using styles (legacy), carry over coloredBarsConfig from output.config
        if (output.styles && output.config?.coloredBarsConfig) {
            (config.getConfig() as any)['coloredBarsConfig'] = output.config.coloredBarsConfig;
        }
        if (output.config?.showUniqueColors != null) {
            (config.getConfig() as any)['showUniqueColors'] = output.config.showUniqueColors;
            (config.getConfig() as any)['uniqueBarColors'] = output.config.uniqueBarColors ?? [];
        }
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
            query: QueryUtils.getEffectiveFields(this),
            data: { labels: chartLabels, values: chartData },
            chartType: type,
            config: chartConfig,
            edaChart: subType,
            maps: this.dataSource.model.maps,
            linkedDashboardProps: this.panel.linkedDashboardProps,
            predictionConfig: this.panel.content?.query?.query?.predictionConfig,
            childNavConfig: NavigationUtils.hasNavigation(this) ? this.computeChildNavConfig() : { parentFields: [], childFieldMap: {}, navColumnSubstitution: {} },
        });
    }

    /**
     * Updates chart configuration properties
     */
    public setChartProperties(config?: any) {
        config = config || this.panelChart?.getCurrentConfig();

        if (config 
            && ['bar', 'line', 'horizontalBar', 'polarArea', 'doughnut', 'pyramid', 'radar'].includes(config.chartType) 
            && config.chartType === this.graficos.chartType ) {
            this.graficos = config;
        }
    }

    /**
     * Chart click event
    */
    public onChartClick(event: any): void {
        if (['doughnut', 'polarArea', 'bar', 'radar', 'line', 'area', 'treeMap', 'sunburst', 'scatterPlot', 'funnel', 'bubblechart', 'parallelSets'].includes(this.panelChart.props.chartType) || //D3 CHARTS
            'geoJsonMap'.includes(this.panelChart.props.chartType) || //Leaflet 
            ['table', 'crosstable', 'treetable'].includes(this.panelChart.props.chartType)) // tables
        {
            this.action.emit({ code: 'ADDFILTER', data: {...event, panel: this.panel} });
        } else {
            console.log('No filter here... yet');
        }
    }

    

    public changeChartTypeCheck(type: string, subType: string, config?: ChartConfig) {
        // Child navigation makes sense in tables and pivot tables — only clear it when switching to another chart type.
        const isTableType = type === 'table' || subType === 'crosstable' || subType === 'table';
        const hadChildNav = !isTableType && this.currentQuery.some((col: any) => col.downChild);
        if (hadChildNav) {
            NavigationUtils.clearChildNavigation(this);
        }

        if (subType=='tableanalized') {
            Swal.fire({
                title: $localize`:@@chartTypesTableAnalized:Tabla DataQuality`,
                text: $localize`:@@SureDataQuality:¿Estás seguro de que deseas continuar con la visualización de DataQuality? Esta acción puede tomar un poco de tiempo.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: $localize`:@@ContinueTablaQuality:Continuar`,
                cancelButtonText: $localize`:@@cancelarBtn:Cancelar`,
            }).then( (borrado) => {
                if(borrado.value){
                    try {
                        this.changeChartType(type, subType, config);
                        if (hadChildNav) { QueryUtils.runQuery(this, false); }
                    } catch (err) {
                        this.alertService.addError(err);
                        throw err;
                    }
                }
            })

            this.closeEditarConsulta();
        } else {
            this.changeChartType(type, subType, config);
            if (hadChildNav) { QueryUtils.runQuery(this, false); }
        }
    }


    /**
     * Changes chart type 
     * @param type chart type
     * @param content panel content
     */
    public async changeChartType(type: string, subType: string, config?: ChartConfig) {
        // We update the variable type for the drag-and-drop component.
        this.graphicType = type;
        this.graficos = {};
        this.display_v.chart = type;
        this.graficos.chartType = type;
        this.graficos.edaChart = subType;
        // Review for dashboards with chart type changes followed by duplication.
        if (this.panel.content) {
            this.panel.content.chart = type;
            this.panel.content.edaChart = subType;
        }
        this.graficos.addTrend = config && config.getConfig() ? config.getConfig()['addTrend'] : false;
        this.graficos.showPredictionLines = config && config.getConfig() ? config.getConfig()['showPredictionLines'] : false;
        this.graficos.numberOfColumns = config && config.getConfig() ? config.getConfig()['numberOfColumns'] : null;
        this.graficos.assignedColors = config && config.getConfig() ? config.getConfig()['assignedColors'] : null;

        // We want to preserve the prediction across chart type changes.
        // If the chart is line/area and there is an active prediction in the query, force showPredictionLines.
        if (['line', 'area'].includes(type)) {
            const prediction = this.panel?.content?.query?.query?.prediction;
            // If a prediction exists, we enforce it.
            if (prediction && prediction !== 'None') {
                if (config && config.getConfig()) {
                    config.getConfig()['showPredictionLines'] = true;
                }
                this.graficos.showPredictionLines = true;
            }
        }

        const allow = _.find(this.chartTypes, c => c.value === type && c.subValue == subType);

        if (!_.isEqual(this.display_v.chart, 'no_data') && allow && !allow.ngIf && !allow.tooManyData) {
            const _config = new ChartConfig(ChartsConfigUtils.setVoidChartConfig(type));

            // Preserve every custom field (same list setConfig() uses to save them) before
            // merging - setVoidChartConfig() builds a fresh ChartJsConfig without them, and
            // _.merge() isn't trusted to carry them over correctly either.
            const savedCustomFields: Record<string, any> = {};
            CUSTOM_CHART_CONFIG_FIELDS.forEach(field => {
                savedCustomFields[field.name] = config && config.getConfig() ? config.getConfig()[field.name] : null;
            });

            _.merge(_config, config||{});

            // Restore every custom field after merging.
            CUSTOM_CHART_CONFIG_FIELDS.forEach(field => {
                const saved = savedCustomFields[field.name];
                if (saved != null) {
                    _config.getConfig()[field.name] = saved;
                }
            });

            // Ensure that showPredictionLines is propagated to _config (keep the prediction line when switching between chart types).
            if (['line', 'area'].includes(type) && this.graficos.showPredictionLines) {
                _config.getConfig()['showPredictionLines'] = true;
            }

            if (subType=='tableanalized') {
                try {
                    if (!this.display_v.minispinner) this.spinnerService.on();
                    const data = await QueryUtils.analizedQuery(this);
                    const transformedData = QueryUtils.transformAnalizedQueryData(this, data);
                    this.renderChart(this.currentQuery, transformedData.labels, transformedData.values, type, subType, _config);
                } catch(err) {
                    console.log(err)
                    throw err;
                } finally {
                    this.spinnerService.off();
                }
            } else {
                this.renderChart(this.currentQuery, this.chartLabels, this.chartData, type, subType, _config);
            }
        }else{
            try{
                console.log('no allow');
                console.log(allow);
            }catch (e){
                console.log(e);
            }

        }

        // Check whether a pivot table should be executed
        // This is determined by the length of the axes variable
        // Reference to config
        if(subType === 'crosstable'){
            const configCrossTable = this.panelChartConfig.config.getConfig()
            // Excluir nav-children para que no aparezcan en los ejes del editor drag-drop
            const _navChildKeysCT = new Set<string>();
            this.currentQuery.forEach((col: any) => { if (col.downChild) _navChildKeysCT.add(`${col.downChild.table_id}.${col.downChild.column_name}`); });
            const _queryForAxesCT = this.currentQuery.filter((col: any) => !_navChildKeysCT.has(`${col.table_id}.${col.column_name}`));

            if(config===null){
                if(Object.keys(this.copyConfigCrossTable).length !== 0) {
                    this.axes = this.copyConfigCrossTable['ordering'][0].axes;
                    if(configCrossTable) configCrossTable['ordering'] = [{axes: this.axes}];
                } else {
                    this.axes = this.initAxes(_queryForAxesCT);
                    configCrossTable['ordering'] = [{axes: this.axes}];
                }
            } else {
                if(config['config']['ordering'] === undefined) {
                    this.axes = this.initAxes(_queryForAxesCT);
                } else {
                    if(config['config']['ordering'].length === 0) {
                        this.axes = this.initAxes(_queryForAxesCT);
                    } else {
                        this.axes = config['config']['ordering'][0]['axes']
                    }
                }
            }
        }

        this.cdr.detectChanges();
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

    // Filter the entity searcher based on the active query mode.
    // EDA mode (standard): filters the flat tablesToShow list.
    // EDA2 mode (tree) with active query: recursively filters displayedTableNodes.
    public onTableInputKey(event: any) {
        if (this.selectedQueryMode === 'EDA2' && this.currentQuery.length > 0) {
            const term = event.target.value?.toLowerCase();
            this.displayedTableNodes = term
                ? this.filterTreeNodes(this.tableNodes, term)
                : this.tableNodes;
        } else {
            if (event.target.value) {
                this.tablesToShow = this.tablesToShowBase
                    .filter(table => table.display_name.default.toLowerCase().includes(event.target.value.toLowerCase()));
            } else {
                this.tablesToShow = [...this.tablesToShowBase];
            }
        }
    }

    // Recursively filter a tree node array by search term.
    private filterTreeNodes(nodes: any[], term: string): any[] {
        const result: any[] = [];
        for (const node of nodes) {
            if (node.label?.toLowerCase().includes(term)) {
                result.push(node);
            } else {
                const hasExpandedChildren = node.expanded === true
                    && node.children?.length > 0
                    && node.children[0]?.label !== undefined;
                if (hasExpandedChildren) {
                    const filtered = this.filterTreeNodes(node.children, term);
                    if (filtered.length > 0) {
                        result.push({ ...node, children: filtered });
                    }
                }
            }
        }
        return result;
    }

    /**
     * Finds the original node in tableNodes (full tree) that corresponds to
     * the target node received from the expansion event.
     * This is necessary because filtering creates cloned objects with reduced children;
     * expansion must operate on the real node so that tableNodes is properly updated.
     * The node is identified by table_id (root nodes) or child_id (child nodes).
     */
    private findOriginalNode(target: any, nodes: any[] = this.tableNodes): any {
        for (const node of nodes) {
            if (target.table_id && node.table_id === target.table_id) return node;
            if (target.child_id && node.child_id === target.child_id) return node;
            const hasChildren = node.children?.length > 0 && node.children[0]?.label !== undefined;
            if (hasChildren) {
                const found = this.findOriginalNode(target, node.children);
                if (found) return found;
            }
        }
        return null;
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
    public drop(event: any, list?: any) {
        if (event.previousContainer === event.container) {
            //Reordering
            moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
        } else {
            transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
            //Open dialog or filter
            const column = <Column><unknown>event.container.data[event.currentIndex];
            const className = list || event.container.element.nativeElement.className.toString() || '';

            if(className.includes('select-list')) {
                this.moveItem(column);
                this.openColumnDialog(column);
            } else {
                this.openColumnDialog(column, true);
                // Remove aggregation if possible.
                try{
                    const c:Column = <Column><unknown>event.container.data[event.currentIndex];
                    c.aggregation_type.forEach( e=> e.selected = false);
                    c.aggregation_type.map( e=> e.value == 'none'? e.selected = true:true );
                }catch(e){
                    throw e;
                }
            }
        }
    }



    public dropToResultSorting(event: CdkDragDrop<any[]>) {

        console.log('event ==> ', event);

        if (event.previousContainer === event.container) {
            moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
        } else {
            const draggedColumn = event.previousContainer.data[event.previousIndex];

            // Si no tenemos ordenation_type, añadimos 
            draggedColumn.ordenation_type ??= 'No';

            const alreadyAdded = this.resultSortingColumns
                .some(col => col.column_name === draggedColumn.column_name);
            if (!alreadyAdded) {
                copyArrayItem(
                    event.previousContainer.data,
                    event.container.data,
                    event.previousIndex,
                    event.currentIndex
                );
            }
        }

        console.log('resultSortingColumns: ', this.resultSortingColumns);

    }

    public changeResultSortingValue(column: any) {

        if (column.ordenation_type === 'Asc') {
            column.ordenation_type = 'No';
        } else if (column.ordenation_type === 'No') {
            column.ordenation_type = 'Desc';
        } else if (column.ordenation_type === 'Desc') {
            column.ordenation_type = 'Asc';
        }

        const newValue = column.ordenation_type;
        const syncOrdenation = (arr: any[]) => {
            const match = arr.find(c => c.column_name === column.column_name && c.table_id === column.table_id);
            if (match) match.ordenation_type = newValue;
        };
        syncOrdenation(this.currentQuery);
        syncOrdenation(this.resultSortingColumns);
    }

    public removeResultSorting(column: any) {
        this.resultSortingColumns = this.resultSortingColumns
            .filter(col => col.column_name !== column.column_name);
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
            filters: this.selectedFilters,
            connectionProperties: this.connectionProperties,
            chartSubType: this.graficos?.edaChart || ''
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

                    for (const sortCol of this.resultSortingColumns) {
                        const match = this.currentQuery.find(c =>
                            c.column_name === sortCol.column_name && c.table_id === sortCol.table_id
                        );
                        if (match) sortCol.ordenation_type = match.ordenation_type;
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
            this.globalFilters.splice(filterInx, 1);
            this.globalFilters.push(globalFilter);
        } else {
            this.globalFilters.push(globalFilter);
        }
    }

    /** Registers a global filter (even if empty) so it appears in the AND/OR dialog without triggering a query */
    public assertGlobalEmptyFilter(_filter: any) {
        const globalFilter = _.cloneDeep(_filter);

        if (_filter.pathList && _filter.pathList[this.panel.id]) {
            globalFilter.joins = _filter.pathList[this.panel.id].path;
            globalFilter.filter_table = _filter.pathList[this.panel.id].table_id;
        }
        const filterInx = this.globalFilters.findIndex((gf: any) => gf.filter_id === globalFilter.filter_id);

        if (filterInx !== -1) {
            this.globalFilters.splice(filterInx, 1);
            this.globalFilters.push(globalFilter);
        } else {
            this.globalFilters.push(globalFilter);
        }
    }

    public addingGlobalFilterEbp(_filter: any) {

        if(this.sortedFilters.length !==0){
            const lastElement = this.sortedFilters[this.sortedFilters.length-1];

            const newSortedFilter = {
                cols: 3,
                rows: 1,
                y: lastElement.y+1,
                x: 0,
                filter_table: _filter.filter_table,
                filter_column: _filter.filter_column,
                filter_type: _filter.filter_type,
                filter_column_type: _filter.filter_column_type,
                filter_elements: _filter.filter_elements,
                filter_codes: _filter.filter_codes,
                filter_id: _filter.filter_id,
                isGlobal: _filter.isGlobal,
                value: "and",
            }

            this.sortedFilters.push(newSortedFilter);
            this.savePanel()
        }
    }    

    public rebootGlobalFilter(_filter: any){

        if(this.sortedFilters.length !==0) {
            this.alertService.addWarning($localize`:@@globalFilterSettingsReboot:La configuración de filtros del panel involucrado se ha reiniciado`);
        }

        if(this.sortedFilters.some((sortedFilter: any) => _filter.id === sortedFilter.filter_id)){
            this.sortedFilters = [];
            this.savePanel(); // Panel setting saved
        }

    }
    
    /* General page functions */
    public disableBtnSave = () => this.display_v.btnSave = true;

    public ableBtnSave = () => this.display_v.btnSave = false;

    onTopChange() {
        this.display_v.btnSave = true;
    }


    onJoinTypeChange(type?: any) {
        this.joinType = type.joinType;
        this.display_v.joinType = true;
    }

    public openEditarConsulta(): void {
        this.display_v.page_dialog = true;
        this.ableBtnSave();
        PanelInteractionUtils.verifyData(this);
        this.temporalSortedFilters = _.cloneDeep(this.sortedFilters);
    }

    /**
     * Reset state when panel edition is cancelled
     */
    public closeEditarConsulta(): void {
        // Reset all the variables
        this.display_v.saved_panel = false;
        this.columns = [];
        this.currentQuery = [];
        this.navState = [];
        this.dateNavState = [];
        this.indextab = 0;
        this.sortedFilters = _.cloneDeep(this.temporalSortedFilters);
        EdaFilterAndOrComponent.reiniciarDashboard();

        if (this.panelDeepCopy.query) {
            this.panelDeepCopy.query.query.filters = this.mergeFilters(this.panelDeepCopy.query.query.filters, this.globalFilters);

            this.filtredColumns = [];

            this.currentSQLQuery = this.panelDeepCopy.query.query.SQLexpression;

            const queryMode = this.panelDeepCopy.query.query.queryMode;
            const modeSQL = this.panelDeepCopy.query.query.modeSQL;

            this.selectedQueryMode = _.isNil(queryMode) ? (modeSQL ? 'SQL' : 'EDA') : queryMode;
            
            if(this.selectedQueryMode == 'EDA2'){
                this.rootTable = this.panelDeepCopy.rootTable;
            }
            
            
        }

        this.loadChartsData(this.panelDeepCopy);
        this.userSelectedTable = undefined;
        this.tablesToShow = this.tables;
        this.tablesToShowBase = [...this.tables];
        this.display_v.chart = '';
        this.display_v.page_dialog = false;

        // Reset the prompt chat.
        this.promptMessages = [];

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
            if(properties.edaChart !== 'histogram'){
                // assignedColors is updated by changing the color based on its label.
                this.graficos.assignedColors.forEach((e) => {
                if (this.graficos.chartLabels.includes(e.value)) {
                        let indexColor = this.graficos.chartLabels.findIndex(element => element === e.value)
                        const candidateColor = this.graficos.chartColors[0].backgroundColor[indexColor];
                        // Solo sobreescribir si es un array de colores (doughnut/polarArea), no un string de color único
                        if (candidateColor?.length > 1) {
                            e.color = candidateColor;
                        }
                        // For area/radar/line charts, preserve the original hex color from assignedColors.
                }
            });
            }else{
                // Histogram is single-series: renderBar()'s color resolution (panel-chart.component.ts's
                // getLabelsForChartType()) matches assignedColors by the DATASET's own label, not by the
                // bin-range labels (chartLabels) - keying one entry per bin range here meant the lookup
                // never matched on the next render and silently fell back to a default palette color,
                // discarding whatever color was just picked in the dialog.
                this.graficos.assignedColors = [{
                    value: this.graficos.chartDataset[0]?.label,
                    color: this.graficos.chartColors[0].backgroundColor
                }];
            }
        
                const customFields: Record<string, any> = {};
                CUSTOM_CHART_CONFIG_FIELDS.forEach(field => {
                    customFields[field.name] = this.graficos[field.name] ?? field.default;
                });

                this.panel.content.query.output.config = { colors: this.graficos.chartColors, chartType: this.graficos.chartType, ...customFields };
                const layout =
                    new ChartConfig(new ChartJsConfig(this.graficos.chartColors, this.graficos.chartType,
                    this.graficos.addTrend, this.graficos.addComparative, this.graficos.showLabels,
                    this.graficos.showLabelsPercent, this.graficos.numberOfColumns, this.graficos.assignedColors, this.graficos.showPointLines, this.graficos.showPredictionLines, this.graficos.chartLegend, this.graficos.showGridLines ?? true));
                CUSTOM_CHART_CONFIG_FIELDS.forEach(field => {
                    (layout.getConfig() as any)[field.name] = customFields[field.name];
                });
                this.renderChart(this.currentQuery, this.chartLabels, this.chartData, this.graficos.chartType, this.graficos.edaChart, layout);
            }
            //not saved alert message
        this.dashboardService.setNotSaved(true);
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
            this.dashboardService.setNotSaved(true);
        }
        this.tableController = undefined;
    }

    public onCloseMapProperties(event, response: {
        logarithmicScale: boolean,
        legendPosition: string,
        baseLayer: boolean,
        draggable: boolean,
        zoom: number,
        coordinates: Array<Array<number>>,
        assignedColors: any[],
        color?: string
    }): void {
        if (!_.isEqual(event, EdaDialogCloseEvent.NONE)) {
            this.panel.content.query.output.config = {
                ...this.panel.content.query.output.config,
                assignedColors: response.assignedColors,
                color: response.color, // legacy
                logarithmicScale: response.logarithmicScale,
                legendPosition: response.legendPosition,
                baseLayer: response.baseLayer,
                draggable: response.draggable,
                zoom: response.zoom,
                coordinates: response.coordinates
            };

            const config = new ChartConfig(this.panel.content.query.output.config);
            this.renderChart( this.currentQuery, this.chartLabels, this.chartData, this.graficos.chartType, this.graficos.edaChart, config);
            this.dashboardService.setNotSaved(true);
        }
        this.mapController = undefined;
    }
        
    public onCloseMapCoordProperties(event, response: { 
        assignedColors: any[],
        initialColor?: string,  // For legacy compatibility.
        finalColor?: string,    // For legacy compatibility.
        logarithmicScale: boolean, 
        draggable: boolean, 
        zoom: number, 
        coordinates: Array<Array<number>> 
    }): void {
        if (!_.isEqual(event, EdaDialogCloseEvent.NONE)) {
            this.panel.content.query.output.config = {
                ...this.panel.content.query.output.config,
                assignedColors: response.assignedColors, 
                logarithmicScale: response.logarithmicScale,
                draggable: response.draggable,
                zoom: response.zoom,
                coordinates: response.coordinates
            };
            
            const config = new ChartConfig(this.panel.content.query.output.config);
            this.renderChart(this.currentQuery, this.chartLabels, this.chartData, 
                this.graficos.chartType, this.graficos.edaChart, config);
            this.dashboardService.setNotSaved(true);
        }
        this.mapCoordController = undefined;
    }

    public onCloseSankeyProperties(event, response): void {
        if (!_.isEqual(event, EdaDialogCloseEvent.NONE)) {

            // We iterate over all assignedColors we have.
            this.panelChart.componentRef.instance.assignedColors.forEach((e) => {
                // Label values present in the chart.
                let chartValues = this.panelChart.componentRef.instance.data.values.map(item => item.find(value => typeof value === 'string'));
                // If any chart labels match those in assignedColors, they will be replaced.
                if (chartValues.includes(e.value)) {
                    let indexColor = chartValues.findIndex(element => element === e.value)
                    e.color = response.colors[indexColor]
                }
            });
            this.panel.content.query.output.config = { colors: response.colors, assignedColors: this.panelChart.componentRef.instance.assignedColors };
            const config = new ChartConfig(this.panel.content.query.output.config);
            this.renderChart(this.currentQuery, this.chartLabels, this.chartData, this.graficos.chartType, this.graficos.edaChart, config);
            this.dashboardService.setNotSaved(true);

        }
        this.sankeyController = undefined;
    }

    /** Shared tail for every onClose*Properties handler: merges into the existing config (not a wholesale replace), re-renders, clears the controller. */
    private applyDialogChartConfig(event: EdaDialogCloseEvent, configPatch: any, controllerField: 'doughnutController' | 'polarAreaController' | 'funnelController' | 'bubblechartController' | 'scatterPlotController' | 'treeMapController' | 'sunburstController'): void {
        if (!_.isEqual(event, EdaDialogCloseEvent.NONE)) {
            this.panel.content.query.output.config = {
                ...this.panel.content.query.output.config,
                ...configPatch
            };
            const config = new ChartConfig(this.panel.content.query.output.config);
            this.renderChart(this.currentQuery, this.chartLabels, this.chartData, this.graficos.chartType, this.graficos.edaChart, config);
            this.dashboardService.setNotSaved(true);
        }
        (this as any)[controllerField] = undefined;
    }

    /** Matches bubblechart/scatter/treeMap's positional `colors` array back onto assignedColors by chart value. */
    private recolorLegacyAssignedColors(chartValues: string[], response: any): any[] {
        const instance = this.panelChart.componentRef.instance;
        instance.assignedColors.forEach((e: any) => {
            if (chartValues.includes(e.value)) {
                const indexColor = chartValues.findIndex((v: string) => v === e.value);
                e.color = response.colors[indexColor];
            }
        });
        return instance.assignedColors;
    }

    public onCloseTreeMapProperties(event, response): void {
        if (!_.isEqual(event, EdaDialogCloseEvent.NONE)) {
            const chartValues = this.panelChart.componentRef.instance.data.children.map((item: any) => item.name);
            const assignedColors = this.recolorLegacyAssignedColors(chartValues, response);
            this.applyDialogChartConfig(event, { colors: response.colors, assignedColors }, 'treeMapController');
        } else {
            this.treeMapController = undefined;
        }
    }

    public onCloseTreeTableProperties(event, response) {

        if(!_.isEqual(event, EdaDialogCloseEvent.NONE)) {
            this.panel.content.query.output.config = response;
            const config = new ChartConfig(response);
            this.renderChart(this.currentQuery, this.chartLabels, this.chartData, this.graficos.chartType, this.graficos.edaChart, config);
        }

        this.treeTableController = undefined;

    }

    public onCloseFunnelProperties(event, response): void {
        this.applyDialogChartConfig(event, {
            assignedColors: response.assignedColors,
            chartLegend: response.chartLegend
        }, 'funnelController');
    }

    public onCloseDoughnutProperties(event, response): void {
        this.applyDialogChartConfig(event, {
            assignedColors: response.assignedColors,
            showLabels: response.showLabels,
            showLabelsPercent: response.showLabelsPercent,
            chartLegend: response.chartLegend,
            innerRadiusPercent: response.innerRadiusPercent,
            useGradient: response.useGradient
        }, 'doughnutController');
    }

    public onClosePolarAreaProperties(event, response): void {
        this.applyDialogChartConfig(event, {
            assignedColors: response.assignedColors,
            showLabels: response.showLabels,
            showLabelsPercent: response.showLabelsPercent,
            chartLegend: response.chartLegend,
            showGridLines: response.showGridLines,
            useGradient: response.useGradient
        }, 'polarAreaController');
    }

    public onCloseBubblechartProperties(event, response): void {
        if (!_.isEqual(event, EdaDialogCloseEvent.NONE)) {
            const chartValues = this.panelChart.componentRef.instance.data.children.map((item: any) => item.name);
            const assignedColors = this.recolorLegacyAssignedColors(chartValues, response);
            this.applyDialogChartConfig(event, { colors: response.colors, assignedColors }, 'bubblechartController');
        } else {
            this.bubblechartController = undefined;
        }
    }

    public onCloseScatterProperties(event, response): void {
        if (!_.isEqual(event, EdaDialogCloseEvent.NONE)) {
            const chartValues = this.panelChart.componentRef.instance.data.map((item: any) => item.label);
            const assignedColors = this.recolorLegacyAssignedColors(chartValues, response);
            this.applyDialogChartConfig(event, { colors: response.colors, assignedColors }, 'scatterPlotController');
        } else {
            this.scatterPlotController = undefined;
        }
    }

    public onCloseSunburstProperties(event: any, response: any): void {
        const chartInstance = this.panelChart?.componentRef?.instance;
        const dataDescription = chartInstance?.inject?.dataDescription;
        const otherColumns = dataDescription?.otherColumns;

        if (!_.isEqual(event, EdaDialogCloseEvent.NONE)) {
            // Multi-level: rows are '|'-joined path strings, take the top segment. Single-level: plain category strings.
            const isMultiLevel = otherColumns && Array.isArray(otherColumns) && otherColumns.length > 1;
            const chartValues: string[] = isMultiLevel
                ? Array.from(new Set(chartInstance.data.map((item: any[]) => {
                    const found = item.find((value: any) => typeof value === 'string');
                    return found ? found.split("|")[0] : "";
                })))
                : chartInstance.data.map((item: any[]) => item.find((value: any) => typeof value === 'string'));

            chartInstance.assignedColors.forEach((assignedColor: any) => {
                const matches = isMultiLevel
                    ? chartValues.some(value => value === assignedColor.value)
                    : chartValues.some(value => value.includes(assignedColor.value));
                if (matches) {
                    const indexColor = chartValues.findIndex(value => value === assignedColor.value);
                    if (indexColor >= 0 && response.colors?.[indexColor]) {
                        assignedColor.color = response.colors[indexColor];
                    }
                }
            });

            this.applyDialogChartConfig(event, {
                colors: response.colors,
                assignedColors: chartInstance.assignedColors,
                chartLegend: response.chartLegend,
                useGradient: response.useGradient
            }, 'sunburstController');
        } else {
            this.sunburstController = undefined;
        }
    }
    public onCloseKnobProperties(event, response): void {
        if (!_.isEqual(event, EdaDialogCloseEvent.NONE)) {

            this.panel.content.query.output.config = response;
            const config = new ChartConfig(this.panel.content.query.output.config);
            this.renderChart(this.currentQuery, this.chartLabels, this.chartData, this.graficos.chartType, this.graficos.edaChart, config);

            this.dashboardService.setNotSaved(true);

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


            this.dashboardService.setNotSaved(true);
        }

        this.linkDashboardController = undefined;
    }

    public onCloseKpiProperties(event, response): void {
    if (!_.isEqual(event, EdaDialogCloseEvent.NONE)) {

        if (response.chartType === 'kpideviation') {
            this.panel.content.query.output.config = {
                ...this.panel.content.query.output.config,
                backgroundColor: response.backgroundColor || '',
                kpiColor: response.kpiColor || '',
                prefixImage: response.prefixImage || '',
                modifiedFontPoints: response.modifiedFontPoints || 0,
                alertLimits: response.alerts || [],
            };
            const config = new ChartConfig(new KpiDeviationConfig({
                backgroundColor: response.backgroundColor || '',
                kpiColor: response.kpiColor || '',
                prefixImage: response.prefixImage || '',
                modifiedFontPoints: response.modifiedFontPoints || 0,
                alertLimits: response.alerts || [],
            }));
            this.renderChart(this.currentQuery, this.chartLabels, this.chartData, 'kpideviation', 'kpideviation', config);
            this.dashboardService.setNotSaved(true);
            this.kpiController = undefined;
            return;
        }

        // Usar spread operator para mantener el config existente
        // Use the spread operator to preserve the existing config.
        this.panel.content.query.output.config = {
            ...this.panel.content.query.output.config,
            assignedColors: response.assignedColors,
            alertLimits: response.alerts,
            sufix: response.sufix,
            modifiedFontPoints: response.modifiedFontPoints || 0,
            backgroundColor: response.backgroundColor || '',
            kpiColor: response.kpiColor || '',
            prefixImage: response.prefixImage || '',
        };

        let layout: any;
        if (response.edaChart) {
            this.panel.content.query.output.config.colors = response.edaChart.chartColors;
            this.panel.content.query.output.config.chartType = response.chartType;
            this.panel.content.query.output.config.chartSubType = response.chartSubType;

            layout = new ChartJsConfig(
                response.edaChart.chartColors,
                response.edaChart.chartType,
                response.edaChart.addTrend,
                response.edaChart.addComparative,
                response.edaChart.showLabels,
                response.edaChart.showLabelsPercent,
                response.edaChart.numberOfColumns,
                response.assignedColors,  //  Pass assignedColors from the response, not from edaChart.
                response.edaChart.showPointLines,
                response.edaChart.showPredictionLines,
            );
        }

        const config = new ChartConfig(
            new KpiConfig({
                sufix: response.sufix,
                alertLimits: response.alerts,
                edaChart: layout,
                assignedColors: response.assignedColors,
                modifiedFontPoints: response.modifiedFontPoints || 0,
                backgroundColor: response.backgroundColor || '',
                kpiColor: response.kpiColor || '',
                prefixImage: response.prefixImage || '',
            })
        );

        this.renderChart(
            this.currentQuery,
            this.chartLabels,
            this.chartData,
            response.chartType,
            response.chartSubType,
            config
        );
        this.dashboardService.setNotSaved(true);
    }
    this.kpiController = undefined;
}

    public onClosedynamicTextProperties(event, response): void {
        if (!_.isEqual(event, EdaDialogCloseEvent.NONE)) {
            const config = new ChartConfig(new DynamicTextConfig(response.color, response.modifiedFontPoints || 0));
            this.renderChart(this.currentQuery, this.chartLabels, this.chartData, this.graficos.chartType, this.graficos.edaChart, config);

            this.dashboardService.setNotSaved(true);
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
        //this.screenWidth = event.currentTarget.innerWidth;
    }

    /** Run query From dashboard component */
    public runQueryFromDashboard = (globalFilters: boolean) => QueryUtils.runQuery(this, globalFilters);

    /**
    * Function that initializes axes in their basic form → basic pivot table.
    */
    public initAxes(currenQuery) {

        let currenQueryCopy = [...currenQuery];

        // itemX = "Vertical axis" (rows), itemY = "Horizontal axis" (columns), itemZ = numeric measures.
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
                currenQueryCopy.splice(indexX, 1);
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

        // Columns with downChild (parent-child families) must always be on the vertical axis (itemX).
        // Any that remain in itemY (horizontal) are moved to itemX.
        const navParentNames = new Set(currenQuery.filter((c: any) => c.downChild).map((c: any) => c.column_name));
        const toMoveToVertical: any[] = [];
        itemY = itemY.filter((item: any) => {
            if (navParentNames.has(item.column_name)) { toMoveToVertical.push(item); return false; }
            return true;
        });
        itemX.push(...toMoveToVertical);

        // Columns flagged with _forceItemX (previously nav-children detached in pivot mode)
        // must also be moved to itemX to prevent itemY from expanding excessively and causing a potential OOM in the pivot table.
        const forceXNames = new Set(currenQuery.filter((c: any) => c._forceItemX).map((c: any) => c.column_name));
        if (forceXNames.size > 0) {
            const toForceVertical: any[] = [];
            itemY = itemY.filter((item: any) => {
                if (forceXNames.has(item.column_name)) { toForceVertical.push(item); return false; }
                return true;
            });
            itemX.push(...toForceVertical);
            // Clear flags so they don't persist across subsequent initAxes calls
            for (const col of currenQuery) {
                if (col._forceItemX) delete col._forceItemX;
            }
            // If itemY is now empty, promote the first numeric measure as a column axis
            if (itemY.length === 0 && itemZ.length > 0) {
                itemY.push(itemZ[0]);
                itemZ.shift();
            }
        }

        return [{ itemX: itemX, itemY: itemY, itemZ: itemZ }]

    }

    /**
    * Runs actual query when execute button is pressed to check for heavy queries
    */
    public runManualQuery = () => {

        if(!this.groupByEnabled) {
            let isAnAggregation: boolean = false;
            isAnAggregation = this.currentQuery.some((column: any) =>
                column.aggregation_type.some((at: any) =>
                    at.selected && at.value !== 'none'
                )
            );
            if(isAnAggregation) {
                this.alertService.addWarning($localize`:@@mustAddTheGroupingsToRunWithAggregations:Debe activar las agrupaciones para ejecutar con agregaciones configuradas en los atributos`);
                return;
            }
        }

        const chartType = this.panelChart?.props?.chartType || '';

        if (chartType == 'crosstable' && this.indextab === 1) {
            this.makeNewCrosstable();
        } else {
            QueryUtils.runManualQuery(this);
        }

        this.indextab = 1;
    };

    public moveItem = (column: any) => {
        PanelInteractionUtils.moveItem(this, column);

        const sortingMatch = this.resultSortingColumns.find(
            c => c.column_name === column.column_name && c.table_id === column.table_id
        );
        if (sortingMatch?.ordenation_type) {
            const queryMatch = this.currentQuery.find(
                c => c.column_name === column.column_name && c.table_id === column.table_id
            );
            if (queryMatch) queryMatch.ordenation_type = sortingMatch.ordenation_type;
        }

        if (this.selectedQueryMode == 'EDA2' && this.currentQuery.length === 1) {
            PanelInteractionUtils.loadTableNodes(this);
            this.displayedTableNodes = this.tableNodes;
       }
    }

    public searchRelations = (c: Column) => PanelInteractionUtils.searchRelations(this, c);

    public loadColumns = (table: any) => PanelInteractionUtils.loadColumns(this, table, true);

    public removeColumn = (c: Column, list?: string) => {
        // The root table restriction only applies in tree mode (EDA2).
        const isTreeMode = this.selectedQueryMode === 'EDA2';

        const rootTableName = this.rootTable?.table_name;
        const isNotRootColumn = !!c?.joins?.length || (!!rootTableName && c?.table_id !== rootTableName);
        const rootColumnElements = this.currentQuery.filter(col => !col?.joins?.length && (!rootTableName || col?.table_id === rootTableName)).length;
        const currentQueryLength = this.currentQuery.length;

        if (!isTreeMode || isNotRootColumn || rootColumnElements > 1 || currentQueryLength === 1) {
            const columnHadFilter = this.selectedFilters.some((sf: any) => sf.filter_column === c.column_name);
            const removed = PanelInteractionUtils.removeColumn(this, c, list);
            if (removed !== false) {
                // We check whether a field being removed had a filter in selectedFilters (this is verified before removeColumn deletes it).
                if (columnHadFilter) {
                    if (this.sortedFilters.length !== 0) {
                        this.alertService.addWarning($localize`:@@filterSettingsReboot:La configuración de filtros se ha reiniciado`);
                    }
                    this.sortedFilters = []; // resets the values because one or more filters were deleted
                }
                // Clean up downChild references to the removed column
                const removedKey = `${c.table_id}.${c.column_name}`;
                for (const col of this.currentQuery) {
                    if (col.downChild &&
                        `${col.downChild.table_id}.${col.downChild.column_name}` === removedKey) {
                        delete col.downChild;
                    }
                }
                // Clean up any nav state for this column
                this.navState = this.navState.filter(d => d.rootKey !== removedKey);
            }
        }
        else {
            // We stop event propagation to prevent the attributes panel from opening.
            event.stopPropagation();
            this.alertService.addError($localize`:@@cannotRemoveLastColumn:No se puede eliminar todas las columnas de la tabla raíz sin eliminar las columnas dependientes.`);
        }
    }
    
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

    /** It duplicates a dashboard panel and positions it one step below the original.*/
    public duplicatePanel(): void {
        let duplicatedPanel =   _.cloneDeep(this.panel, true); 
        duplicatedPanel.id = this.fileUtiles.generateUUID();
        duplicatedPanel.y = duplicatedPanel.y+1;
        this.duplicate.emit(duplicatedPanel);
    }

    
    public removePanel(): void {
        this.remove.emit(this.panel.id);
    }



    public async getQuery($event: MouseEvent) {

        if(!this.groupByEnabled) {
            let isAnAggregation: boolean = false;
            isAnAggregation = this.currentQuery.some((column: any) =>
                column.aggregation_type.some((at: any) =>
                    at.selected && at.value !== 'none'
                )
            );
            if(isAnAggregation) {
                this.alertService.addWarning($localize`:@@mustAddTheGroupingsToRunWithAggregations:Debe activar las agrupaciones para ejecutar con agregaciones configuradas en los atributos`);
                return;
            }
        }

        this.display_v.showQueryContainer = true;
        this.display_v.minispinnerSQL = true;
        this.queryFromServer = null;

        // this.op.toggle($event);

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


    private _panelInfoOverlayTimeout: ReturnType<typeof setTimeout> | null = null;

    public showPanelInfoOverlay(event: Event, overlay: any): void {
        this._panelInfoOverlayTimeout = setTimeout(() => overlay.show(event), 1000);
    }

    public hidePanelInfoOverlay(overlay: any): void {
        if (this._panelInfoOverlayTimeout) {
            clearTimeout(this._panelInfoOverlayTimeout);
            this._panelInfoOverlayTimeout = null;
        }
        overlay.hide();
    }

    /** This funciton return the display name for a given table. Its used for the query resumen      */
    public getNiceTableName(table: any) {
        return this.tables.find( t => t.table_name === table)?.display_name?.default;
    }


    public onWhatIfDialog(): void {
        this.display_v.whatIf_dialog = true;
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
        const aggregationText = AGG_TYPES.filter(agg => agg.value === aggregation.value)[0].label
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

            // Naming convention: WHERE => Filter on all records | HAVING => Filter on results
            const filterBeforeGroupingText = filter.filterBeforeGrouping ? whereMessage : havingMessage
            // Aggregation
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
            if(AGG_TYPES.filter(agg => agg.value === aggregation).length !== 0) aggregationLabel = AGG_TYPES.filter(agg => agg.value === aggregation)[0].label;

            // Added internationalization for the “between” operator.
            let filterType = filter.filter_type
            if(filterType === 'between') filterType = this.textBetween;

            str = `<strong>${tableName}</strong>&nbsp[${columnName}]&nbsp<strong>${filterType}</strong>&nbsp${valueStr}  &nbsp<strong>${filterBeforeGroupingText}</strong>&nbsp${aggregationLabel ? ` - ${this.aggregationText}: &nbsp<strong>${aggregationLabel}</strong>` : ''}&nbsp`;
        }

        return str;
    }


    public onCloseWhatIfDialog(): void {
        this.display_v.whatIf_dialog = false;
    }

    public closeChatGpt(event: any) {
        this.isVisibleEbpChatGpt = false;
    } 

    public onFilterMapper() {
        this.display_v.filterMapperDialog = true;
    }

    public onCloseFilterMapperDialog(response?: any): void {
        if (response) {
            this.panel.globalFilterMap = response.connections || [];
        }

        this.display_v.filterMapperDialog = false;
    }

    public isSpecialChart(type: string): boolean {
        return ['kpi', 'knob', 'dynamicText'].includes(type);
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

        if (this.panelChart?.props?.chartType == 'crosstable' && this.indextab === 1) {
            if (!this.isCrosstableValid()) return true;
        }

        return disable;
    }

    /**
    * Function that reorders the currentQuery array according to the new sort order of the axes variable returned by the drag-and-drop component.
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

        // Nav-child columns are excluded from axes (drag-drop never shows them) but must
        // remain in currentQuery so the navigation hierarchy stays intact.
        const navChildKeys = new Set(
            newCurrentQuery
                .filter((col: any) => col.downChild)
                .map((col: any) => `${col.downChild.table_id}.${col.downChild.column_name}`)
        );
        currenQuery.forEach((col: any) => {
            const key = `${col.table_id}.${col.column_name}`;
            if (navChildKeys.has(key) && !newCurrentQuery.find((c: any) => c.table_id === col.table_id && c.column_name === col.column_name)) {
                newCurrentQuery.push(col);
            }
        });

        return newCurrentQuery;

    }

    // Function that receives the axes variable modified by the drag-and-drop component.
    public newAxesOrdering(newAxes) {
        // itemX = vertical axis. If the user drags a parent with children into itemY (horizontal)
        // or itemZ (numeric), we move it back to itemX to enforce the restriction.
        if (newAxes[0]) {
            const navParentNames = new Set(
                this.currentQuery.filter((col: any) => col.downChild).map((col: any) => col.column_name)
            );
            const toMoveToVertical: any[] = [];
            newAxes[0].itemY = newAxes[0].itemY.filter((item: any) => {
                if (navParentNames.has(item.column_name)) { toMoveToVertical.push(item); return false; }
                return true;
            });
            newAxes[0].itemZ = newAxes[0].itemZ.filter((item: any) => {
                if (navParentNames.has(item.column_name)) { toMoveToVertical.push(item); return false; }
                return true;
            });
            if (toMoveToVertical.length) newAxes[0].itemX.push(...toMoveToVertical);
        }

        this.axes = newAxes;
        this.newAxesChanged = true; // Indicates that the generic pivot table will be used.
        const config = this.panelChartConfig.config.getConfig(); // Acquire the config configuration.
        this.currentQuery = this.newCurrentQuery(this.currentQuery, newAxes); // Reorder currentQuery.
        config['ordering'] = [{axes: newAxes}]; // Add the new axes to the config.
        this.copyConfigCrossTable = JSON.parse(JSON.stringify(config));
        QueryUtils.runManualQuery(this) // Executing with the new currentQuery configuration.
    }


    getAttributeTypeIcon(type: string) {
        const icons = {
            numeric: 'mdi-numeric',
            date: 'mdi-calendar-text',
            coordinate: 'mdi-map-marker',
            text: 'mdi-alphabetical',
            html: 'mdi-language-html5'
        };
        return icons[type as keyof typeof icons] || '';
    }

    // New method to control which section is open.
    toggleSection(section: string): void {
        this.sqlIndicationOpenSection = this.sqlIndicationOpenSection === section ? '' : section
    }

    // Method to check if a section is open.
    isSectionOpen(section: string): boolean {
        return this.sqlIndicationOpenSection === section
    }

    // Method that compares the original table with the current one (cross table only).
    isCrosstableModified(): boolean {
        if (this.panelChart?.props?.chartType == 'crosstable' && this.indextab === 1) {
            if(this.dragDrop?.newAxesOrdering.length !== 0)
                return this.dragDrop?.newAxesOrdering!=this.axes;
        }
        return false;
    }

    // Method that executes the apply action for the crosstable.
    makeNewCrosstable() {
        this.dragDrop.temporalExecution();
    }

    // Method that checks whether the crosstable is valid or not.
    isCrosstableValid():boolean {
        return this.dragDrop?.validated;
    }

    toggleGroupBy(): void {        
        if(this.groupByEnabled) {
            const currentQueryLength = this.currentQuery.length
            let isAnAggregation: boolean = false;

            isAnAggregation = this.currentQuery.some((column: any) =>
                column.aggregation_type.some((at: any) =>
                    at.selected && at.value !== 'none'
                )
            );

            if(currentQueryLength !== 0){
                if(isAnAggregation) {
                    this.alertService.addWarning($localize`:@@noAttributeShouldHaveAggregation:Ningún Atributo debe tener agregación`);
                    return;
                }
            } else {
                this.alertService.addWarning($localize`:@@mustConfigureAtLeastOneAttribute:Debe configurar un atributo como mínimo para habilitar esta opción`);
                return
            }
        }
        
        this.groupByEnabled = !this.groupByEnabled;
    }

    dynamicFiltersInteraction(): void {
        this.dynamicFilters = !this.dynamicFilters;
    }

    newCurrentQueryUpdate(event: any) {
        this.currentQuery = event;
    }

    onChartSuggestionSelected(event: { type: string, subType: string }): void {
        const chartType = this.chartUtils.chartTypes.find(
            o => o.value === event.type && o.subValue === event.subType
        );
        if (chartType) {
            this.chartForm.patchValue({ chart: chartType });
        }
        QueryUtils.runManualQuery(this);
        this.indextab = 1;
    }

    principalTableUpdate(event: any) {

        const {principalTable, currentQuery, queryLimit} = event

        this.queryLimit = queryLimit;

        const rootTable = this.tables.find((table: any) => {
            return table.table_name === principalTable;
        })
        
        this.rootTable = _.cloneDeep(rootTable);
        this.userSelectedTable = principalTable;
                
        let columns: any[] = []
        columns = rootTable.columns.filter((col: any) => {
            if(col.visible) return !currentQuery.some((e: any) => e.column_name === col.column_name)
        })

        this.columns = columns;
    }

    newSelectedFiltersUpdate(event: any) {
        const {filteredColumns, selectedFilters} = event
        this.selectedFilters = _.cloneDeep(selectedFilters)
        this.filtredColumns = _.cloneDeep(filteredColumns)
    }

    trackByTable(_index: number, table: any): any {
        return table.value;
    }

    startEditTitle() {
        this.editingTitle = true;
        this.titleClick=true;
    }

    // ─── AND/OR Filter Dialog ────────────────────────────────────────────────

    public filterAndOrDialog(): void {
        const numFilters = this.selectedFilters.length + this.globalFilters.length;
        if (numFilters === 0) {
            this.alertService.addWarning($localize`:@@withoutFilters:Aún no has configurado filtros. Usa el panel de filtros o los filtros globales`);
            return;
        }
        this.display_v.filterAndOr_dialog = true;
    }

    public onCloseFilterAndOrDialog(): void {
        this.display_v.filterAndOr_dialog = false;
    }

    public newSortedFiltersFunction(event: any[]): void {
        this.sortedFilters = event;
        this.display_v.btnSave = true;
    }

    public updateSortedFiltersColumnDialogFunction(e: any): void {
        if (e.add) {
            if (this.sortedFilters.length !== 0) {
                const lastElement = this.sortedFilters[this.sortedFilters.length - 1];
                const newSortedFilter = {
                    cols: 3, rows: 1,
                    y: lastElement.y + 1, x: 0,
                    filter_table: e.filter.filter_table,
                    filter_column: e.filter.filter_column,
                    filter_type: e.filter.filter_type,
                    filter_column_type: e.filter.filter_column_type,
                    filter_elements: e.filter.filter_elements,
                    filter_codes: e.filter.filter_codes,
                    filter_id: e.filter.filter_id,
                    value: 'and',
                };
                this.sortedFilters.push(newSortedFilter);
            }
        } else {
            if (this.sortedFilters.length !== 0) {
                this.alertService.addWarning($localize`:@@filterSettingsReboot:La configuración de filtros se ha reiniciado`);
            }
            this.sortedFilters = [];
        }
    }

    public updateSortedFiltersFilterDialogFunction(e: any): void {
        if (e.add) {
            if (this.sortedFilters.length !== 0) {
                const lastElement = this.sortedFilters[this.sortedFilters.length - 1];
                const newSortedFilter = {
                    cols: 3, rows: 1,
                    y: lastElement.y + 1, x: 0,
                    filter_table: e.filter.filter_table,
                    filter_column: e.filter.filter_column,
                    filter_type: e.filter.filter_type,
                    filter_column_type: e.filter.filter_column_type,
                    filter_elements: e.filter.filter_elements,
                    filter_codes: e.filter.filter_codes,
                    filter_id: e.filter.filter_id,
                    value: 'and',
                };
                this.sortedFilters.push(newSortedFilter);
            }
        } else {
            if (this.sortedFilters.length !== 0) {
                this.alertService.addWarning($localize`:@@filterSettingsReboot:La configuración de filtros se ha reiniciado`);
            }
            this.sortedFilters = [];
        }
    }

    // ─── NAVIGATION FEATURE ────────────────────────────────────────────────────
    // The logic is in NavigationUtils—these are thin wrappers that pass this.
    public buildNavigationLinks(query: any): any[] {
        return NavigationUtils.buildNavigationLinks(this, query);
    }

    public handleNavEvent(event: any): void {
        if (event.navType === 'in') NavigationUtils.handleNavIn(this, event);
        else if (event.navType === 'out') NavigationUtils.handleNavOut(this, event);
    }

    public computeChildNavConfig(): {
        parentFields: string[],
        childFieldMap: { [k: string]: string },
        navColumnSubstitution: { [originalName: string]: string }
    } {
        return NavigationUtils.computeChildNavConfig(this);
    }

    private restoreNavigationLinks(panelContent: any): void {
        NavigationUtils.restoreNavigationLinks(this, panelContent);
    }

    private restoreDateNavState(panelContent: any): void {
        NavigationUtils.restoreDateNavState(this, panelContent);
    }

    private setupQueryContext(panelContent: any): void {
        const { modeSQL } = panelContent.query.query;
        const queryMode = this.selectedQueryMode;
        const isEdaMode = queryMode && queryMode !== 'SQL';
        if (isEdaMode || modeSQL === false) {
            if (queryMode === 'EDA2') {
                this.rootTable = this.tables.find((t: any) => t.table_name === this.rootTable);
                for (const column of panelContent.query.query.fields) {
                    PanelInteractionUtils.assertTable(this, column);
                }
                PanelInteractionUtils.handleCurrentQuery2(this);
            } else {
                this.rootTable = null;
                PanelInteractionUtils.handleCurrentQuery(this);
            }
            this.restoreNavigationLinks(panelContent);
        }
    }

    // ─── END NAVIGATION FEATURE ────────────────────────────────────────────────
}
