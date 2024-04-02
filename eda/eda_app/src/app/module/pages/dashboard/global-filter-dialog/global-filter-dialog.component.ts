import { CdkDragDrop, moveItemInArray } from "@angular/cdk/drag-drop";
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from "@angular/core";
import { EdaPanel } from "@eda/models/model.index";
import { AlertService, DashboardService, FileUtiles, GlobalFiltersService, QueryBuilderService } from "@eda/services/service.index";
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

    public tables: any[] = [];
    public selectedTable: any;

    public columns: any[] = [];
    public selectedColumn: any;

    public columnValues: any[] = [];
    public tableNodes: any[] = [];


    public formReady: boolean = false;

    constructor(
        private globalFilterService: GlobalFiltersService,
        private dashboardService: DashboardService,
        private queryBuilderService: QueryBuilderService,
        private alertService: AlertService,
        private fileUtils: FileUtiles,
    ) {  }

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
                panelList: [],
                pathList: {},
                type: '',
                // selectedRange:this.selectedRange,
                isGlobal: true,
                // applyToAll: !this.applyToAll,
                // visible: this.publicRoHiddenOption,
            };

            this.initPanels();
            this.initTablesForFilter();
        } else {
            this.initPanels();
            this.initTablesForFilter();

            const tableName = this.globalFilter.selectedTable.table_name;
            this.globalFilter.selectedTable = _.cloneDeep(this.tables.find((table) => table.table_name == tableName));
            
            const columnName = this.globalFilter.selectedColumn.column_name;
            this.globalFilter.selectedColumn = _.cloneDeep(this.globalFilter.selectedTable.columns.find((col: any) => col.column_name == columnName));

            this.getColumnsByTable();
            this.loadColumnValues();
            this.findPanelPathTables();
        }

        this.formReady = true;
    }

    public ngOnDestroy(): void {
        this.globalFilter = undefined;
        for (const panel of this.panels) {
            panel.content.globalFilterPaths = []
        }
    }

    public initPanels() {
        this.allPanels = this.globalFilterService.filterPanels(this.modelTables, this.panels);
        this.allPanels = this.allPanels.sort(this.sortByTittle);
        this.filteredPanels = this.allPanels.filter((p: any) => p.avaliable === true && p.active === true);
        
        if (this.globalFilter.isnew) {
            for (const panel of this.allPanels) {
                this.globalFilter.pathList[panel.id] = {
                    selectedTableNodes: {},
                    path: []
                };
            }
        }
    }

    public initTablesForFilter() {
        const queryTables = [];
        const excludedTables = this.modelTables.filter((t: any) => t.visible === false).map((t: any) => t.table_name);

        for (const panel of this.filteredPanels) {
            //tables const tmpPanel = this.params.panels.find(p => p.id === panel.id);
            const panelQuery = panel.content.query.query;
            
            for (const field of panelQuery.fields) {
                const table_id = field.table_id.split('.')[0];
                if (!queryTables.includes(table_id)) queryTables.push(table_id);
            }
        }

        const relatedMap = this.globalFilterService.relatedTables(queryTables, this.modelTables);
        relatedMap.forEach((value: any, key: string) => {
            if (!excludedTables.includes(key)) {
                this.tables.push(value);
            }
        });

        // this.tables = this.tables.slice();
        this.tables.sort((a, b) => a.value < b.value ? -1 : a.value > b.value ? 1 : 0);
    }

    public onAddPanelForFilter(panel: any) {
        if (!panel.avaliable) {
            this.clear();

            this.allPanels = this.globalFilterService.filterPanels(this.modelTables, this.panels, panel);
            this.allPanels = this.allPanels.sort(this.sortByTittle);
            this.filteredPanels = this.allPanels.filter((p: any) => p.avaliable === true && p.active === true);
            this.initTablesForFilter();
        }

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

            if (Array.isArray(response) && response.length > 1) {
                const data = response[1];
                this.columnValues = data.filter(item => !!item[0]).map(item => ({ label: item[0], value: item[0] }));
            }
        } catch (err) {
            this.alertService.addError(err)
            throw err;
        }
    }

    public findPanelPathTables() {
        for (const panel of this.filteredPanels) {
            panel.content.globalFilterPaths = this.globalFilterService.loadTablePaths(this.modelTables, panel);
        }
    }

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

        if (this.globalFilter.selectedTable.table_name !== table_id.split('.')[0]) {
            this.alertService.addWarning(`Invalid path for selected filter`);
            pathList[panel.id].selectedTableNodes = undefined;
        } else {
            pathList[panel.id].table_id = table_id;
            pathList[panel.id].path = node.joins || [];
            
            if (!this.globalFilter.panelList.includes(panel.id)) {~
                this.globalFilter.panelList.push(panel.id);
            }
    
            // const existsPath = pathList.find((path: any) => path.panel_id == panel.id);
            // pathList.push({ panel_id: panel.id, path: node.joins || [] });
            // this.globalFilter.table_id = table_id;
        }
    }

    public onReorderFilter(event: CdkDragDrop<string[]>): void {
        moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    }

    public removeFilter(filter: any): void {
        filter.isdeleted = true;

        if (filter.id == this.globalFilter.id) {
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

    private validateGlobalFilter(): boolean {
        let valid = true;

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
        this.globalFilter.panelList = [];
        this.globalFilter.pathList = {};
        this.globalFilter.type = '';

        for (const panel of this.allPanels) {
            panel.content.globalFilterPaths = [];

            this.globalFilter.pathList[panel.id] = {
                selectedTableNodes: {},
                path: []
            };
        }
    }

    public onApply(): void {
        if (this.validateGlobalFilter()) {
            this.globalFilterChange.emit(this.globalFilter);
            this.display = false;
            this.close.emit(true);
        } else {
            this.alertService.addWarning(`Invalid`);
        }
    }
        
    public onClose(): void {
        this.display = false;
        this.close.emit(false);
    }

}