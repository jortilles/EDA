import { CdkDragDrop, moveItemInArray } from "@angular/cdk/drag-drop";
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from "@angular/core";
import { EdaPanel } from "@eda/models/model.index";
import { AlertService, ChartUtilsService, DashboardService, FileUtiles, GlobalFiltersService, QueryBuilderService } from "@eda/services/service.index";
import { EdaDatePickerConfig } from "@eda/shared/components/eda-date-picker/datePickerConfig";
/* SDA CUSTOM */ import { DateUtils } from '@eda/services/utils/date-utils.service';
/* SDA CUSTOM */ import { rangeDateFormats } from '@eda/shared/components/date-dialog/date-format-dialog.index';
import * as _ from 'lodash';

@Component({
    selector: 'app-global-filter-dialog',
    templateUrl: './global-filter-dialog.component.html',
    styleUrls: ['../dashboard.component.css']
})
export class GlobalFilterDialogComponent implements OnInit, OnDestroy {
    @Input() globalFilter: any;
    @Input() globalFilterList: any[] = [];
    @Input() dataSource: any;
    public modelTables: any[] = [];
    @Input() panels: EdaPanel[] = [];

    public allPanels: any[] = [];
    public filteredPanels: any[] = [];
    /* SDA CUSTOM */ private _pathBackup: { [panelId: string]: any } = {};

    @Output() close: EventEmitter<any> = new EventEmitter<any>();
    @Output() globalFilterChange: EventEmitter<any> = new EventEmitter<any>();

    public display: boolean = false;

    public dialogHeader: string = $localize`:@@DashboardFilters:FILTROS DEL INFORME`;
    public header1: string = $localize`:@@aplyToAllPanelsH5:¿Aplica a todos los paneles?`;
    public header2: string = $localize`:@@panelsToAplyH5:Paneles para los que aplica el filtro`;
    public header3: string = $localize`:@@filterForH5: Filtrar por`;
    public header4: string = $localize`:@@canIfilter: Visiblidad del filtro`;
    public posicion: string = $localize`:@@positionFilterInReport: Posición del filtro en el informe`;
    public greendot: string = $localize`:@@greendot:Paneles filtrados`;
    public reddot: string = $localize`:@@reddot:Paneles no relacionados`;
    public unselecteddot: string = $localize`:@@unselecteddot:Paneles no filtrados`;
    public aliasValuePh : string = $localize`:@@aliasValuePh: Alias del filtro (opcional)`;

    public tables: any[] = [];
    public selectedTable: any;

    public columns: any[] = [];
    public selectedColumn: any;

    public columnValues: any[] = [];
    public tableNodes: any[] = [];

    public totalValues: any [];

    //valors del dropdown de filtrat de visiblitat
    public publicRoHidden = [
        { label: $localize`:@@public:público`, value: `public` },
        { label: $localize`:@@readOnly:deshabilitado`, value: `readOnly` },
        { label: $localize`:@@hidden:oculto`, value: `hidden` }
    ];

    public formReady: boolean = false;
    public datePickerConfigs: any = {};
    public aliasValue: string = "";

    /* SDA CUSTOM */ public displayDateFormat: boolean = false;
    /* SDA CUSTOM */ public dateFilterOperators: any[] = [];
    /* SDA CUSTOM */ public rangeDateFormat: any[] = [];
    /* SDA CUSTOM */ public filterSelected: any = null;
    /* SDA CUSTOM */ public dateFormatSelected: any = null;
    /* SDA CUSTOM */ public showDateFormatSelecter: boolean = true;
    /* SDA CUSTOM */ public showEdaDatePicker: boolean = false;
    /* SDA CUSTOM */ public showEdaDatePickerSingleSelection: boolean = false;
    /* SDA CUSTOM */ public showEdaDatePickerMultipleSelection: boolean = false;
    /* SDA CUSTOM */ public isDateFormatAvailable: boolean = false;
    /* SDA CUSTOM */ public singleDateValue: Date = null;
    /* SDA CUSTOM */ public multipleDateValues: Date[] = [];

    constructor(
        private globalFilterService: GlobalFiltersService,
        private dashboardService: DashboardService,
        private queryBuilderService: QueryBuilderService,
        private alertService: AlertService,
        private fileUtils: FileUtiles,
        /* SDA CUSTOM */ private dateUtils: DateUtils,
        /* SDA CUSTOM */ private chartUtilsService: ChartUtilsService
    ) { }

    private sortByTittle = (a: any, b: any) => {
        if (a.title < b.title) { return -1; }
        if (a.title > b.title) { return 1; }
        return 0;
    };

    public ngOnInit(): void {
        this.display = true;
        this.modelTables = _.cloneDeep(this.dataSource.model.tables);
        this.modelTables = _.cloneDeep(this.dataSource.model.tables);

        if (this.globalFilter.isnew) {
            this.globalFilter = {
                id: this.fileUtils.generateUUID(),
                isnew: true,
                data: null,
                selectedTable: {},
                selectedColumn: {},
                selectedItems: [],
                selectedIdValues: [],
                panelList: [],
                pathList: {},
                type: '',
                // selectedRange:this.selectedRange,
                isGlobal: true,
                visible: null,
            };

            this.initPanels();
            this.initTablesForFilter();

        } else {
            this.initPanels();
            this.initTablesForFilter();

            const tableName = this.globalFilter.selectedTable.table_name;
            this.globalFilter.selectedTable = _.cloneDeep(this.tables.find((table) => table.table_name == tableName));

            const columnName = this.globalFilter.selectedColumn.column_name;
            // Recupero el display name que le haya podido poner.
            const display_name_alias = this.globalFilter.selectedColumn.display_name.default;

            this.globalFilter.selectedColumn = _.cloneDeep(this.globalFilter.selectedTable.columns.find((col: any) => col.column_name == columnName));


            this.getColumnsByTable();
            /* SDA CUSTOM */ if (this.globalFilter.selectedColumn?.column_type === 'date') {
            /* SDA CUSTOM */     this.loadDatesFromFilter();
            /* SDA CUSTOM */ } else {
            /* SDA CUSTOM */     this.loadColumnValues();
            /* SDA CUSTOM */ }
            this.findPanelPathTables();
            this.aliasValue = display_name_alias;

            /* SDA CUSTOM */ if (this.globalFilter.selectedColumn?.column_type === 'date') {
            /* SDA CUSTOM */     this.initDateFilterConfig();
            /* SDA CUSTOM */ }
        }

        this.formReady = true;
    }

    public ngOnDestroy(): void {
        this.globalFilter = undefined;
        for (const panel of this.panels) {
            if (panel.content) panel.content.globalFilterPaths = []; // Control for the text panels
        }
    }

    public initPanels() {
        this.allPanels = this.globalFilterService.filterPanels(this.modelTables, this.panels);
        this.allPanels = this.allPanels.sort(this.sortByTittle);

        /* SDA CUSTOM */ // Override filterPanels BFS result for SQL panels: set avaliable=true and active=true
        /* SDA CUSTOM */ // so they appear in the dialog exactly like tree panels (highlighted, treeSelect enabled).
        /* SDA CUSTOM */ // Panels without a valid path get deactivated later in findPanelPathTables.
        /* SDA CUSTOM */ for (const panel of this.allPanels) {
        /* SDA CUSTOM */     if (panel.content?.query?.query?.queryMode === 'SQL') {
        /* SDA CUSTOM */         panel.avaliable = true;
        /* SDA CUSTOM */         panel.active = true;
        /* SDA CUSTOM */     }
        /* SDA CUSTOM */     if (panel.content && panel.content.globalFilterPaths === undefined) {
        /* SDA CUSTOM */         panel.content.globalFilterPaths = [];
        /* SDA CUSTOM */     }
        /* SDA CUSTOM */ }

        if (this.globalFilter.isnew) {
            for (const panel of this.allPanels) {
                this.globalFilter.pathList[panel.id] = {
                    selectedTableNodes: {},
                    path: []
                };
            }
        } else {
            for (const panel of this.allPanels) {
                panel.active = this.globalFilter.panelList.includes(panel.id);

                if (!Object.keys(this.globalFilter.pathList).includes(panel.id)) {
                    this.globalFilter.pathList[panel.id] = {
                        selectedTableNodes: {},
                        path: []
                    };
                }
            }
        }

        this.filteredPanels = this.allPanels.filter((p: any) => p.avaliable && p.active);
    }

    public initTablesForFilter() {

        const queryTables = []; // si aparece
        const excludedTables = this.modelTables.filter((t: any) => t.visible === false).map((t: any) => t.table_name); // Si aparece

       // filteredPanels list is empty because all panels are disabled.
        if(this.filteredPanels.length===0){
            for (const panel of this.allPanels) {
                /* SDA CUSTOM */ if (panel.content?.query?.query?.queryMode === 'SQL') continue; // SQL panels handled separately below
                const panelQuery = panel.content.query.query;

                for (const field of panelQuery.fields) {
                    const table_id = field.table_id.split('.')[0];
                    if (!queryTables.includes(table_id)) queryTables.push(table_id);
                }
            }
        } else {
            for (const panel of this.filteredPanels) {
                /* SDA CUSTOM */ if (panel.content?.query?.query?.queryMode === 'SQL') continue; // SQL panels handled separately below
                const panelQuery = panel.content.query.query;

                for (const field of panelQuery.fields) {
                    const table_id = field.table_id.split('.')[0];
                    if (!queryTables.includes(table_id)) queryTables.push(table_id);
                }
            }
        }

        const relatedMap = this.globalFilterService.relatedTables(queryTables, this.modelTables);
        relatedMap.forEach((value: any, key: string) => {
            if (!excludedTables.includes(key)) {
                this.tables.push(value);
            }
        });

        /* SDA CUSTOM */ // Add tables reachable from each SQL panel's origin table (BFS from that origin).
        /* SDA CUSTOM */ // We run a separate relatedTables call per SQL panel so SQL origins never contaminate
        /* SDA CUSTOM */ // the tree-panel BFS (which returns an empty Map if any table is unreachable).
        /* SDA CUSTOM */ for (const panel of this.allPanels) {
        /* SDA CUSTOM */     if (panel.content?.query?.query?.queryMode !== 'SQL') continue;
        /* SDA CUSTOM */     const sqlOrigin: string = panel.content.query.query.fields?.[0]?.table_id?.split('.')[0];
        /* SDA CUSTOM */     if (!sqlOrigin || excludedTables.includes(sqlOrigin)) continue;
        /* SDA CUSTOM */     const sqlRelatedMap = this.globalFilterService.relatedTables([sqlOrigin], this.modelTables);
        /* SDA CUSTOM */     sqlRelatedMap.forEach((value: any, key: string) => {
        /* SDA CUSTOM */         if (!excludedTables.includes(key) && !this.tables.some((t: any) => t.table_name === key)) {
        /* SDA CUSTOM */             this.tables.push(value);
        /* SDA CUSTOM */         }
        /* SDA CUSTOM */     });
        /* SDA CUSTOM */ }

        // this.tables = this.tables.slice();
        this.tables.sort((a, b) => a.display_name.default.localeCompare(b.display_name.default));
    }

    public onAddPanelForFilter(panel: any) {

        if (panel.avaliable) {
            panel.active = !panel.active; /* SDA CUSTOM */ // SQL panels are now activatable
            this.filteredPanels = this.allPanels.filter((p: any) => p.avaliable && p.active);

            if (panel.active) {
                /* SDA CUSTOM */ if (this._pathBackup[panel.id]) {
                /* SDA CUSTOM */     this.globalFilter.pathList[panel.id] = _.cloneDeep(this._pathBackup[panel.id]);
                /* SDA CUSTOM */     delete this._pathBackup[panel.id];
                /* SDA CUSTOM */ }
                /* SDA CUSTOM */ if (this.globalFilter.pathList[panel.id] && !this.isEmpty(this.globalFilter.pathList[panel.id].selectedTableNodes)) {
                /* SDA CUSTOM */     if (!this.globalFilter.panelList.includes(panel.id)) {
                /* SDA CUSTOM */         this.globalFilter.panelList.push(panel.id);
                /* SDA CUSTOM */     }
                /* SDA CUSTOM */ }
                this.initTablesForFilter();
                this.findPanelPathTables();
            }
            else this.clearFilterPaths(panel);
        }

        if (!panel.avaliable) {
            this.clear();

            this.allPanels = this.globalFilterService.filterPanels(this.modelTables, this.panels, panel);
            this.allPanels = this.allPanels.sort(this.sortByTittle);
            this.filteredPanels = this.allPanels.filter((p: any) => p.avaliable && p.active);
            this.initTablesForFilter();
        }
    }

    public onChangeSelectedTable(): void {
        this.globalFilter.selectedColumn = {};
        this.getColumnsByTable();
        this.clearFilterPaths();
    }

    public onChangeSelectedColumn(): void {

        this.globalFilter.selectedItems = [];
        if (this.globalFilter.selectedColumn.column_type == 'date') {
            this.loadDatesFromFilter();
        } else {
            this.loadColumnValues();
        }

        this.findPanelPathTables();
    }

    public getColumnsByTable() {
        this.columns = [];

        this.globalFilter.selectedTable.columns
            .filter((col: any) => col.visible === true)
            .forEach((col: any) => this.columns.push(col));

        this.columns.sort((a, b) => a.value < b.value ? -1 : a.value > b.value ? 1 : 0);
    }

    public async loadColumnValues() {


        const params = {
            table: this.globalFilter.selectedTable.table_name,
            dataSource: this.dataSource._id,
            forSelector: true,
            panel: '',
            filters: []
        };

        try {
            const query = this.queryBuilderService.normalQuery([this.globalFilter.selectedColumn], params);
            const response = await this.dashboardService.executeQuery(query).toPromise();

            /* SDA CUSTOM */ if (!this.globalFilter) return;

            // only if the value is a ValueListSource
            if(this.globalFilter.selectedColumn.valueListSource !== undefined) {
                // Generate all the label and id values for the valueListSource filters.

                this.totalValues = response[1];
                this.columnValues = response[1].filter(item => !!item[0] || item[0] === '').map(item => ({ label: item[0], value: item[0] }));

                if(response[1].filter(item => item[0]?.toString() == '').length == 1) {
                    this.columnValues = this.columnValues.filter(item => item.label !== '' && item.value !== '');
                    this.columnValues.unshift(    { label: $localize`:@@emptyStringTxt:Vacío`  , value:  'emptyString' }  )
                }

            } else {

                if (Array.isArray(response) && response.length > 1) {
                    const data = response[1];
                    this.columnValues = data.filter(item => !!item[0] || item[0] === '').map(item => ({ label: item[0], value: item[0] }));
                }

            }

        } catch (err) {
            this.alertService.addError(err)
            throw err;
        }
    }

    onSelectedItemsChange(event: any) {

        if(this.globalFilter.selectedColumn.valueListSource !== undefined) {
            this.globalFilter.selectedIdValues = event.map((e: any) => {
                const value = this.totalValues.find(tv => e === tv[0]);
                if(value) {
                    return value[1]
                } else {
                    if(e === 'emptyString') return '';
                }

            })
        }

    }

    private loadDatesFromFilter() {
        const filter = this.globalFilter;

        this.datePickerConfigs[filter.id] = new EdaDatePickerConfig();
        const config = this.datePickerConfigs[filter.id];
        config.dateRange = [];
        config.range = filter.selectedRange;
        config.filter = filter;
        if (filter.selectedItems.length > 0) {
            if (!filter.selectedRange) {
                const items: string[] = Array.isArray(filter.selectedItems[0])
                    ? filter.selectedItems[0]
                    : filter.selectedItems;
                /* SDA CUSTOM */ if (filter.dateFilterType === 'in' || filter.dateFilterType === 'not_in') {
                /* SDA CUSTOM */     config.dateRange = items.map((d: string) => new Date(d.replace(/-/g, '/')));
                /* SDA CUSTOM */ } else {
                    const firstDate = items[0];
                    const lastDate = items[items.length - 1];
                    config.dateRange.push(new Date(firstDate.replace(/-/g, '/')));
                    config.dateRange.push(new Date(lastDate.replace(/-/g, '/')));
                /* SDA CUSTOM */ }
            }
        }

        this.initDateFilterConfig();
    }

    public processPickerEvent(event): void {
        if (event.dates) {
            const dtf = new Intl.DateTimeFormat('en', { year: 'numeric', month: '2-digit', day: '2-digit' });
            if (!event.dates[1]) {
                event.dates[1] = event.dates[0];
            }

            let stringRange = [event.dates[0], event.dates[1]]
                .map(date => {
                    let [{ value: mo }, , { value: da }, , { value: ye }] = dtf.formatToParts(date);
                    return `${ye}-${mo}-${da}`
                });

            this.globalFilter.selectedItems = stringRange;
            this.globalFilter.selectedRange = event.range;
        }
    }

    public findPanelPathTables() {
        for (const panel of this.filteredPanels) {
            /* SDA CUSTOM */ if (panel.content?.query?.query?.queryMode === 'SQL') {
            /* SDA CUSTOM */     if (!this.globalFilter.panelList.includes(panel.id)) {
            /* SDA CUSTOM */         this.globalFilter.panelList.push(panel.id);
            /* SDA CUSTOM */     }
            /* SDA CUSTOM */     continue;
            /* SDA CUSTOM */ }
            panel.content.globalFilterPaths = this.globalFilterService.loadTablePaths(this.modelTables, panel);

            /* SDA CUSTOM */ if (this.isPathStaleForPanel(panel)) {
            /* SDA CUSTOM */     this.globalFilter.pathList[panel.id] = { selectedTableNodes: {}, path: [] };
            /* SDA CUSTOM */     this.globalFilter.panelList = this.globalFilter.panelList.filter((id: string) => id !== panel.id);
            /* SDA CUSTOM */ }

            if (this.globalFilter.pathList[panel.id] && this.isEmpty(this.globalFilter.pathList[panel.id].selectedTableNodes)) {
                const panelQuery = panel.content.query.query;
                const rootTable = panelQuery.rootTable;

                if (this.globalFilter.selectedTable.table_name == rootTable) {
                    const node = panel.content.globalFilterPaths[0];

                    this.globalFilter.pathList[panel.id].table_id = node.table_id;
                    this.globalFilter.pathList[panel.id].path = node.joins || [];
                    this.globalFilter.pathList[panel.id].selectedTableNodes = node;

                    if (!this.globalFilter.panelList.includes(panel.id)) this.globalFilter.panelList.push(panel.id);
                /* SDA CUSTOM */} else {
                /* SDA CUSTOM */    this.tryAutoFillSingleHop(panel);
                /* SDA CUSTOM */    if (this.isEmpty(this.globalFilter.pathList[panel.id].selectedTableNodes)) {
                /* SDA CUSTOM */        this.tryCopyPathFromSiblingPanel(panel);
                /* SDA CUSTOM */    }
                /* SDA CUSTOM */}
            }
        }
    }

    /* SDA CUSTOM */private isPathStaleForPanel(panel: any): boolean {
    /* SDA CUSTOM */    const pathEntry = this.globalFilter.pathList[panel.id];
    /* SDA CUSTOM */    if (!pathEntry || this.isEmpty(pathEntry.selectedTableNodes)) return false;
    /* SDA CUSTOM */
    /* SDA CUSTOM */    const currentRootTable = panel.content.query.query.rootTable;
    /* SDA CUSTOM */    if (!currentRootTable) return false; // paneles sin rootTable (ej. SQL): no validar
    /* SDA CUSTOM */
    /* SDA CUSTOM */    const path: any[] = pathEntry.path || [];
    /* SDA CUSTOM */
    /* SDA CUSTOM */    if (path.length === 0) {
    /* SDA CUSTOM */        // 0 saltos: el inicio está en selectedTableNodes.table_id
    /* SDA CUSTOM */        return pathEntry.selectedTableNodes?.table_id !== currentRootTable;
    /* SDA CUSTOM */    } else {
    /* SDA CUSTOM */        // 1+ saltos: el inicio está en la primera parte del primer join
    /* SDA CUSTOM */        return path[0][0]?.split('.')[0] !== currentRootTable;
    /* SDA CUSTOM */    }
    /* SDA CUSTOM */}

    /* SDA CUSTOM */private tryAutoFillSingleHop(panel: any): void {
    /* SDA CUSTOM */    const filterTableName = this.globalFilter.selectedTable?.table_name;
    /* SDA CUSTOM */    const rootTableName = panel.content.query.query.rootTable;
    /* SDA CUSTOM */
    /* SDA CUSTOM */    if (!filterTableName || !rootTableName || filterTableName === rootTableName) return;
    /* SDA CUSTOM */
    /* SDA CUSTOM */    const rootTable = this.modelTables.find((t: any) => t.table_name === rootTableName);
    /* SDA CUSTOM */    if (!rootTable) return;
    /* SDA CUSTOM */
    /* SDA CUSTOM */    // Mirror onNodeExpand: exclude only bridge and autorelation (visible is not a filter in the tree).
    /* SDA CUSTOM */    const directRelations = (rootTable.relations || []).filter((rel: any) =>
    /* SDA CUSTOM */        !rel.bridge && !rel.autorelation && rel.target_table === filterTableName
    /* SDA CUSTOM */    );
    /* SDA CUSTOM */
    /* SDA CUSTOM */    // If multiple relations exist to the same table, use the first primary; user can override manually.
    /* SDA CUSTOM */    if (directRelations.length === 0) return;
    /* SDA CUSTOM */
    /* SDA CUSTOM */    const rel = directRelations[0];
    /* SDA CUSTOM */    const sourceJoin = `${rel.source_table || rootTableName}.${rel.source_column[0]}`;
    /* SDA CUSTOM */    const joinChildId = `${rel.target_table}.${rel.target_column[0]}`;
    /* SDA CUSTOM */    const child_id = `${joinChildId}.${rel.source_column[0]}`;
    /* SDA CUSTOM */    const joins: any[] = [[sourceJoin, joinChildId]];
    /* SDA CUSTOM */
    /* SDA CUSTOM */    const childLabel = rel.display_name?.default || `${rel.source_column[0]} - ${rel.target_table}`;
    /* SDA CUSTOM */
    /* SDA CUSTOM */    const syntheticNode = {
    /* SDA CUSTOM */        child_id,
    /* SDA CUSTOM */        type: 'child',
    /* SDA CUSTOM */        label: childLabel,
    /* SDA CUSTOM */        autorelation: false,
    /* SDA CUSTOM */        joins
    /* SDA CUSTOM */    };
    /* SDA CUSTOM */
    /* SDA CUSTOM */    this.globalFilter.pathList[panel.id].table_id = child_id;
    /* SDA CUSTOM */    this.globalFilter.pathList[panel.id].path = joins;
    /* SDA CUSTOM */    this.globalFilter.pathList[panel.id].selectedTableNodes = syntheticNode;
    /* SDA CUSTOM */
    /* SDA CUSTOM */    if (!this.globalFilter.panelList.includes(panel.id)) {
    /* SDA CUSTOM */        this.globalFilter.panelList.push(panel.id);
    /* SDA CUSTOM */    }
    /* SDA CUSTOM */}

    /* SDA CUSTOM */private tryCopyPathFromSiblingPanel(panel: any): void {
    /* SDA CUSTOM */    const rootTableName = panel.content.query.query.rootTable;
    /* SDA CUSTOM */
    /* SDA CUSTOM */    const sibling = this.filteredPanels.find((p: any) => {
    /* SDA CUSTOM */        if (p.id === panel.id) return false;
    /* SDA CUSTOM */        if (p.content.query.query.rootTable !== rootTableName) return false;
    /* SDA CUSTOM */        const siblingPath = this.globalFilter.pathList[p.id];
    /* SDA CUSTOM */        return siblingPath && !this.isEmpty(siblingPath.selectedTableNodes);
    /* SDA CUSTOM */    });
    /* SDA CUSTOM */
    /* SDA CUSTOM */    if (!sibling) return;
    /* SDA CUSTOM */
    /* SDA CUSTOM */    const siblingPath = this.globalFilter.pathList[sibling.id];
    /* SDA CUSTOM */    this.globalFilter.pathList[panel.id].table_id = siblingPath.table_id;
    /* SDA CUSTOM */    this.globalFilter.pathList[panel.id].path = (siblingPath.path || []).map((j: any[]) => [...j]);
    /* SDA CUSTOM */    this.globalFilter.pathList[panel.id].selectedTableNodes = _.cloneDeep(siblingPath.selectedTableNodes);
    /* SDA CUSTOM */
    /* SDA CUSTOM */    if (!this.globalFilter.panelList.includes(panel.id)) {
    /* SDA CUSTOM */        this.globalFilter.panelList.push(panel.id);
    /* SDA CUSTOM */    }
    /* SDA CUSTOM */}

    /* SDA CUSTOM */private propagatePathToSimilarPanels(sourcePanelId: string, table_id: string, node: any): void {
    /* SDA CUSTOM */    const sourcePanel = this.filteredPanels.find((p: any) => p.id === sourcePanelId);
    /* SDA CUSTOM */    if (!sourcePanel) return;
    /* SDA CUSTOM */
    /* SDA CUSTOM */    const sourceRootTable = sourcePanel.content.query.query.rootTable;
    /* SDA CUSTOM */
    /* SDA CUSTOM */    const nodeSnapshot = {
    /* SDA CUSTOM */        child_id: node.child_id,
    /* SDA CUSTOM */        table_id: node.table_id,
    /* SDA CUSTOM */        type: node.type,
    /* SDA CUSTOM */        label: node.label,
    /* SDA CUSTOM */        autorelation: node.autorelation,
    /* SDA CUSTOM */        joins: (node.joins || []).map((j: any[]) => [...j])
    /* SDA CUSTOM */    };
    /* SDA CUSTOM */
    /* SDA CUSTOM */    for (const panel of this.filteredPanels) {
    /* SDA CUSTOM */        if (panel.id === sourcePanelId) continue;
    /* SDA CUSTOM */
    /* SDA CUSTOM */        const panelRootTable = panel.content.query.query.rootTable;
    /* SDA CUSTOM */        const panelPath = this.globalFilter.pathList[panel.id];
    /* SDA CUSTOM */
    /* SDA CUSTOM */        if (panelRootTable === sourceRootTable && panelPath && this.isEmpty(panelPath.selectedTableNodes)) {
    /* SDA CUSTOM */            panelPath.table_id = table_id;
    /* SDA CUSTOM */            panelPath.path = (node.joins || []).map((j: any[]) => [...j]);
    /* SDA CUSTOM */            panelPath.selectedTableNodes = { ...nodeSnapshot };
    /* SDA CUSTOM */
    /* SDA CUSTOM */            if (!this.globalFilter.panelList.includes(panel.id)) {
    /* SDA CUSTOM */                this.globalFilter.panelList.push(panel.id);
    /* SDA CUSTOM */            }
    /* SDA CUSTOM */        }
    /* SDA CUSTOM */    }
    /* SDA CUSTOM */}

    public onNodeExpand(panel: any, event: any): void {
        const node = event?.node;

        if (node) {
            this.globalFilterService.onNodeExpand(panel.content.globalFilterPaths, node, this.modelTables);
        }
    }

    public onNodeSelect(panel: any, event: any): void {
        const node = event?.node;

        const table_id = node.table_id || node.child_id;
        const pathList = this.globalFilter.pathList;

        if (node.autorelation || this.globalFilter.selectedTable.table_name !== table_id.split('.')[0]) {
            this.alertService.addWarning($localize`:@@invalidPathForm: Ruta incorrecta para el filtro seleccionado`);
            setTimeout(() => {
                pathList[panel.id].table_id = null;
                pathList[panel.id].selectedTableNodes = undefined;
            }, 100);
        } else {
            pathList[panel.id].table_id = table_id;
            pathList[panel.id].path = node.joins || [];

            this.globalFilter.autorelation = node.autorelation;

            if (!this.globalFilter.panelList.includes(panel.id)) {
                this.globalFilter.panelList.push(panel.id);
            }

            /* SDA CUSTOM */ this.propagatePathToSimilarPanels(panel.id, table_id, node);
        }
    }

    public onReorderFilter(event: CdkDragDrop<string[]>): void {
        moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    }

    public removeFilter(filter: any): void {
        filter.isdeleted = true;

        if (this.globalFilter.id == filter.id) {
            this.globalFilter.isdeleted = true;
        }

        // this.selectedValues = [];
        this.globalFilterList.splice(this.globalFilterList.indexOf(filter), 0);
    }

    public getFilterLabel(globalFilter: any): string {
        let label = '';

        if (globalFilter.selectedColumn) {
            label = globalFilter.selectedColumn.display_name.default;
        } else {
            label = globalFilter.column.label;
        }

        return label;
    }

    public isEmpty(obj: any): boolean {
        return Object.keys(obj||{}).length === 0;
    }

    private validateGlobalFilter(): boolean {
        let valid = true;
        if (this.aliasValue != "") this.globalFilter.selectedColumn.display_name.default = this.aliasValue;
        const availablePanels = this.filteredPanels.map((p) => p.id);

        if (!this.globalFilter.isdeleted) {
            for (const key in this.globalFilter.pathList) {
                /* SDA CUSTOM */ const panel = this.filteredPanels.find((p: any) => p.id === key);
                /* SDA CUSTOM */ if (panel?.content?.query?.query?.queryMode === 'SQL') continue;
                if (availablePanels.includes(key) && _.isEmpty(this.globalFilter.pathList[key].selectedTableNodes)) {
                    valid = false;
                }
            }
        }

        return valid;
    }

    private clear(): void {
        this.tables = [];
        this.columns = [];
        this.columnValues = [];
        this.globalFilter.selectedTable = {};
        this.globalFilter.selectedColumn = {};
        this.globalFilter.selectedItems = [];
        this.globalFilter.type = '';
        this.clearFilterPaths();
    }

    private clearFilterPaths(clearPanel?: any) {
        if (clearPanel) {
            this.globalFilter.panelList = this.globalFilter.panelList.filter((p) => p !== clearPanel.id);
            /* SDA CUSTOM */ const current = this.globalFilter.pathList[clearPanel.id];
            /* SDA CUSTOM */ if (current && !this.isEmpty(current.selectedTableNodes)) {
            /* SDA CUSTOM */     this._pathBackup[clearPanel.id] = _.cloneDeep(current);
            /* SDA CUSTOM */ }
            this.globalFilter.pathList[clearPanel.id] = {
                selectedTableNodes: {},
                path: []
            };
            clearPanel.content.globalFilterPaths = [];
        } else {
            this.globalFilter.panelList = [];
            this.globalFilter.pathList = {};
            /* SDA CUSTOM */ this._pathBackup = {};

            for (const panel of this.allPanels) {
                panel.content.globalFilterPaths = [];

                this.globalFilter.pathList[panel.id] = {
                    selectedTableNodes: {},
                    path: []
                };
            }
        }
    }

    public checkNodeSelected(selectedPath: any, node: any) {
        if (node?.child_id && selectedPath?.joins) {
            let selected = false;
            for (const join of selectedPath.joins) {
                if (join[1] == node.child_id) {
                    selected = true;
                }
            }
            return selected;
        } else {
            return false;
        }
    }

    private findTable(tableName: string) {
        return this.modelTables.find((table: any) => table.table_name === tableName);
    }

    /* SDA CUSTOM */public getDisplayPathStr(node: any): string {
    /* SDA CUSTOM */    if (!node) return '&nbsp';

    /* SDA CUSTOM */    if ((node.joins || []).length > 0) {
    /* SDA CUSTOM */        let str = '';
    /* SDA CUSTOM */        for (const join of node.joins) {
    /* SDA CUSTOM */            const table = this.findTable(join[0]?.split('.')[0]);
    /* SDA CUSTOM */            if (table) {
    /* SDA CUSTOM */                str += `<strong>${table.display_name.default}</strong>&nbsp;<i class="pi pi-angle-right"></i>&nbsp;`;
    /* SDA CUSTOM */            }
            }
    /* SDA CUSTOM */        return str + `<strong>${node.label}</strong>`;
    /* SDA CUSTOM */    }

    /* SDA CUSTOM */    return `<strong>${node.label}</strong>`;
    /* SDA CUSTOM */}

    public onApply(): void {
        if (this.globalFilter.selectedColumn?.column_type === 'date') {
            this.saveDateFilterChanges();
        }

        if (this.validateGlobalFilter()) {
            this.globalFilterChange.emit(this.globalFilter);
            this.display = false;
            this.close.emit(true);
        } else {
            this.alertService.addWarning($localize`:@@IncorrectForm:Formulario incorrecto. Revise los campos obligatorios.`);
        }
    }

    public onClose(): void {
        this.display = false;
        this.close.emit(false);
    }

    onOpenDateFormatDialog() {
        this.displayDateFormat = true;
    }

    /* SDA CUSTOM */
    /* SDA CUSTOM */onCloseDateFormatDialog(event: any) {
    /* SDA CUSTOM */    this.displayDateFormat = false;
    /* SDA CUSTOM */    if (!event) return;
    /* SDA CUSTOM */
    /* SDA CUSTOM */    const { dateFormatSet, filterSelected } = event;
    /* SDA CUSTOM */    const dtf = new Intl.DateTimeFormat('en', { year: 'numeric', month: '2-digit', day: '2-digit' });
    /* SDA CUSTOM */    const toStr = (d: Date): string => {
    /* SDA CUSTOM */        const [{ value: mo }, , { value: da }, , { value: ye }] = dtf.formatToParts(d);
    /* SDA CUSTOM */        return `${ye}-${mo}-${da}`;
    /* SDA CUSTOM */    };
    /* SDA CUSTOM */
    /* SDA CUSTOM */    this.globalFilter.dateFilterType = filterSelected.value;
    /* SDA CUSTOM */
    /* SDA CUSTOM */    if (dateFormatSet.dynamic) {
    /* SDA CUSTOM */        const dates = this.dateUtils.getRange(dateFormatSet.dynamicValue);
    /* SDA CUSTOM */        this.globalFilter.selectedRange = dateFormatSet.dynamicValue;
    /* SDA CUSTOM */        this.globalFilter.dynamicValue = dateFormatSet.dynamicValue;
    /* SDA CUSTOM */
    /* SDA CUSTOM */        if (filterSelected.value === 'in' || filterSelected.value === 'not_in') {
    /* SDA CUSTOM */            this.globalFilter.selectedItems = [toStr(dates[0]), toStr(dates[1])];
    /* SDA CUSTOM */        } else {
    /* SDA CUSTOM */            this.globalFilter.selectedItems = [toStr(dates[0]), toStr(dates[1])];
    /* SDA CUSTOM */        }
    /* SDA CUSTOM */    } else {
    /* SDA CUSTOM */        this.globalFilter.selectedRange = null;
    /* SDA CUSTOM */        this.globalFilter.dynamicValue = null;
    /* SDA CUSTOM */
    /* SDA CUSTOM */        const noValueTypes = ['not_null', 'not_null_nor_empty', 'null_or_empty'];
    /* SDA CUSTOM */        if (noValueTypes.includes(filterSelected.value)) {
    /* SDA CUSTOM */            this.globalFilter.selectedItems = [];
    /* SDA CUSTOM */        } else {
    /* SDA CUSTOM */            const val = dateFormatSet.dateValue;
    /* SDA CUSTOM */            const isStaticInNotIn = (filterSelected.value === 'in' || filterSelected.value === 'not_in') && Array.isArray(val.value1);
    /* SDA CUSTOM */            if (isStaticInNotIn) {
    /* SDA CUSTOM */                this.globalFilter.selectedItems = [val.value1];
    /* SDA CUSTOM */            } else {
    /* SDA CUSTOM */                this.globalFilter.selectedItems = val.value2
    /* SDA CUSTOM */                    ? [val.value1, val.value2]
    /* SDA CUSTOM */                    : Array.isArray(val.value1) ? val.value1 : [val.value1];
    /* SDA CUSTOM */            }
    /* SDA CUSTOM */        }
    /* SDA CUSTOM */    }
    /* SDA CUSTOM */}

    /* SDA CUSTOM */
    /* SDA CUSTOM */ getRangeLabel(value: string): string {
    /* SDA CUSTOM */     return rangeDateFormats.find((r: any) => r.value === value)?.label || value;
    /* SDA CUSTOM */ }

/* SDA CUSTOM */
    /* SDA CUSTOM */getDateFormatButtonLabel(filter?: any): string {
    /* SDA CUSTOM */    const gf = filter || this.globalFilter;
    /* SDA CUSTOM */    const op = gf.dateFilterType;
    /* SDA CUSTOM */    if (!op) return 'Date Format';

    /* SDA CUSTOM */    const noValueTypes = ['not_null', 'not_null_nor_empty', 'null_or_empty'];
    /* SDA CUSTOM */    if (noValueTypes.includes(op)) return this.getOperatorLabel(op);

    /* SDA CUSTOM */    const fmt = (s: string) => {
    /* SDA CUSTOM */        if (!s) return '';
    /* SDA CUSTOM */        const [ye, mo, da] = s.split('-');
    /* SDA CUSTOM */        return `${da}-${mo}-${ye.slice(2)}`;
    /* SDA CUSTOM */    };

    /* SDA CUSTOM */    const dynamicValue = gf.dynamicValue || gf.selectedRange;
    /* SDA CUSTOM */    if (dynamicValue && dynamicValue !== 'customDate') {
    /* SDA CUSTOM */        return `${this.getOperatorLabel(op)} : ${this.getRangeLabel(dynamicValue)}`;
    /* SDA CUSTOM */    }

    /* SDA CUSTOM */    const items = gf.selectedItems;
    /* SDA CUSTOM */    if (!items || items.length === 0) return 'Date Format';
    /* SDA CUSTOM */    if (Array.isArray(items[0])) return `${this.getOperatorLabel(op)} : ${(items[0] as string[]).map(fmt).join(', ')}`;
    /* SDA CUSTOM */    if (items.length === 1 || !items[1]) return `${this.getOperatorLabel(op)} : ${fmt(items[0])}`;
    /* SDA CUSTOM */    return `${this.getOperatorLabel(op)} : ${fmt(items[0])} - ${fmt(items[1])}`;
    /* SDA CUSTOM */}

    /* SDA CUSTOM */
    /* SDA CUSTOM */private getOperatorLabel(op: string): string {
    /* SDA CUSTOM */    const labels: Record<string, string> = {
    /* SDA CUSTOM */        'between':           this.chartUtilsService.filterTypesLabels.find((value: any) => value.value === 'between').label,
    /* SDA CUSTOM */        'in':                this.chartUtilsService.filterTypesLabels.find((value: any) => value.value === 'in').label,
    /* SDA CUSTOM */        'not_in':            this.chartUtilsService.filterTypesLabels.find((value: any) => value.value === 'not_in').label,
    /* SDA CUSTOM */        'not_null':          this.chartUtilsService.filterTypesLabels.find((value: any) => value.value === 'not_null').label,
    /* SDA CUSTOM */        'not_null_nor_empty':this.chartUtilsService.filterTypesLabels.find((value: any) => value.value === 'not_null_nor_empty').label,
    /* SDA CUSTOM */        'null_or_empty':     this.chartUtilsService.filterTypesLabels.find((value: any) => value.value === 'null_or_empty').label,
    /* SDA CUSTOM */        '=':                 this.chartUtilsService.filterTypesLabels.find((value: any) => value.value === '=').label,
    /* SDA CUSTOM */        '!=':                this.chartUtilsService.filterTypesLabels.find((value: any) => value.value === '!=').label,
    /* SDA CUSTOM */        '>':                 this.chartUtilsService.filterTypesLabels.find((value: any) => value.value === '>').label,
    /* SDA CUSTOM */        '<':                 this.chartUtilsService.filterTypesLabels.find((value: any) => value.value === '<').label,
    /* SDA CUSTOM */        '>=':                this.chartUtilsService.filterTypesLabels.find((value: any) => value.value === '>=').label,
    /* SDA CUSTOM */        '<=':                this.chartUtilsService.filterTypesLabels.find((value: any) => value.value === '<=').label,
    /* SDA CUSTOM */    };
    /* SDA CUSTOM */    return labels[op] || op;
    /* SDA CUSTOM */}

    /* SDA CUSTOM */ private initDateFilterConfig(): void {
    /* SDA CUSTOM */     this.dateFilterOperators = this.chartUtilsService.filterTypes.filter((ft: any) => ft.value !== 'like' && ft.value !== 'not_like');
    /* SDA CUSTOM */     this.rangeDateFormat = [...rangeDateFormats];
    /* SDA CUSTOM */     this.resetDateFilterUI();
    /* SDA CUSTOM */     this.loadExistingDateFilterValues();
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ private resetDateFilterUI(): void {
    /* SDA CUSTOM */     this.showDateFormatSelecter = true;
    /* SDA CUSTOM */     this.showEdaDatePicker = false;
    /* SDA CUSTOM */     this.showEdaDatePickerSingleSelection = false;
    /* SDA CUSTOM */     this.showEdaDatePickerMultipleSelection = false;
    /* SDA CUSTOM */     this.isDateFormatAvailable = false;
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ private loadExistingDateFilterValues(): void {
    /* SDA CUSTOM */     const gf = this.globalFilter;

    /* SDA CUSTOM */     // Try to find the filter type from various sources
    /* SDA CUSTOM */     let dateFilterType = gf.dateFilterType;
    /* SDA CUSTOM */     
    /* SDA CUSTOM */     // If no dateFilterType, try to infer from selectedItems count
    /* SDA CUSTOM */     if (!dateFilterType && gf.selectedItems?.length > 0) {
    /* SDA CUSTOM */         // If 2 or more items, likely between/not_between or in/not_in
    /* SDA CUSTOM */         dateFilterType = gf.selectedItems.length >= 2 ? 'between' : '=';
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */     
    /* SDA CUSTOM */     // If still no type but has selectedRange, default to between
    /* SDA CUSTOM */     if (!dateFilterType && gf.selectedRange && gf.selectedRange !== 'customDate') {
    /* SDA CUSTOM */         dateFilterType = 'between';
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */     
    /* SDA CUSTOM */     if (!dateFilterType && !gf.selectedItems?.length && !gf.selectedRange) {
    /* SDA CUSTOM */         return;
    /* SDA CUSTOM */     }

    /* SDA CUSTOM */     this.filterSelected = this.dateFilterOperators.find(op => op.value === dateFilterType);

    /* SDA CUSTOM */     if (!this.filterSelected && gf.selectedRange) {
    /* SDA CUSTOM */         const hasMultipleItems = Array.isArray(gf.selectedItems?.[0]) || (gf.selectedItems?.length > 1);
    /* SDA CUSTOM */         this.filterSelected = hasMultipleItems
    /* SDA CUSTOM */             ? this.dateFilterOperators.find(op => op.value === 'not_in')
    /* SDA CUSTOM */             : this.dateFilterOperators.find(op => op.value === 'between');
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */     this.isDateFormatAvailable = true;

    /* SDA CUSTOM */     const noDateNeeded = ['not_null', 'not_null_nor_empty', 'null_or_empty'];
    /* SDA CUSTOM */     if (noDateNeeded.includes(dateFilterType)) {
    /* SDA CUSTOM */         this.isDateFormatAvailable = false;
    /* SDA CUSTOM */         return;
    /* SDA CUSTOM */     }

    /* SDA CUSTOM */     const dynamicValue = gf.dynamicValue || gf.selectedRange;
    /* SDA CUSTOM */     if (dynamicValue && dynamicValue !== 'customDate') {
    /* SDA CUSTOM */         this.dateFormatSelected = this.rangeDateFormat.find(r => r.value === dynamicValue);
    /* SDA CUSTOM */         if (!this.dateFormatSelected) {
    /* SDA CUSTOM */             this.dateFormatSelected = { label: this.getRangeLabel(dynamicValue), value: dynamicValue };
    /* SDA CUSTOM */         }
    /* SDA CUSTOM */         this.adjustRangeForOperator();
    /* SDA CUSTOM */     } else if (dynamicValue === 'customDate' || gf.selectedItems?.length > 0) {
    /* SDA CUSTOM */         this.dateFormatSelected = { label: $localize`:@@DatePickerCustomDate:Seleccionar fecha`, value: 'customDate' };
    /* SDA CUSTOM */         this.adjustRangeForOperator();
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ private adjustRangeForOperator(): void {
    /* SDA CUSTOM */     if (!this.filterSelected) return;

    /* SDA CUSTOM */     const noDateNeeded = ['not_null', 'not_null_nor_empty', 'null_or_empty'];
    /* SDA CUSTOM */     if (noDateNeeded.includes(this.filterSelected.value)) {
    /* SDA CUSTOM */         return;
    /* SDA CUSTOM */     }

    /* SDA CUSTOM */     if(['=', '!=', '>', '<', '>=', '<='].includes(this.filterSelected.value)) {
    /* SDA CUSTOM */         this.showDateFormatSelecter = true;
    /* SDA CUSTOM */         this.showEdaDatePicker = false;
    /* SDA CUSTOM */         this.showEdaDatePickerSingleSelection = false;
    /* SDA CUSTOM */         this.showEdaDatePickerMultipleSelection = false;
    /* SDA CUSTOM */         this.rangeDateFormat = rangeDateFormats.filter((ft: any, index: number) => index < 5);
    /* SDA CUSTOM */         this.rangeDateFormat.push(rangeDateFormats[rangeDateFormats.length - 1]);
    /* SDA CUSTOM */         if (this.dateFormatSelected?.value === 'customDate') {
    /* SDA CUSTOM */             this.showEdaDatePickerSingleSelection = true;
    /* SDA CUSTOM */             this.initDatePickerConfigForExisting();
    /* SDA CUSTOM */         } else if (this.dateFormatSelected && !this.rangeDateFormat.find(r => r.value === this.dateFormatSelected.value)) {
    /* SDA CUSTOM */             this.rangeDateFormat.unshift(this.dateFormatSelected);
    /* SDA CUSTOM */         }
    /* SDA CUSTOM */         return;
    /* SDA CUSTOM */     }

    /* SDA CUSTOM */     if(['in', 'not_in'].includes(this.filterSelected.value)) {
    /* SDA CUSTOM */         this.showDateFormatSelecter = true;
    /* SDA CUSTOM */         this.showEdaDatePicker = false;
    /* SDA CUSTOM */         this.showEdaDatePickerSingleSelection = false;
    /* SDA CUSTOM */         this.showEdaDatePickerMultipleSelection = false;
    /* SDA CUSTOM */         this.rangeDateFormat = rangeDateFormats.filter((ft: any, index: number) => index >= 5);
    /* SDA CUSTOM */         if (this.dateFormatSelected?.value === 'customDate') {
    /* SDA CUSTOM */             this.showEdaDatePickerMultipleSelection = true;
    /* SDA CUSTOM */             this.initDatePickerConfigForExisting();
    /* SDA CUSTOM */         } else if (this.dateFormatSelected && !this.rangeDateFormat.find(r => r.value === this.dateFormatSelected.value)) {
    /* SDA CUSTOM */             this.rangeDateFormat.unshift(this.dateFormatSelected);
    /* SDA CUSTOM */         }
    /* SDA CUSTOM */         return;
    /* SDA CUSTOM */     }

    /* SDA CUSTOM */     if(['between', 'not_between'].includes(this.filterSelected.value)) {
    /* SDA CUSTOM */         this.showDateFormatSelecter = false;
    /* SDA CUSTOM */         this.showEdaDatePicker = true;
    /* SDA CUSTOM */         this.showEdaDatePickerSingleSelection = false;
    /* SDA CUSTOM */         this.showEdaDatePickerMultipleSelection = false;
    /* SDA CUSTOM */         this.initDatePickerConfigForExisting();
    /* SDA CUSTOM */         return;
    /* SDA CUSTOM */     }

    /* SDA CUSTOM */     this.showDateFormatSelecter = true;
    /* SDA CUSTOM */     this.showEdaDatePicker = false;
    /* SDA CUSTOM */     this.showEdaDatePickerSingleSelection = false;
    /* SDA CUSTOM */     this.showEdaDatePickerMultipleSelection = false;
    /* SDA CUSTOM */     this.rangeDateFormat = [...rangeDateFormats];
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ public handleDateFilterOperatorChange(operator: any): void {
    /* SDA CUSTOM */     this.showDateFormatSelecter = true;
    /* SDA CUSTOM */     this.showEdaDatePicker = false;
    /* SDA CUSTOM */     this.showEdaDatePickerSingleSelection = false;
    /* SDA CUSTOM */     this.showEdaDatePickerMultipleSelection = false;

    /* SDA CUSTOM */     if (operator !== undefined && operator !== null) {
    /* SDA CUSTOM */         this.isDateFormatAvailable = true;
    /* SDA CUSTOM */     } else {
    /* SDA CUSTOM */         this.dateFormatSelected = null;
    /* SDA CUSTOM */         this.isDateFormatAvailable = false;
    /* SDA CUSTOM */         this.rangeDateFormat = [];
    /* SDA CUSTOM */         return;
    /* SDA CUSTOM */     }

    /* SDA CUSTOM */     const noDateNeeded = ['not_null', 'not_null_nor_empty', 'null_or_empty'];
    /* SDA CUSTOM */     if (noDateNeeded.includes(operator.value)) {
    /* SDA CUSTOM */         this.isDateFormatAvailable = false;
    /* SDA CUSTOM */         this.showEdaDatePicker = false;
    /* SDA CUSTOM */         this.showEdaDatePickerSingleSelection = false;
    /* SDA CUSTOM */         this.showEdaDatePickerMultipleSelection = false;
    /* SDA CUSTOM */         return;
    /* SDA CUSTOM */     }

    /* SDA CUSTOM */     if(['=', '!=', '>', '<', '>=', '<='].includes(operator.value)) {
    /* SDA CUSTOM */         this.dateFormatSelected = null;
    /* SDA CUSTOM */         this.rangeDateFormat = rangeDateFormats.filter((ft: any, index: number) => index < 5);
    /* SDA CUSTOM */         this.rangeDateFormat.push(rangeDateFormats[rangeDateFormats.length - 1]);
    /* SDA CUSTOM */         return;
    /* SDA CUSTOM */     }

    /* SDA CUSTOM */     if(['in', 'not_in'].includes(operator.value)) {
    /* SDA CUSTOM */         this.dateFormatSelected = null;
    /* SDA CUSTOM */         this.rangeDateFormat = rangeDateFormats.filter((ft: any, index: number) => index >= 5);
    /* SDA CUSTOM */         return;
    /* SDA CUSTOM */     }

    /* SDA CUSTOM */     if(['between', 'not_between'].includes(operator.value)) {
    /* SDA CUSTOM */         this.dateFormatSelected = { label: $localize`:@@DatePickerCustomDate:Seleccionar fecha`, value: 'customDate' };
    /* SDA CUSTOM */         this.showDateFormatSelecter = false;
    /* SDA CUSTOM */         this.showEdaDatePicker = true;
    /* SDA CUSTOM */         this.initDatePickerConfigForExisting();
    /* SDA CUSTOM */         return;
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ public handleDateFilterFormatChange(format: any): void {
    /* SDA CUSTOM */     this.showEdaDatePickerSingleSelection = false;
    /* SDA CUSTOM */     this.showEdaDatePickerMultipleSelection = false;

    /* SDA CUSTOM */     if (!format) {
    /* SDA CUSTOM */         this.globalFilter.selectedRange = null;
    /* SDA CUSTOM */         return;
    /* SDA CUSTOM */     }

    /* SDA CUSTOM */     if(['=', '!=', '>', '<', '>=', '<='].includes(this.filterSelected?.value) && format.value === 'customDate') {
    /* SDA CUSTOM */         this.showEdaDatePickerSingleSelection = true;
    /* SDA CUSTOM */         this.initDatePickerConfigForExisting();
    /* SDA CUSTOM */         return;
    /* SDA CUSTOM */     }

    /* SDA CUSTOM */     if(['in', 'not_in'].includes(this.filterSelected?.value) && format.value === 'customDate') {
    /* SDA CUSTOM */         this.showEdaDatePickerMultipleSelection = true;
    /* SDA CUSTOM */         this.initDatePickerConfigForExisting();
    /* SDA CUSTOM */         return;
    /* SDA CUSTOM */     }

    /* SDA CUSTOM */     this.globalFilter.selectedRange = format.value;
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ private initDatePickerConfigForExisting(): void {
    /* SDA CUSTOM */     const filter = this.globalFilter;
    /* SDA CUSTOM */     this.datePickerConfigs[filter.id] = new EdaDatePickerConfig();
    /* SDA CUSTOM */     const config = this.datePickerConfigs[filter.id];
    /* SDA CUSTOM */     config.dateRange = [];
    /* SDA CUSTOM */     config.range = null;

    /* SDA CUSTOM */     if (filter.selectedItems?.length > 0) {
    /* SDA CUSTOM */         const items = Array.isArray(filter.selectedItems[0]) ? filter.selectedItems[0] : filter.selectedItems;
    /* SDA CUSTOM */         /* SDA CUSTOM */ if (this.filterSelected?.value === 'in' || this.filterSelected?.value === 'not_in') {
    /* SDA CUSTOM */             /* SDA CUSTOM */ config.dateRange = items.map((d: string) => new Date(d.replace(/-/g, '/')));
    /* SDA CUSTOM */         } else {
    /* SDA CUSTOM */             const firstDate = items[0];
    /* SDA CUSTOM */             const lastDate = items[items.length - 1];
    /* SDA CUSTOM */             if (firstDate) config.dateRange.push(new Date(firstDate.replace(/-/g, '/')));
    /* SDA CUSTOM */             if (lastDate) config.dateRange.push(new Date(lastDate.replace(/-/g, '/')));
    /* SDA CUSTOM */         }
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ public saveDateFilterChanges(): void {
    /* SDA CUSTOM */     if (this.globalFilter.selectedColumn?.column_type !== 'date') return;
    /* SDA CUSTOM */     if (!this.filterSelected) return;

    /* SDA CUSTOM */     this.globalFilter.dateFilterType = this.filterSelected.value;

    /* SDA CUSTOM */     const noDateNeeded = ['not_null', 'not_null_nor_empty', 'null_or_empty'];
    /* SDA CUSTOM */     if (noDateNeeded.includes(this.filterSelected.value)) {
    /* SDA CUSTOM */         this.globalFilter.selectedRange = null;
    /* SDA CUSTOM */         this.globalFilter.dynamicValue = null;
    /* SDA CUSTOM */         this.globalFilter.selectedItems = [];
    /* SDA CUSTOM */         return;
    /* SDA CUSTOM */     }

    /* SDA CUSTOM */     if (this.dateFormatSelected && this.dateFormatSelected.value !== 'customDate') {
    /* SDA CUSTOM */         this.globalFilter.selectedRange = this.dateFormatSelected.value;
    /* SDA CUSTOM */         this.globalFilter.dynamicValue = this.dateFormatSelected.value;
    /* SDA CUSTOM */         const dates = this.dateUtils.getRange(this.dateFormatSelected.value);
    /* SDA CUSTOM */         const dtf = new Intl.DateTimeFormat('en', { year: 'numeric', month: '2-digit', day: '2-digit' });
    /* SDA CUSTOM */         const toStr = (d: Date): string => {
    /* SDA CUSTOM */             const [{ value: mo }, , { value: da }, , { value: ye }] = dtf.formatToParts(d);
    /* SDA CUSTOM */             return `${ye}-${mo}-${da}`;
    /* SDA CUSTOM */         };
    /* SDA CUSTOM */         this.globalFilter.selectedItems = [toStr(dates[0]), toStr(dates[1])];
    /* SDA CUSTOM */     } else {
    /* SDA CUSTOM */         // Static date selected via inline picker: clear dynamic values
    /* SDA CUSTOM */         this.globalFilter.selectedRange = null;
    /* SDA CUSTOM */         this.globalFilter.dynamicValue = null;
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ public onApplyDateFilterFromPicker(event: any): void {
    /* SDA CUSTOM */     if (!event.dates) return;
    /* SDA CUSTOM */     const dtf = new Intl.DateTimeFormat('en', { year: 'numeric', month: '2-digit', day: '2-digit' });
    /* SDA CUSTOM */     const dates = Array.isArray(event.dates) ? event.dates : [event.dates, event.dates];
    /* SDA CUSTOM */     if (!dates[1]) dates[1] = dates[0];
    /* SDA CUSTOM */     const stringRange = dates.map(date => {
    /* SDA CUSTOM */         const [{ value: mo }, , { value: da }, , { value: ye }] = dtf.formatToParts(date);
    /* SDA CUSTOM */         return `${ye}-${mo}-${da}`;
    /* SDA CUSTOM */     });
    /* SDA CUSTOM */     const singleValueOps = ['=', '!=', '>', '<', '>=', '<='];
    /* SDA CUSTOM */     const multiValueOps = ['in', 'not_in'];
    /* SDA CUSTOM */     if (singleValueOps.includes(this.filterSelected?.value)) {
    /* SDA CUSTOM */         this.globalFilter.selectedItems = [stringRange[0]];
    /* SDA CUSTOM */         this.globalFilter.selectedRange = 'customDate';
    /* SDA CUSTOM */         this.globalFilter.dynamicValue = null;
    /* SDA CUSTOM */     } else if (multiValueOps.includes(this.filterSelected?.value)) {
    /* SDA CUSTOM */         this.globalFilter.selectedItems = [stringRange];
    /* SDA CUSTOM */         this.globalFilter.selectedRange = 'customDate';
    /* SDA CUSTOM */         this.globalFilter.dynamicValue = null;
    /* SDA CUSTOM */     } else {
    /* SDA CUSTOM */         this.globalFilter.selectedItems = stringRange;
    /* SDA CUSTOM */         this.globalFilter.selectedRange = event.range;
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ public onSingleDateSelected(date: Date): void {
    /* SDA CUSTOM */     if (!date) return;
    /* SDA CUSTOM */     const dtf = new Intl.DateTimeFormat('en', { year: 'numeric', month: '2-digit', day: '2-digit' });
    /* SDA CUSTOM */     const [{ value: mo }, , { value: da }, , { value: ye }] = dtf.formatToParts(date);
    /* SDA CUSTOM */     const dateStr = `${ye}-${mo}-${da}`;
    /* SDA CUSTOM */     this.globalFilter.selectedItems = [dateStr];
    /* SDA CUSTOM */     this.globalFilter.selectedRange = 'customDate';
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ public onMultipleDateSelected(dates: Date[]): void {
    /* SDA CUSTOM */     if (!dates || dates.length === 0) return;
    /* SDA CUSTOM */     const dtf = new Intl.DateTimeFormat('en', { year: 'numeric', month: '2-digit', day: '2-digit' });
    /* SDA CUSTOM */     const stringDates = dates.map(date => {
    /* SDA CUSTOM */         const [{ value: mo }, , { value: da }, , { value: ye }] = dtf.formatToParts(date);
    /* SDA CUSTOM */         return `${ye}-${mo}-${da}`;
    /* SDA CUSTOM */     });
    /* SDA CUSTOM */     this.globalFilter.selectedItems = [stringDates];
    /* SDA CUSTOM */     this.globalFilter.selectedRange = 'customDate';
    /* SDA CUSTOM */ }

}
