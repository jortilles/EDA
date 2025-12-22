import { CdkDragDrop, moveItemInArray } from "@angular/cdk/drag-drop";
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from "@angular/core";
import { EdaPanel } from "@eda/models/model.index";
import { AlertService, DashboardService, FileUtiles, GlobalFiltersService, QueryBuilderService, StyleProviderService } from "@eda/services/service.index";
import { EdaDatePickerConfig } from "@eda/shared/components/eda-date-picker/datePickerConfig";
import * as _ from 'lodash';
import { NgClass } from "@angular/common";
import { EdaDatePickerComponent } from "@eda/shared/components/shared-components.index";
import { EdaDialog2Component } from "@eda/shared/components/shared-components.index";
import { DropdownModule } from "primeng/dropdown";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";  
import { CardModule } from "primeng/card";
import { TreeSelectModule } from "primeng/treeselect";
import { MultiSelectModule } from "primeng/multiselect";
import { TooltipModule } from "primeng/tooltip";
import { TableModule } from "primeng/table";
import { ButtonModule } from "primeng/button";
import { CommonModule } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { AutoCompleteModule } from "primeng/autocomplete";

const ANGULAR_MODULES = [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgClass,
    DragDropModule,
];

const PRIMENG_MODULES = [
    DropdownModule,
    CardModule,
    TreeSelectModule,
    MultiSelectModule,
    TooltipModule,
    TableModule,
    ButtonModule,
    AutoCompleteModule
];

const STANDALONE_COMPONENTS = [
    EdaDialog2Component,
    EdaDatePickerComponent,
];

@Component({
    standalone: true,
    selector: 'app-global-filter-dialog',
    templateUrl: './global-filter-dialog.component.html',
    styleUrls: ['../dashboard.page.css', './global-filter-dialog.component.css'], 
    imports: [ ANGULAR_MODULES, PRIMENG_MODULES, STANDALONE_COMPONENTS ],
})
export class GlobalFilterDialogComponent implements OnInit, OnDestroy {
    @Input() globalFilter: any;
    @Input() globalFilterList: any[] = [];
    @Input() dataSource: any;
    @Input() dashboard: any;
    public modelTables: any[] = [];
    @Input() panels: EdaPanel[] = [];

    public allPanels: any[] = [];
    public filteredPanels: any[] = [];
    public loading: boolean = true;

    @Output() close: EventEmitter<any> = new EventEmitter<any>();
    @Output() globalFilterChange: EventEmitter<any> = new EventEmitter<any>();
    @Output() deleteFilterEvent: EventEmitter<any> = new EventEmitter<any>();


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
    public autoCompleteValues: string[];
    private itemJustSelected = false;
    public filterTimeout: any;

    //valors del dropdown de filtrat de visiblitat
    public publicRoHidden = [
        { label: $localize`:@@public:público`, value: `public` },
        { label: $localize`:@@readOnly:deshabilitado`, value: `readOnly` },
        { label: $localize`:@@hidden:oculto`, value: `hidden` }
    ];

    public formReady: boolean = false;
    public datePickerConfigs: any = {};
    public aliasValue: string = "";
    public showAlias: boolean = false;

    // Legacy 
    public applyToAll: boolean = false;
    public isAutocompleted: boolean = false;
    public isMandatory: boolean = false;
    public isMandatoryError: boolean = false;
    // selectedPanels: any[] = []

    constructor(
        private globalFilterService: GlobalFiltersService,
        private styleProviderService: StyleProviderService,
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
        this.modelTables = _.cloneDeep(this.dataSource.model.tables);
        this.initGlobalFilter();
        this.formReady = true;
    }

    private initGlobalFilter() {
        if (this.globalFilter.isnew) {
            this.globalFilter = {
                id: this.fileUtils.generateUUID(),
                isnew: true,
                isGlobal: true,
                isAutocompleted: false,
                isMandatory: false,
                queryMode: this.globalFilter.queryMode,
                data: null,
                selectedTable: {},
                selectedColumn: {},
                selectedItems: [],
                panelList: [],
                pathList: {},
                type: '',
                visible: 'public',
            };

            if (this.globalFilter.queryMode == 'EDA2') this.initPanels();
            else this.initPanelsLegacy();

            this.initTablesForFilter();
        } else {
            if (this.globalFilter.queryMode == 'EDA2') this.initPanels();
            else this.initPanelsLegacy();
            this.isAutocompleted = this.globalFilter.isAutocompleted;
            this.isMandatory = this.globalFilter.isMandatory;
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
        // Recogemos valor del switch
        this.globalFilter.isAutocompleted = this.isAutocompleted;
        this.globalFilter.isMandatory = this.isMandatory;
    }

    public ngOnDestroy(): void {
        this.globalFilter = undefined;
        for (const panel of this.panels) {
            if(panel?.content?.globalFilterPaths)
                panel.content.globalFilterPaths = []
        }
    }

    public togglePanel(panel: any): void {
        if (!panel.avaliable) {
          console.log('not available');
          this.initPanelsLegacy(panel);
        } else if (panel.active) {
          console.log('set to false');
          panel.active = false;
          this.filteredPanels = this.filteredPanels.filter((p: any) => p.id !== panel.id);
          console.log(panel);
        } else {
          panel.active = true;
          this.filteredPanels.push(panel);
        }
    }
      
    public isPanelSelected(panel: any): boolean {
        const panels = [...new Set(this.filteredPanels.map((p) => p.id))];
        return (panel.avaliable && panels.includes(panel.id)) && !panel.active_readonly;
    }

    public isPanelReadOnly(panel: any): boolean {
        const panels = [...new Set(this.filteredPanels.map((p) => p.id))];
        return panel.active_readonly && panels.includes(panel.id);
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

    public initPanelsLegacy(panel?: any) {
        if (!panel) {
            panel = this.panels.filter(p => p.content)[0];
        }

        const newPanel = this.panels.find((p: any) => p.id === panel.id);
        this.allPanels = this.globalFilterService.panelsToDisplay(this.modelTables, this.panels, newPanel);
        this.allPanels = this.allPanels.sort(this.sortByTittle);

        for (const displayPanel of this.allPanels) {
            if (this.globalFilter.panelList?.length) {
                const selectedPanelList = this.globalFilter.panelList;
                 for (let displayPanel of this.allPanels) {
                    if (!selectedPanelList.some((id: any) => displayPanel.id === id)) {
                        displayPanel.active = false;
                    }
                }
            }

            if (displayPanel.globalFilterMap?.length) {
                displayPanel.active_readonly = true;
                // const globalFilterMap = displayPanel.globalFilterMap;
                // const targetCheck = globalFilterMap.some((gf: any) => gf.targetId === this.globalFilter.id);
            }
        }

        this.filteredPanels = this.allPanels.filter(p => (p.avaliable && p.active) || (p.active_readonly));

        // Filter can only apply to all panels if all panels are in display list
        this.applyToAll = (this.allPanels.length === this.filteredPanels.length);

        // this.setTablesAndColumnsToFilter();
    }

    public initTablesForFilter() {
        // tablas excluidas
        const excludedTables = this.modelTables
            .filter((t: any) => t.visible === false)
            .map((t: any) => t.table_name);

        // decidir paneles según si hay filtros
        const panels = this.filteredPanels.length
            ? this.filteredPanels.filter((p: any) => !p.active_readonly)
            : this.allPanels;

        // tablas usadas en queries (usamos Set para evitar includes repetidos)
        const queryTables = new Set<string>();
        for (const panel of panels) {
            const fields = panel.content.query.query.fields ?? [];
            for (const field of fields) {
                queryTables.add(field.table_id.split(".")[0]);
            }
        }

        // aplicar relaciones y excluir las no visibles
        const relatedMap = this.globalFilterService.relatedTables([...queryTables], this.modelTables);
        relatedMap.forEach((value: any, key: string) => {
            if (!excludedTables.includes(key)) {
                this.tables.push(value);
            }
        });

        // ordenar por display_name
        this.tables.sort((a, b) =>
            a.display_name.default.localeCompare(b.display_name.default)
        );
    }

    public onAddPanelForFilter(panel: any) {

        if (panel.avaliable) {
            if(panel.content.query.query.queryMode != 'SQL') { // los paneles SQL no se pueden activar
                panel.active = !panel.active;
            }
            this.filteredPanels = this.allPanels.filter((p: any) => p.avaliable && p.active);

            if (panel.active) {
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
        this.globalFilter.selectedColumn = null;
        this.aliasValue = '';
        this.getColumnsByTable();
        this.clearFilterPaths();
    }

    public onChangeSelectedColumn(): void {
        this.aliasValue = '';
        this.globalFilter.selectedItems = [];
        if(!this.globalFilter?.isAutocompleted){
            if (this.globalFilter.selectedColumn.column_type == 'date') {
                this.loadDatesFromFilter();
            } else {
                this.loadColumnValues();
            }
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

            if (Array.isArray(response) && response.length > 1) {
                const data = response[1];
                this.columnValues = data.filter(item => !!item[0] || item[0] === '').map(item => ({ label: item[0], value: item[0] }));
            }
        } catch (err) {
            this.alertService.addError(err)
            throw err;
        }
        this.loading = false;
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
        if (this.globalFilter.queryMode !== 'EDA2') return;

        for (const panel of this.filteredPanels) {
            panel.content.globalFilterPaths = this.globalFilterService.loadTablePaths(this.modelTables, panel);

            if (this.globalFilter.pathList[panel.id] && this.isEmpty(this.globalFilter.pathList[panel.id].selectedTableNodes)) {
                const panelQuery = panel.content.query.query;
                const rootTable = panelQuery.rootTable;

                if (this.globalFilter.selectedTable.table_name == rootTable) {
                    const node = panel.content.globalFilterPaths[0];

                    this.globalFilter.pathList[panel.id].table_id = node.table_id;
                    this.globalFilter.pathList[panel.id].path = node.joins || [];
                    this.globalFilter.pathList[panel.id].selectedTableNodes = node;

                    if (!this.globalFilter.panelList.includes(panel.id)) this.globalFilter.panelList.push(panel.id);
                }
            }
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

        if (this.globalFilter.id == filter.id) {
            this.globalFilter.isdeleted = true;
        }

        this.globalFilterList.splice(this.globalFilterList.indexOf(filter), 0);
    }

    public getFilterLabel(globalFilter: any): string {
        let label = '';

        if (globalFilter.selectedColumn) {
            label = globalFilter.selectedColumn.display_name.default ?? '';
        } else {
            label = globalFilter.column?.label ?? '';
        }

        return label;
    }

    public isEmpty(obj: any): boolean {
        return Object.keys(obj||{}).length === 0;
    }

    private validateGlobalFilter(): boolean {
        let valid = true;
        const column = this.globalFilter.selectedColumn;
        if (!column?.column_name) return false;

        if (this.aliasValue) {
            this.globalFilter.selectedColumn.display_name.default = this.aliasValue;
        }

        const availablePanels = this.filteredPanels.map((p) => p.id);

        if (!this.globalFilter.isdeleted) {
            for (const key in this.globalFilter.pathList) {
                if (availablePanels.includes(key) && _.isEmpty(this.globalFilter.pathList[key].selectedTableNodes)) {
                    valid = false;
                }
            }
        }
        if(this.isMandatory){
            valid = this.globalFilter.selectedItems.length > 0;  
            this.isMandatoryError = !valid;      
        }

        return valid;
    }


    onAddValue(event: KeyboardEvent, filter: any) {
        // Si acaba de ocurrir una selección, no hacemos nada
        if (this.itemJustSelected) {
            this.itemJustSelected = false; // reset
            return;
        }
        event.preventDefault(); 

        if (this.autoCompleteValues && this.autoCompleteValues.length > 0) {
            const firstItem = this.autoCompleteValues[0];

            filter.selectedItems = [
            ...(filter.selectedItems || []), firstItem
            ];

            (event.target as HTMLInputElement).value = '';
            this.autoCompleteValues = [];
        }

    }


public async loadFilterAutoComplete(event: any, filtro: any) {
    const minLength = 2;
    if (!event.query || event.query.length < minLength) {
        this.autoCompleteValues = [];
        return;
    }

    this.itemJustSelected = false;

    const delay = 300;
    clearTimeout(this.filterTimeout);

    this.filterTimeout = setTimeout(async () => {
        let targetTable: string;
        let targetColumn: any;

        if (filtro.selectedTable) {
            targetTable = filtro.selectedTable.table_name;
            targetColumn = filtro.selectedColumn;
            targetColumn.ordenation_type = targetColumn.ordenation_type || "Asc";
        } else {
            targetTable = filtro.table.value;
            targetColumn = filtro.column.value;
            targetColumn.ordenation_type = targetColumn.ordenation_type || "Asc";
        }

        const queryParams = {
            table: targetTable,
            dataSource: this.dashboard.dataSource._id,
            dashboard: this.dashboard.dashboardId,
            panel: '',
            joinType: "inner",
            rootTable: filtro.selectedTable?.table_name || '',
            groupByEnabled: true,
            queryMode: filtro.queryMode,
            forSelector: true,
            queryLimit: 5000,
            filters: [{
                filter_column: filtro.selectedColumn.column_name,
                filter_column_type: filtro.selectedColumn.column_type,
                filter_elements: [{ value1: [event.query] }],
                filter_id: filtro.id,
                filter_table: filtro.selectedTable?.table_name || '',
                filter_type: "like",
                isGlobal: filtro.isGlobal,
                joins: [],
            }]
        };

        // Construir la query
        const query = this.queryBuilderService.normalQuery([targetColumn], queryParams);

        // Ejecutar la query
        const res = await this.dashboardService.executeQuery(query).toPromise();

        // Asegurarse que res[1] sea un array válido
        const rawData = Array.isArray(res[1]) ? res[1] : [];

        // Mapear solo elementos válidos
        const data = rawData
            .filter(item => item && item[0] !== undefined && item[0] !== null && item[0] !== '')
            .map(item => ({ label: item[0], value: item[0] }));

        // Inicializar globalFilterList si no existe
        this.globalFilterList = this.globalFilterList || [];

        // Buscar el filtro por id
        let gfItem = this.globalFilterList.find((gf: any) => gf.id == filtro.id);

        // Si no existe, crearlo
        if (!gfItem) {
            gfItem = { id: filtro.id, data: [] };
        }

        // Asignar solo elementos válidos
        gfItem.data = data.length ? data : [];

        // Asignar al autocomplete de forma segura
        this.autoCompleteValues = gfItem.data.filter(item => item?.label) || [];

        }, delay);
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
        if (this.globalFilter.queryMode !== 'EDA2') return;

        if (clearPanel) {
            this.globalFilter.panelList = this.globalFilter.panelList.filter((p) => p !== clearPanel.id);
            this.globalFilter.pathList[clearPanel.id] = {
                selectedTableNodes: {},
                path: []
            };
            clearPanel.content.globalFilterPaths = [];
        } else {
            this.globalFilter.panelList = [];
            this.globalFilter.pathList = {};

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

    onItemSelected(filtro: any) {
        // Si seleccionamos manualmente con el enter no queremos el primero 
        this.itemJustSelected = true;
        filtro.selectedItems = filtro.selectedItems.map((item: any) => {
            if (item && typeof item === 'object' && 'value' in item) {
                return item.value;
            }
            return item;
        });
        // Actualizar Global filter
    }

    private findTable(tableName: string) {
        return this.modelTables.find((table: any) => table.table_name === tableName);
    }

    public getDisplayPathStr(node: any) {
        let str = '&nbsp';

        if (node) {
            if ((node.joins||[]).length > 0) {
                for (const join of node.joins) {
                    const table = this.findTable(join[0]?.split('.')[0]);

                    if (table) {
                        str += `<strong>${table.display_name.default}</strong>&nbsp <i class="pi pi-angle-right"></i>`
                    }
                }

                str += `<strong>${node?.label}</strong>`;
            } else {
                str = `<strong>${node?.label}</strong>`;
            }
        }


        return str;
    }

    public applyToAllCheck() {
        this.applyToAll = !this.applyToAll;

        if (this.applyToAll){
            this.filteredPanels = this.allPanels.filter(p => p.avaliable === true);

            const selectedPanelList = this.globalFilter.panelList || [];
            for (let displayPanel of this.allPanels) {
                if (!selectedPanelList.some((id: any) => displayPanel.id === id)) {
                    displayPanel.active = false;
                }
            }
        }
    }
    
    
    public autocompleteFilterCheck(filtro: any) {
        this.isAutocompleted = !this.isAutocompleted;
        this.globalFilter.isAutocompleted = this.isAutocompleted;
    }
    public mandatoryFilterCheck(filtro: any) {
        this.isMandatory = !this.isMandatory;
        this.globalFilter.isMandatory = this.isMandatory;
    }

    public toggleShowAlias() {
        this.showAlias = !this.showAlias;
    }

    public onDelete() {

        this.styleProviderService.loadedPanels = this.allPanels.length;
        // Nombre del filtro seleccionado
        const filterNameID = this.globalFilter.id;
        
        // Indice en el que se encuentra el filtro de la lista
        const index = this.globalFilterList.findIndex(f => f.id === filterNameID);
        // Quitamos los valores de la lista
        this.globalFilter.selectedItems = []
        
        if (this.validateGlobalFilter()) {
            if (this.globalFilter.queryMode != 'EDA2') {
                this.globalFilter.panelList = this.filteredPanels.map((p: any) => p.id);
                this.globalFilter.applyToAll = this.applyToAll;
            }
            
            // Aplicamos filtros de lista
            this.globalFilterChange.emit(this.globalFilter);
            this.display = false;
            this.close.emit(true);
            
            // Intervalo para borrar el filtro visualmente
            const interval = setInterval(() => {
                if (this.styleProviderService.loadedPanels === 0) {
                    this.globalFilterList.splice(index, 1);
                    clearInterval(interval); // detener el intervalo
                }
            }, 100);
        }

        // Enviando el valor true de eliminación de un Filtro
        this.deleteFilterEvent.emit(true);
    }

    public onApply(): void {
        if (this.validateGlobalFilter()) {
            if (this.globalFilter.queryMode != 'EDA2') {
                this.globalFilter.panelList = this.filteredPanels.map((p: any) => p.id);
                this.globalFilter.applyToAll = this.applyToAll;
            }

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

    public disableApply(): boolean {
        return this.isMandatory && this.globalFilter.selectedItems.length < 1;
    }

}
