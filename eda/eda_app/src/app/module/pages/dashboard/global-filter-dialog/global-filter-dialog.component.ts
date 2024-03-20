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
    @Input() dataSource: any;
    public modelTables: any[] = [];
    @Input() panels: EdaPanel[] = [];
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
    public columns: any[] = [];
    public columnValues: any[] = [];

    public tableNodes: any[] = [];

    constructor(
        private globalFilterService: GlobalFiltersService,
        private dashboardService: DashboardService,
        private queryBuilderService: QueryBuilderService,
        private alertService: AlertService,
        private fileUtils: FileUtiles,
    ) {  }

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
                pathList: [],
                type: '',
                // selectedRange:this.selectedRange,
                isGlobal: true,
                // applyToAll: !this.applyToAll,
                // visible: this.publicRoHiddenOption,
            };
        }

        this.initPanels();
        this.initTablesForFilter();
    }

    public ngOnDestroy(): void {
        console.log('destroy globalFilterDialog')
        this.globalFilter = undefined;    
    }

    public initPanels() {
        let panels = this.globalFilterService.filterPanels(this.modelTables, this.panels);

        const sortByTittle = (a: any, b: any) => {
            if (a.title < b.title) { return -1; }
            if (a.title > b.title) { return 1; }
            return 0;
        };

        panels = panels.sort(sortByTittle);

        this.filteredPanels = panels.filter((p: any) => p.avaliable === true && p.active === true);
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

    public getColumnsByTable() {
        this.columns = [];

        this.globalFilter.selectedTable.columns
            .filter((col: any) => col.visible === true)
            .forEach((col: any) => this.columns.push(col));

        // this.columns = this.columns.slice();
        this.columns.sort((a, b) => a.value < b.value ? -1 : a.value > b.value ? 1 : 0);
    }

    public async loadColumnValues() {
        const params = {
            table: this.globalFilter.selectedTable.table_name,
            dataSource: this.dataSource._id,
            // dashboard: this.params.id,
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
            panel.globalFilterPaths = this.globalFilterService.loadTablePaths(this.modelTables, panel);
        }
    }

    public onNodeExpand(panel: any, event: any): void {
        // this.loadingNodes = true;

        const node = event?.node;

        if (node) {
            this.globalFilterService.onNodeExpand(panel.globalFilterPaths, node, this.modelTables);
        }

        // this.loadingNodes = false;
    }

    public onNodeSelect(panel: any, event: any): void {
        const node = event?.node;

        const pathList = this.globalFilter.pathList;
        const existsPath = pathList.find((path: any) => path.panel_id == panel.id);
        const table_id = node.table_id || node.child_id;

        if (existsPath) {
            existsPath.path = node.joins;
            existsPath.table_id = table_id;
        } else {
            this.globalFilter.table_id = table_id;
            pathList.push({ panel_id: panel.id, path: node.joins || [] });
            this.globalFilter.panelList.push(panel.id);
            console.log(this.globalFilter);
        }
    }

    public onApply(): void {
        this.globalFilterChange.emit(this.globalFilter);
        this.display = false;
        this.close.emit();
    }

    public onClose(): void {
        this.globalFilter = {};
        this.display = false;
        this.close.emit();
    }

}