import { CdkDragDrop, moveItemInArray } from "@angular/cdk/drag-drop";
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from "@angular/core";
import { EdaPanel } from "@eda/models/model.index";
import { AlertService, ChartUtilsService, DashboardService, FileUtiles, GlobalFiltersService, QueryBuilderService, StyleProviderService } from "@eda/services/service.index";
import { DatePickerConfig } from "@eda/shared/components/date-picker/datePickerConfig";
import { getDateFilterOperatorLabel, getDateFilterValueLabel } from "@eda/shared/components/date-picker/date-filter-display.util";
import * as _ from 'lodash';
import { NgClass } from "@angular/common";
import { DatePickerComponent } from "@eda/shared/components/shared-components.index";
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
    DatePickerComponent,
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
    public multipleSelection: boolean = true;
    private _pathBackup: { [panelId: string]: any } = {};

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

    public tooltipApplyToAll: string = $localize`:@@tooltipApplyToAll:Si está activado, el filtro se aplica a todos los paneles del informe.`;
    public tooltipAutocomplete: string = $localize`:@@tooltipAutocomplete:Si está activado, los valores se buscan dinámicamente mediante autocompletado.`;
    public tooltipMandatory: string = $localize`:@@tooltipMandatory:Si está activado, el filtro debe tener un valor seleccionado para poder visualizar el informe.`;
    public uniqueSelectionDescription: string = $localize`:@@uniqueSelectionDescription:Active esta opción para permitir la selección múltiple.`;
    public multipleSelectionDescription: string = $localize`:@@multipleSelectionDescription:Desactive esta opción para permitir la selección única.`;
    public tooltipVisibility: string = $localize`:@@tooltipVisibility:Público: todos pueden usarlo. Deshabilitado: otros usuarios pueden ver el filtro pero no modificarlo. Oculto: no visible para otros pero se aplica igualmente.`;

    public tables: any[] = [];
    public selectedTable: any;

    public columns: any[] = [];
    public selectedColumn: any;

    public columnValues: any[] = [];
    /** SDA CUSTOM - raw [label, id] rows behind columnValues, used to resolve selectedIdValues in onSelectedItemsChange */
    public totalValues: any[] = [];
    public tableNodes: any[] = [];
    public autoCompleteValues: string[];
    private itemJustSelected = false;
    public filterTimeout: any;

    // Visibility filter dropdown values
    public publicRoHidden = [
        { label: $localize`:@@public:público`, value: `public` },
        { label: $localize`:@@readOnly:deshabilitado`, value: `readOnly` },
        { label: $localize`:@@hidden:oculto`, value: `hidden` }
    ];

    public formReady: boolean = false;
    public datePickerConfigs: any = {};
    public aliasValue: string = "";
    public showAlias: boolean = false;

    get dialogHeight(): string {
        return this.globalFilter?.queryMode === 'TREE' ? '80vh' : '70vh';
    }

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
        private chartUtils: ChartUtilsService,
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
                multipleSelection: true,
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

            if (this.globalFilter.queryMode == 'TREE') this.initPanels();
            else this.initPanelsLegacy();

            this.initTablesForFilter();
        } else {
            if (this.globalFilter.queryMode == 'TREE') this.initPanels();
            else this.initPanelsLegacy();
            this.isAutocompleted = this.globalFilter.isAutocompleted;
            this.isMandatory = this.globalFilter.isMandatory;
            this.multipleSelection = this.globalFilter.multipleSelection ?? true;
            this.initTablesForFilter();

            const tableName = this.globalFilter.selectedTable.table_name;
            this.globalFilter.selectedTable = _.cloneDeep(this.tables.find((table) => table.table_name == tableName));

            const columnName = this.globalFilter.selectedColumn.column_name;
            // I retrieve the display name that may have been set
            const display_name_alias = this.globalFilter.selectedColumn.display_name.default;

            this.globalFilter.selectedColumn = _.cloneDeep(this.globalFilter.selectedTable.columns.find((col: any) => col.column_name == columnName));

            this.getColumnsByTable();
            if (this.globalFilter.selectedColumn?.column_type === 'date') {
                this.loadDatesFromFilter();
            } else {
                this.loadColumnValues();
            }
            this.findPanelPathTables();
            this.aliasValue = display_name_alias;
        }
        // We retrieve the switch value
        this.globalFilter.isAutocompleted = this.isAutocompleted;
        this.globalFilter.isMandatory = this.isMandatory;
        this.globalFilter.multipleSelection = this.multipleSelection;
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

                // Disabling the panel if it is in SQL mode.
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
        // Excluded tables
        const excludedTables = this.modelTables
            .filter((t: any) => t.visible === false)
            .map((t: any) => t.table_name);

        // Decide panels based on whether filters exist
        const panels = this.filteredPanels.length
            ? this.filteredPanels.filter((p: any) => !p.active_readonly)
            : this.allPanels;

        // Tables used in queries (we use a Set to avoid duplicate includes)
        const queryTables = new Set<string>();
        for (const panel of panels) {
            const fields = panel.content.query.query.fields ?? [];
            for (const field of fields) {
                queryTables.add(field.table_id.split(".")[0]);
            }
        }

        // Apply relationships and exclude non-visible ones
        const relatedMap = this.globalFilterService.relatedTables([...queryTables], this.modelTables);
        relatedMap.forEach((value: any, key: string) => {
            if (!excludedTables.includes(key)) {
                this.tables.push(value);
            }
        });

        // Sort by display_name
        this.tables.sort((a, b) =>
            a.display_name.default.localeCompare(b.display_name.default)
        );
    }

    public onAddPanelForFilter(panel: any) {

        if (panel.avaliable) {
            if(panel.content.query.query.queryMode != 'SQL') { // SQL panels cannot be activated
                panel.active = !panel.active;
            }
            this.filteredPanels = this.allPanels.filter((p: any) => p.avaliable && p.active);

            if (panel.active) {
                if (this._pathBackup[panel.id]) {
                    this.globalFilter.pathList[panel.id] = _.cloneDeep(this._pathBackup[panel.id]);
                    delete this._pathBackup[panel.id];
                }
                if (this.globalFilter.pathList[panel.id] && !this.isEmpty(this.globalFilter.pathList[panel.id].selectedTableNodes)) {
                    if (!this.globalFilter.panelList.includes(panel.id)) {
                        this.globalFilter.panelList.push(panel.id);
                    }
                }
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

        // Date filters use the date-picker (operator + dynamic range), not the autocomplete
        // multiselect — autocomplete has no meaning for a date column.
        if (this.globalFilter.selectedColumn?.column_type === 'date') {
            this.isAutocompleted = false;
            this.globalFilter.isAutocompleted = false;
        }

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

        
            //this.columns.sort((a, b) => a.value < b.value ? -1 : a.value > b.value ? 1 : 0);
        this.columns.sort((a, b) => a.display_name.default.localeCompare(b.display_name.default));
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
                this.totalValues = data;
                this.columnValues = data.filter(item => !!item[0] || item[0] === '').map(item => ({ label: item[0], value: item[0] }));
            }
        } catch (err) {
            this.alertService.addError(err)
            throw err;
        }
        this.loading = false;
    }

    /**
     * Resolves the internal code (id) behind each selected label, so the filter can be
     * compared against the internal code column instead of the label when USE_VALUE_LIST_CODE_FOR_FILTERS
     * is enabled. Harmless to compute unconditionally: assertGlobalFilterCodes() decides whether to use it.
     */
    public onSelectedItemsChange(values: any[]): void {
        if (this.globalFilter.selectedColumn?.valueListSource === undefined) return;

        this.globalFilter.selectedIdValues = (values || []).map((value: any) => {
            const match = this.totalValues.find((tv: any) => tv[0] === value);
            if (match) return match[1];
            return value === 'emptyString' ? '' : undefined;
        });
    }

    private loadDatesFromFilter() {
        const filter = this.globalFilter;

        this.datePickerConfigs[filter.id] = new DatePickerConfig();
        const config = this.datePickerConfigs[filter.id];
        config.dateRange = [];
        config.range = filter.selectedRange;
        config.filter = filter;
        config.dateFilterType = filter.dateFilterType;
        if (filter.selectedItems.length > 0) {
            if (!filter.selectedRange) {
                // Static in/not_in stores its discrete dates nested as selectedItems[0]
                const isDiscreteList = Array.isArray(filter.selectedItems[0]);
                if (isDiscreteList) {
                    // Restore every discrete date, not just the first and last
                    config.dateRange = filter.selectedItems[0].map((d: string) => new Date(d.replace(/-/g, '/')));
                } else {
                    let firstDate = filter.selectedItems[0];
                    let lastDate = filter.selectedItems[filter.selectedItems.length - 1];
                    config.dateRange.push(new Date(firstDate.replace(/-/g, '/')));
                    config.dateRange.push(new Date(lastDate.replace(/-/g, '/')));
                }
            }
        }
    }

    public processPickerEvent(event: any): void {
        this.globalFilter.dateFilterType = event.operator;

        if (event.dates) {
            const dtf = new Intl.DateTimeFormat('en', { year: 'numeric', month: '2-digit', day: '2-digit' });
            const toStr = (date: Date) => {
                const [{ value: mo }, , { value: da }, , { value: ye }] = dtf.formatToParts(date);
                return `${ye}-${mo}-${da}`;
            };

            const isStaticInNotIn = ['in', 'not_in'].includes(event.operator) && !event.range;
            if (isStaticInNotIn) {
                // Discrete, individually picked dates — kept as a single nested list, not a start/end pair
                this.globalFilter.selectedItems = [event.dates.filter((d: any) => d != null).map(toStr)];
            } else {
                if (!event.dates[1]) {
                    event.dates[1] = event.dates[0];
                }
                this.globalFilter.selectedItems = [event.dates[0], event.dates[1]].map(toStr);
            }

            this.globalFilter.selectedRange = event.range;
            this.globalFilter.dynamicValue = event.range;
        }

        if (!event.dates) {
            this.globalFilter.selectedItems = [];
        }

        if (!event.range) {
            this.globalFilter.selectedRange = null;
            this.globalFilter.dynamicValue = null;
        }

        this.loadDatesFromFilter();
    }

    /** Just the value part of the date-picker's own summary — e.g. "03-08-26 - 09-08-26" or "Avui" */
    public getDateFilterValueText(): string {
        const items = this.globalFilter.selectedItems;
        const isDiscreteList = Array.isArray(items?.[0]);
        return getDateFilterValueLabel({
            operator: this.globalFilter.dateFilterType,
            dynamicRangeValue: this.globalFilter.dynamicValue || this.globalFilter.selectedRange,
            value1: isDiscreteList ? items[0] : items?.[0],
            value2: isDiscreteList ? undefined : items?.[1],
        });
    }

    /** Just the operator part of the date-picker's own summary, e.g. "=" or "Entre" — rendered as a badge */
    public getDateFilterOperatorText(): string {
        return getDateFilterOperatorLabel(this.globalFilter.dateFilterType, this.chartUtils.filterTypesLabels);
    }

    public findPanelPathTables() {
        if (this.globalFilter.queryMode !== 'TREE') return;

        for (const panel of this.filteredPanels) {
            if (panel.content?.query?.query?.queryMode === 'SQL') continue;

            panel.content.globalFilterPaths = this.globalFilterService.loadTablePaths(this.modelTables, panel);

            if (this.isPathStaleForPanel(panel)) {
                this.globalFilter.pathList[panel.id] = { selectedTableNodes: {}, path: [] };
                this.globalFilter.panelList = this.globalFilter.panelList.filter((id: string) => id !== panel.id);
            }

            if (this.globalFilter.pathList[panel.id] && this.isEmpty(this.globalFilter.pathList[panel.id].selectedTableNodes)) {
                const panelQuery = panel.content.query.query;
                const rootTable = panelQuery.rootTable;

                if (this.globalFilter.selectedTable.table_name == rootTable) {
                    const node = panel.content.globalFilterPaths[0];

                    this.globalFilter.pathList[panel.id].table_id = node.table_id;
                    this.globalFilter.pathList[panel.id].path = node.joins || [];
                    this.globalFilter.pathList[panel.id].selectedTableNodes = node;

                    if (!this.globalFilter.panelList.includes(panel.id)) this.globalFilter.panelList.push(panel.id);
                } else {
                    this.tryAutoFillSingleHop(panel);
                    if (this.isEmpty(this.globalFilter.pathList[panel.id].selectedTableNodes)) {
                        this.tryCopyPathFromSiblingPanel(panel);
                    }
                }
            }
        }
    }

    /**
     * A previously-saved path is stale when the panel's rootTable no longer matches
     * the table the path was built from (e.g. the user changed the panel's root table
     * after the global filter's path was set).
     */
    private isPathStaleForPanel(panel: any): boolean {
        const pathEntry = this.globalFilter.pathList[panel.id];
        if (!pathEntry || this.isEmpty(pathEntry.selectedTableNodes)) return false;

        const currentRootTable = panel.content.query.query.rootTable;

        if (!currentRootTable) return false; // panels without rootTable (e.g. SQL): don't validate

        const path: any[] = pathEntry.path || [];

        if (path.length === 0) {

            // 0 hops: the start is at selectedTableNodes.table_id
            return pathEntry.selectedTableNodes?.table_id !== currentRootTable;
        } else {
            // 1+ hops: the start is at the first part of the first join
            return path[0][0]?.split('.')[0] !== currentRootTable;
        }
    }

    /**
     * Auto-completes the path when the filtered table is a single relation hop away
     * from the panel's root table, so the user doesn't have to configure it manually.
     */

    private tryAutoFillSingleHop(panel: any): void {
        const filterTableName = this.globalFilter.selectedTable?.table_name;
        const rootTableName = panel.content.query.query.rootTable;

        if (!filterTableName || !rootTableName || filterTableName === rootTableName) return;

        const rootTable = this.modelTables.find((t: any) => t.table_name === rootTableName);
        if (!rootTable) return;

        // Mirror onNodeExpand: exclude only bridge and autorelation (visible is not a filter in the tree).
        const directRelations = (rootTable.relations || []).filter((rel: any) =>
            !rel.bridge && !rel.autorelation && rel.target_table === filterTableName
        );


        // If multiple relations exist to the same table, use the first primary; user can override manually.
        if (directRelations.length === 0) return;

        const rel = directRelations[0];
        const sourceJoin = `${rel.source_table || rootTableName}.${rel.source_column[0]}`;
        const joinChildId = `${rel.target_table}.${rel.target_column[0]}`;
        const child_id = `${joinChildId}.${rel.source_column[0]}`;
        const joins: any[] = [[sourceJoin, joinChildId]];

        const childLabel = rel.display_name?.default || `${rel.source_column[0]} - ${rel.target_table}`;

        const syntheticNode = {
            child_id,
            type: 'child',
            label: childLabel,
            autorelation: false,
            joins
        };

        this.globalFilter.pathList[panel.id].table_id = child_id;
        this.globalFilter.pathList[panel.id].path = joins;
        this.globalFilter.pathList[panel.id].selectedTableNodes = syntheticNode;

        if (!this.globalFilter.panelList.includes(panel.id)) {
            this.globalFilter.panelList.push(panel.id);
        }
    }

    /**
     * If another panel sharing the same root table already has a valid path configured,
     * replicate it so the report stays consistent (e.g. after duplicating a panel).
     */
    private tryCopyPathFromSiblingPanel(panel: any): void {
        const rootTableName = panel.content.query.query.rootTable;

        const sibling = this.filteredPanels.find((p: any) => {
            if (p.id === panel.id) return false;
            if (p.content.query.query.rootTable !== rootTableName) return false;
            const siblingPath = this.globalFilter.pathList[p.id];
            return siblingPath && !this.isEmpty(siblingPath.selectedTableNodes);
        });

        if (!sibling) return;

        const siblingPath = this.globalFilter.pathList[sibling.id];
        this.globalFilter.pathList[panel.id].table_id = siblingPath.table_id;
        this.globalFilter.pathList[panel.id].path = (siblingPath.path || []).map((j: any[]) => [...j]);
        this.globalFilter.pathList[panel.id].selectedTableNodes = _.cloneDeep(siblingPath.selectedTableNodes);

        if (!this.globalFilter.panelList.includes(panel.id)) {
            this.globalFilter.panelList.push(panel.id);
        }
    }

    /**
     * Replicates a manually-selected path to other panels that share the same root table
     * and don't have a path defined yet, to keep the report consistent.
     */

    private propagatePathToSimilarPanels(sourcePanelId: string, table_id: string, node: any): void {
        const sourcePanel = this.filteredPanels.find((p: any) => p.id === sourcePanelId);
        if (!sourcePanel) return;

        const sourceRootTable = sourcePanel.content.query.query.rootTable;

        const nodeSnapshot = {
            child_id: node.child_id,
            table_id: node.table_id,
            type: node.type,
            label: node.label,
            autorelation: node.autorelation,
            joins: (node.joins || []).map((j: any[]) => [...j])
        };

        for (const panel of this.filteredPanels) {
            if (panel.id === sourcePanelId) continue;

            const panelRootTable = panel.content.query.query.rootTable;
            const panelPath = this.globalFilter.pathList[panel.id];

            if (panelRootTable === sourceRootTable && panelPath && this.isEmpty(panelPath.selectedTableNodes)) {
                panelPath.table_id = table_id;
                panelPath.path = (node.joins || []).map((j: any[]) => [...j]);
                panelPath.selectedTableNodes = { ...nodeSnapshot };

                if (!this.globalFilter.panelList.includes(panel.id)) {
                    this.globalFilter.panelList.push(panel.id);
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

            this.propagatePathToSimilarPanels(panel.id, table_id, node);

            // const existsPath = pathList.find((path: any) => path.panel_id == panel.id);
            // pathList.push({ panel_id: panel.id, path: node.joins || [] });
            // this.globalFilter.table_id = table_id;
            this.propagatePathToSimilarPanels(panel.id, table_id, node);
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
        // If a selection has just occurred, we do nothing
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

        // Build the query
        const query = this.queryBuilderService.normalQuery([targetColumn], queryParams);

        // Execute the query
        const res = await this.dashboardService.executeQuery(query).toPromise();

        // Ensure that res[1] is a valid array
        const rawData = Array.isArray(res[1]) ? res[1] : [];

        // Map only valid elements
        const data = rawData
            .filter(item => item && item[0] !== undefined && item[0] !== null && item[0] !== '')
            .map(item => ({ label: item[0], value: item[0] }));

        // Initialize globalFilterList if it does not exist
        this.globalFilterList = this.globalFilterList || [];

        // Find the filter by id
        let gfItem = this.globalFilterList.find((gf: any) => gf.id == filtro.id);

        // If it does not exist, create it
        if (!gfItem) {
            gfItem = { id: filtro.id, data: [] };
        }

        // Assign only valid elements
        gfItem.data = data.length ? data : [];

        // Safely assign to the autocomplete
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
        if (this.globalFilter.queryMode !== 'TREE') return;

        if (clearPanel) {
            this.globalFilter.panelList = this.globalFilter.panelList.filter((p) => p !== clearPanel.id);
            const current = this.globalFilter.pathList[clearPanel.id];
            if (current && !this.isEmpty(current.selectedTableNodes)) {
                this._pathBackup[clearPanel.id] = _.cloneDeep(current);
            }
            this.globalFilter.pathList[clearPanel.id] = {
                selectedTableNodes: {},
                path: []
            };
            clearPanel.content.globalFilterPaths = [];
        } else {
            this.globalFilter.panelList = [];
            this.globalFilter.pathList = {};
            this._pathBackup = {};

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
        // If we select manually with Enter, we don’t want the first one
        this.itemJustSelected = true;
        filtro.selectedItems = filtro.selectedItems.map((item: any) => {
            if (item && typeof item === 'object' && 'value' in item) {
                return item.value;
            }
            return item;
        });
        // Update global filter
    }

    private findTable(tableName: string) {
        return this.modelTables.find((table: any) => table.table_name === tableName);
    }

    public getDisplayPathStr(node: any): string {
        if (!node) return '&nbsp';

        if ((node.joins || []).length > 0) {
            let str = '';
            for (const join of node.joins) {
                const table = this.findTable(join[0]?.split('.')[0]);
                if (table) {
                    str += `<strong>${table.display_name.default}</strong>&nbsp;<i class="pi pi-angle-right"></i>&nbsp;`;
                }
            }
            return str + `<strong>${node?.label}</strong>`;
        }

        return `<strong>${node?.label}</strong>`;
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
    public multipleSelectionCheck() {
        this.multipleSelection = !this.multipleSelection;
        this.globalFilter.multipleSelection = this.multipleSelection;
        this.globalFilter.selectedItems = [];
    }

    public onSingleSelectChange(): void {
        if (this.globalFilter.selectedItems?.length > 1) {
            this.globalFilter.selectedItems = [this.globalFilter.selectedItems[this.globalFilter.selectedItems.length - 1]];
        }
    }

    public toggleShowAlias() {
        this.showAlias = !this.showAlias;
    }

    public onDelete() {

        this.styleProviderService.loadedPanels = this.allPanels.length;
        // Selected filter name
        const filterNameID = this.globalFilter.id;
        
        // Index of the filter in the list
        const index = this.globalFilterList.findIndex(f => f.id === filterNameID);
        
        if (this.validateGlobalFilter()) {
            // We remove values from the list if the filter is valid
            this.globalFilter.selectedItems = [];
            this.globalFilter.isdeleted = true;

            if (this.globalFilter.queryMode != 'TREE') {
                this.globalFilter.panelList = this.filteredPanels.map((p: any) => p.id);
                this.globalFilter.applyToAll = this.applyToAll;
            }

            // Sending the true value for filter deletion BEFORE close destroys the component
            this.deleteFilterEvent.emit(true);

            // Apply list filters
            this.globalFilterChange.emit(this.globalFilter);
            this.display = false;
            this.close.emit(true);

            // Interval for visually removing the filter
            const interval = setInterval(() => {
                if (this.styleProviderService.loadedPanels === 0) {
                    this.globalFilterList.splice(index, 1);
                    clearInterval(interval); // Stop the interval
                }
            }, 100);
        }
    }

    public onApply(): void {

        console.log('hola....')

        if (this.validateGlobalFilter()) {
            this.globalFilter.multipleSelection = this.multipleSelection;

            if (this.globalFilter.queryMode != 'TREE') {
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
