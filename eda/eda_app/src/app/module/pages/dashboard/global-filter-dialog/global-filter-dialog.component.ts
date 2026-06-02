import { CdkDragDrop, moveItemInArray } from "@angular/cdk/drag-drop";
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from "@angular/core";
import { EdaPanel } from "@eda/models/model.index";
import { AlertService, DashboardService, FileUtiles, GlobalFiltersService, QueryBuilderService } from "@eda/services/service.index";
import { EdaDatePickerConfig } from "@eda/shared/components/eda-date-picker/datePickerConfig";
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
    /*SDA CUSTOM*/ private _pathBackup: { [panelId: string]: any } = {};

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

    constructor(
        private globalFilterService: GlobalFiltersService,
        private dashboardService: DashboardService,
        private queryBuilderService: QueryBuilderService,
        private alertService: AlertService,
        private fileUtils: FileUtiles,
    ) { }

    private sortByTittle = (a: any, b: any) => {
        if (a.title < b.title) { return -1; }
        if (a.title > b.title) { return 1; }
        return 0;
    };

    public ngOnInit(): void {
        this.display = true;
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
            this.loadColumnValues();
            this.findPanelPathTables();
            this.aliasValue = display_name_alias;
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

        if (this.globalFilter.isnew) {
            for (const panel of this.allPanels) {

                // Desactivando el panel en caso de que sea de modo SQL.
                if(panel.content.query.query.queryMode === 'SQL') {
                    panel.active = false;
                }

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
                const panelQuery = panel.content.query.query;
    
                for (const field of panelQuery.fields) {
                    const table_id = field.table_id.split('.')[0];
                    if (!queryTables.includes(table_id)) queryTables.push(table_id);
                }
            }
        } else {
            for (const panel of this.filteredPanels) {
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

        // this.tables = this.tables.slice();
        this.tables.sort((a, b) => a.display_name.default.localeCompare(b.display_name.default));
    }

    public onAddPanelForFilter(panel: any) {

        if (panel.avaliable) {
            if(panel.content.query.query.queryMode != 'SQL') { // los paneles SQL no se pueden activar
                panel.active = !panel.active;
            }
            this.filteredPanels = this.allPanels.filter((p: any) => p.avaliable && p.active);

            if (panel.active) {
                /*SDA CUSTOM*/ if (this._pathBackup[panel.id]) {
                /*SDA CUSTOM*/     this.globalFilter.pathList[panel.id] = _.cloneDeep(this._pathBackup[panel.id]);
                /*SDA CUSTOM*/     delete this._pathBackup[panel.id];
                /*SDA CUSTOM*/ }
                /*SDA CUSTOM*/ if (this.globalFilter.pathList[panel.id] && !this.isEmpty(this.globalFilter.pathList[panel.id].selectedTableNodes)) {
                /*SDA CUSTOM*/     if (!this.globalFilter.panelList.includes(panel.id)) {
                /*SDA CUSTOM*/         this.globalFilter.panelList.push(panel.id);
                /*SDA CUSTOM*/     }
                /*SDA CUSTOM*/ }
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
                let firstDate = filter.selectedItems[0];
                let lastDate = filter.selectedItems[filter.selectedItems.length - 1];
                config.dateRange.push(new Date(firstDate.replace(/-/g, '/')));
                config.dateRange.push(new Date(lastDate.replace(/-/g, '/')));
            }
        }
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
            panel.content.globalFilterPaths = this.globalFilterService.loadTablePaths(this.modelTables, panel);

            /*SDA CUSTOM*/ if (this.isPathStaleForPanel(panel)) {
            /*SDA CUSTOM*/     this.globalFilter.pathList[panel.id] = { selectedTableNodes: {}, path: [] };
            /*SDA CUSTOM*/     this.globalFilter.panelList = this.globalFilter.panelList.filter((id: string) => id !== panel.id);
            /*SDA CUSTOM*/ }

            if (this.globalFilter.pathList[panel.id] && this.isEmpty(this.globalFilter.pathList[panel.id].selectedTableNodes)) {
                const panelQuery = panel.content.query.query;
                const rootTable = panelQuery.rootTable;

                if (this.globalFilter.selectedTable.table_name == rootTable) {
                    const node = panel.content.globalFilterPaths[0];

                    this.globalFilter.pathList[panel.id].table_id = node.table_id;
                    this.globalFilter.pathList[panel.id].path = node.joins || [];
                    this.globalFilter.pathList[panel.id].selectedTableNodes = node;

                    if (!this.globalFilter.panelList.includes(panel.id)) this.globalFilter.panelList.push(panel.id);
                /*SDA CUSTOM*/} else {
                /*SDA CUSTOM*/    this.tryAutoFillSingleHop(panel);
                /*SDA CUSTOM*/    if (this.isEmpty(this.globalFilter.pathList[panel.id].selectedTableNodes)) {
                /*SDA CUSTOM*/        this.tryCopyPathFromSiblingPanel(panel);
                /*SDA CUSTOM*/    }
                /*SDA CUSTOM*/}
            }
        }
    }

    /*SDA CUSTOM*/private isPathStaleForPanel(panel: any): boolean {
    /*SDA CUSTOM*/    const pathEntry = this.globalFilter.pathList[panel.id];
    /*SDA CUSTOM*/    if (!pathEntry || this.isEmpty(pathEntry.selectedTableNodes)) return false;
    /*SDA CUSTOM*/
    /*SDA CUSTOM*/    const currentRootTable = panel.content.query.query.rootTable;
    /*SDA CUSTOM*/    if (!currentRootTable) return false; // paneles sin rootTable (ej. SQL): no validar
    /*SDA CUSTOM*/
    /*SDA CUSTOM*/    const path: any[] = pathEntry.path || [];
    /*SDA CUSTOM*/
    /*SDA CUSTOM*/    if (path.length === 0) {
    /*SDA CUSTOM*/        // 0 saltos: el inicio está en selectedTableNodes.table_id
    /*SDA CUSTOM*/        return pathEntry.selectedTableNodes?.table_id !== currentRootTable;
    /*SDA CUSTOM*/    } else {
    /*SDA CUSTOM*/        // 1+ saltos: el inicio está en la primera parte del primer join
    /*SDA CUSTOM*/        return path[0][0]?.split('.')[0] !== currentRootTable;
    /*SDA CUSTOM*/    }
    /*SDA CUSTOM*/}

    /*SDA CUSTOM*/private tryAutoFillSingleHop(panel: any): void {
    /*SDA CUSTOM*/    const filterTableName = this.globalFilter.selectedTable?.table_name;
    /*SDA CUSTOM*/    const rootTableName = panel.content.query.query.rootTable;
    /*SDA CUSTOM*/
    /*SDA CUSTOM*/    if (!filterTableName || !rootTableName || filterTableName === rootTableName) return;
    /*SDA CUSTOM*/
    /*SDA CUSTOM*/    const rootTable = this.modelTables.find((t: any) => t.table_name === rootTableName);
    /*SDA CUSTOM*/    if (!rootTable) return;
    /*SDA CUSTOM*/
    /*SDA CUSTOM*/    // Mirror onNodeExpand: exclude only bridge and autorelation (visible is not a filter in the tree).
    /*SDA CUSTOM*/    const directRelations = (rootTable.relations || []).filter((rel: any) =>
    /*SDA CUSTOM*/        !rel.bridge && !rel.autorelation && rel.target_table === filterTableName
    /*SDA CUSTOM*/    );
    /*SDA CUSTOM*/
    /*SDA CUSTOM*/    // If multiple relations exist to the same table, use the first primary; user can override manually.
    /*SDA CUSTOM*/    if (directRelations.length === 0) return;
    /*SDA CUSTOM*/
    /*SDA CUSTOM*/    const rel = directRelations[0];
    /*SDA CUSTOM*/    const sourceJoin = `${rel.source_table || rootTableName}.${rel.source_column[0]}`;
    /*SDA CUSTOM*/    const joinChildId = `${rel.target_table}.${rel.target_column[0]}`;
    /*SDA CUSTOM*/    const child_id = `${joinChildId}.${rel.source_column[0]}`;
    /*SDA CUSTOM*/    const joins: any[] = [[sourceJoin, joinChildId]];
    /*SDA CUSTOM*/
    /*SDA CUSTOM*/    const childLabel = rel.display_name?.default || `${rel.source_column[0]} - ${rel.target_table}`;
    /*SDA CUSTOM*/
    /*SDA CUSTOM*/    const syntheticNode = {
    /*SDA CUSTOM*/        child_id,
    /*SDA CUSTOM*/        type: 'child',
    /*SDA CUSTOM*/        label: childLabel,
    /*SDA CUSTOM*/        autorelation: false,
    /*SDA CUSTOM*/        joins
    /*SDA CUSTOM*/    };
    /*SDA CUSTOM*/
    /*SDA CUSTOM*/    this.globalFilter.pathList[panel.id].table_id = child_id;
    /*SDA CUSTOM*/    this.globalFilter.pathList[panel.id].path = joins;
    /*SDA CUSTOM*/    this.globalFilter.pathList[panel.id].selectedTableNodes = syntheticNode;
    /*SDA CUSTOM*/
    /*SDA CUSTOM*/    if (!this.globalFilter.panelList.includes(panel.id)) {
    /*SDA CUSTOM*/        this.globalFilter.panelList.push(panel.id);
    /*SDA CUSTOM*/    }
    /*SDA CUSTOM*/}

    /*SDA CUSTOM*/private tryCopyPathFromSiblingPanel(panel: any): void {
    /*SDA CUSTOM*/    const rootTableName = panel.content.query.query.rootTable;
    /*SDA CUSTOM*/
    /*SDA CUSTOM*/    const sibling = this.filteredPanels.find((p: any) => {
    /*SDA CUSTOM*/        if (p.id === panel.id) return false;
    /*SDA CUSTOM*/        if (p.content.query.query.rootTable !== rootTableName) return false;
    /*SDA CUSTOM*/        const siblingPath = this.globalFilter.pathList[p.id];
    /*SDA CUSTOM*/        return siblingPath && !this.isEmpty(siblingPath.selectedTableNodes);
    /*SDA CUSTOM*/    });
    /*SDA CUSTOM*/
    /*SDA CUSTOM*/    if (!sibling) return;
    /*SDA CUSTOM*/
    /*SDA CUSTOM*/    const siblingPath = this.globalFilter.pathList[sibling.id];
    /*SDA CUSTOM*/    this.globalFilter.pathList[panel.id].table_id = siblingPath.table_id;
    /*SDA CUSTOM*/    this.globalFilter.pathList[panel.id].path = (siblingPath.path || []).map((j: any[]) => [...j]);
    /*SDA CUSTOM*/    this.globalFilter.pathList[panel.id].selectedTableNodes = _.cloneDeep(siblingPath.selectedTableNodes);
    /*SDA CUSTOM*/
    /*SDA CUSTOM*/    if (!this.globalFilter.panelList.includes(panel.id)) {
    /*SDA CUSTOM*/        this.globalFilter.panelList.push(panel.id);
    /*SDA CUSTOM*/    }
    /*SDA CUSTOM*/}

    /*SDA CUSTOM*/private propagatePathToSimilarPanels(sourcePanelId: string, table_id: string, node: any): void {
    /*SDA CUSTOM*/    const sourcePanel = this.filteredPanels.find((p: any) => p.id === sourcePanelId);
    /*SDA CUSTOM*/    if (!sourcePanel) return;
    /*SDA CUSTOM*/
    /*SDA CUSTOM*/    const sourceRootTable = sourcePanel.content.query.query.rootTable;
    /*SDA CUSTOM*/
    /*SDA CUSTOM*/    const nodeSnapshot = {
    /*SDA CUSTOM*/        child_id: node.child_id,
    /*SDA CUSTOM*/        table_id: node.table_id,
    /*SDA CUSTOM*/        type: node.type,
    /*SDA CUSTOM*/        label: node.label,
    /*SDA CUSTOM*/        autorelation: node.autorelation,
    /*SDA CUSTOM*/        joins: (node.joins || []).map((j: any[]) => [...j])
    /*SDA CUSTOM*/    };
    /*SDA CUSTOM*/
    /*SDA CUSTOM*/    for (const panel of this.filteredPanels) {
    /*SDA CUSTOM*/        if (panel.id === sourcePanelId) continue;
    /*SDA CUSTOM*/
    /*SDA CUSTOM*/        const panelRootTable = panel.content.query.query.rootTable;
    /*SDA CUSTOM*/        const panelPath = this.globalFilter.pathList[panel.id];
    /*SDA CUSTOM*/
    /*SDA CUSTOM*/        if (panelRootTable === sourceRootTable && panelPath && this.isEmpty(panelPath.selectedTableNodes)) {
    /*SDA CUSTOM*/            panelPath.table_id = table_id;
    /*SDA CUSTOM*/            panelPath.path = (node.joins || []).map((j: any[]) => [...j]);
    /*SDA CUSTOM*/            panelPath.selectedTableNodes = { ...nodeSnapshot };
    /*SDA CUSTOM*/
    /*SDA CUSTOM*/            if (!this.globalFilter.panelList.includes(panel.id)) {
    /*SDA CUSTOM*/                this.globalFilter.panelList.push(panel.id);
    /*SDA CUSTOM*/            }
    /*SDA CUSTOM*/        }
    /*SDA CUSTOM*/    }
    /*SDA CUSTOM*/}

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

            /*SDA CUSTOM*/ this.propagatePathToSimilarPanels(panel.id, table_id, node);
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
            /*SDA CUSTOM*/ const current = this.globalFilter.pathList[clearPanel.id];
            /*SDA CUSTOM*/ if (current && !this.isEmpty(current.selectedTableNodes)) {
            /*SDA CUSTOM*/     this._pathBackup[clearPanel.id] = _.cloneDeep(current);
            /*SDA CUSTOM*/ }
            this.globalFilter.pathList[clearPanel.id] = {
                selectedTableNodes: {},
                path: []
            };
            clearPanel.content.globalFilterPaths = [];
        } else {
            this.globalFilter.panelList = [];
            this.globalFilter.pathList = {};
            /*SDA CUSTOM*/ this._pathBackup = {};

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

    /*SDA CUSTOM*/public getDisplayPathStr(node: any): string {
    /*SDA CUSTOM*/    if (!node) return '&nbsp';

    /*SDA CUSTOM*/    if ((node.joins || []).length > 0) {
    /*SDA CUSTOM*/        let str = '';
    /*SDA CUSTOM*/        for (const join of node.joins) {
    /*SDA CUSTOM*/            const table = this.findTable(join[0]?.split('.')[0]);
    /*SDA CUSTOM*/            if (table) {
    /*SDA CUSTOM*/                str += `<strong>${table.display_name.default}</strong>&nbsp;<i class="pi pi-angle-right"></i>&nbsp;`;
    /*SDA CUSTOM*/            }
            }
    /*SDA CUSTOM*/        return str + `<strong>${node.label}</strong>`;
    /*SDA CUSTOM*/    }

    /*SDA CUSTOM*/    return `<strong>${node.label}</strong>`;
    /*SDA CUSTOM*/}

    public onApply(): void {
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

}
