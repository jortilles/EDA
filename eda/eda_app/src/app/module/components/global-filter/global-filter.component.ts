import { ViewChild, Component, inject, Input, OnInit } from "@angular/core";
import { AlertService, DashboardService, GlobalFiltersService, QueryBuilderService, UserService } from "@eda/services/service.index";
import { EdaDatePickerConfig } from "@eda/shared/components/eda-date-picker/datePickerConfig";
import { EdaDialogCloseEvent, EdaDialogController } from "@eda/shared/components/shared-components.index";
import { EdaBlankPanelComponent } from "@eda/components/eda-panels/eda-blank-panel/eda-blank-panel.component";
import * as _ from 'lodash';
import { DashboardPage } from "app/module/pages/dashboard/dashboard.page";
import { MultiSelectModule } from "primeng/multiselect";
import { FormsModule } from "@angular/forms";
import { IconComponent } from "@eda/shared/components/icon/icon.component";
import { SharedModule } from "@eda/shared/shared.module";
import { StyleProviderService } from '@eda/services/service.index';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import { AutoCompleteModule } from 'primeng/autocomplete';
import '@angular/localize/init';


@Component({
    selector: 'app-v2-global-filter',
    templateUrl: './global-filter.component.html',
    standalone: true,
    imports: [FormsModule, MultiSelectModule, IconComponent, SharedModule, CommonModule, AutoCompleteModule],
    styleUrls: ['./global-filter.component.css']
})
export class GlobalFilterComponent implements OnInit {
    @Input() dashboard: DashboardPage;

    public globalFilters: any[] = [];
    public globalFilter: any;
    public styleButton: any = {};
    public orderDependentFilters: any[] = [];
    loading: boolean = true;
    placeholderText = this.loading ? $localize`:@@Cargando:Cargando...` : '';

    public filterController: EdaDialogController;

    public hideFilters: boolean = false;
    public isAdmin: boolean = false;
    public isDashboardCreator: boolean = false;
    public filterButtonVisibility = { public: false, readOnly: false };
    private styleProviderService = inject(StyleProviderService)
    private itemJustSelected = false;


    //Date filter ranges Dropdown
    public datePickerConfigs: {} = {};

    public filtrar: string = $localize`:@@filterButtonDashboard:Filtrar`;
    autoCompleteValues: string[];
    public filterTimeout: any;

    constructor(
        private globalFilterService: GlobalFiltersService,
        private dashboardService: DashboardService,
        private queryBuilderService: QueryBuilderService,
        private alertService: AlertService,
        private userService: UserService,
        private destroyRef: DestroyRef,
    ) { }

    public ngOnInit(): void {
        this.isAdmin = this.userService.isAdmin;
        // this.isDashboardCreator = this.dashboard.isDashboardCreator;
        // this.hideFilters = this.dashboard.display_v.panelMode;
        this.updateStyleButton();
        // Suscripción si los estilos cambian dinámicamente y unsubscribe cuando se haga destroy
        this.styleProviderService.filtersFontColor.pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.updateStyleButton());
        this.styleProviderService.filtersFontFamily.pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.updateStyleButton());
        this.styleProviderService.filtersFontSize.pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.updateStyleButton());
        this.styleProviderService.panelColor.pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.updateStyleButton());
    }

    updateStyleButton() {
        this.styleButton = {
            color: this.styleProviderService.filtersFontColor.source['_value'],
            backgroundColor: this.styleProviderService.panelColor.source['_value'],
            fontSize: (this.styleProviderService.filtersFontSize.source['_value'] * 2 + 14) + 'px',
            fontFamily: this.styleProviderService.filtersFontFamily.source['_value'],
        };
    }

    public async initGlobalFilters(filters: any[]): Promise<void> {
        this.globalFilters = _.cloneDeep(filters);
        // this.isDashboardCreator = this.dashboard.isDashboardCreator;
        this.setFiltersVisibility();
        this.setFilterButtonVisibilty();
        await this.fillFiltersData();
        // Datos de los filtros ya cargados
        this.placeholderText ='';


        // Inicialización de los filtros dependientes, solo si estan configurados:
        if(this.orderDependentFilters.length !== 0) {
            const initDependentFilter = this.orderDependentFilters.find((f: any) => f.x===0 && f.y===0);
            const initDependentGlobalFilter = this.globalFilters.find((gf: any) => gf.id === initDependentFilter.filter_id)
            this.applyingDependentFilter(initDependentGlobalFilter, this.globalFilters);
        }

        this.loading = false;
    }

    public async initOrderDependentFilters(orderDependentFilters: any[]): Promise<void> {
        this.orderDependentFilters = _.cloneDeep(orderDependentFilters);
    }

    private setFiltersVisibility(): void {
        for (const filter of this.globalFilters) {
            if (!filter.hasOwnProperty("visible")) {
                filter.visible = 'public';
            }
        }
    }

    // métode per descobrir o amagar el botó de filtrar al dashboard
    private setFilterButtonVisibilty(): void {
        let myFilters = _.cloneDeep(this.globalFilters);
        if (!this.isDashboardCreator || !this.isAdmin) {
            myFilters = myFilters.filter((f: any) => {
                return (f.visible != "hidden" && f.visible == "readOnly") ||
                    (f.visible != "hidden" && f.visible == "public")
            });
        }

        myFilters.forEach(a => {
            if (a.visible == "public") {
                this.filterButtonVisibility.public = true;
            } else if (a.visible == "readOnly") {
                this.filterButtonVisibility.readOnly = true;
            }
        });
    }

    public async fillFiltersData(): Promise<void> {
        const tasks: Promise<any>[] = [];

        for (const filter of this.globalFilters) {
            if (this.getFilterType(filter) === 'date') {
                this.loadDatesFromFilter(filter)
            } else {
                tasks.push(this.loadGlobalFiltersData(filter)); // Promise para asegurarnos de que todos los datos se han cargado
            }
        }
        await Promise.all(tasks);
    }

    /** Apply filter to panels when filter's selected value changes */
    public applyGlobalFilter(filter: any): void {
        const formatedFilter = this.globalFilterService.formatFilter(filter);
        this.setFilterButtonVisibilty();

        this.dashboard.edaPanels.forEach((panel: EdaBlankPanelComponent) => {
            // If GlobalFilter is linked to Panel then assertFilter
            if (filter.panelList.includes(panel.panel.id)) {
                panel.assertGlobalFilter(formatedFilter);
            } else {
                // If in panel exists GlobalFilter but NOT linked to panel
                const existFilter = panel.globalFilters.find((gf) => gf.filter_id == filter.id);
                if (existFilter?.filter_id && !filter.panelList.includes(panel.panel.id)) {
                    // Remove GlobalFilter from panel
                    panel.globalFilters = panel.globalFilters.filter((gf) => gf.filter_id != filter.id);
                }
            }
        });
    }

    public setGlobalFilterItems(filter: any) {

        // Aplicando los filtros dependientes si existe un ordenamiento configurado
        if(this.orderDependentFilters.length !==0) this.applyingDependentFilter(filter, this.globalFilters);

        this.dashboard.edaPanels.forEach((ebp: EdaBlankPanelComponent) => {
            const filterMap = ebp.panel.globalFilterMap || [];
         if (filter.panelList.includes(ebp.panel.id)) {
                const filterApplied = ebp.globalFilters.find((gf: any) => gf.filter_id === filter.id);

                if (filterApplied) {
                    filterApplied.filter_elements = this.globalFilterService.assertGlobalFilterItems(filter);
                } else {
                    const formatedFilter = this.globalFilterService.formatFilter(filter);
                    ebp.assertGlobalFilter(formatedFilter);
                }

            } else if (filterMap.length) {

                const map = filterMap.find((f) => f.targetId == filter.id);
                const panelFilter = ebp.globalFilters.find(filter => filter.filter_id === map?.sourceId);
                const items = this.globalFilterService.formatFilter(filter);
                if (panelFilter?.filter_elements)
                    panelFilter.filter_elements = items;

                ebp.assertGlobalFilter(items);
            }
        })
    }

    async applyingDependentFilter(filter, globalFilters) {
        await this.recursiveFilters(filter, globalFilters, this.dashboard.dataSource._id, this.dashboard.dashboardId, []);
    }

    async recursiveFilters(filter: any, globalFilters: any, _id: any, dashboardId: any, filterCollection: any) {
        
        if(filter.children.length !==0) {

            for(let i=0; i<filter.children.length; i++) {

                const filterItem = globalFilters.find((gl: any) => gl.id === filter.children[i].filter_id);

                filterCollection.push({
                        filter_column: filter.selectedColumn.column_name,
                        filter_column_type: filter.selectedColumn.column_type,
                        filter_elements: [{value1: filter.selectedItems}],
                        filter_id: filter.id,
                        filter_table: filter.selectedTable.table_name,
                        filter_type: "in",
                        isGlobal: filter.isGlobal,
                        joins:[],
                })

                // Se agregan Filtros de PADRES
                for(let r=0; r<globalFilters.length; r++) {
                    if(globalFilters[r].id !==filter.id && globalFilters[r].id !==filterItem.id) {  
                        this.filterCollectionRecursive(globalFilters[r].children, filterItem.id, globalFilters[r], filterCollection)
                    }
                }

                const queryParams = {
                    table: filterItem.selectedTable.table_name,
                    dataSource: _id,
                    dashboard: dashboardId,
                    panel: '',
                    joinType: "inner",
                    rootTable: filterItem.selectedTable.table_name,
                    queryMode: filterItem.queryMode,
                    forSelector: true,
                    queryLimit: 5000,
                    filters: filterCollection
                };

                // LANZA LA QUERY
                
                this.loading = true;
                const query = this.queryBuilderService.normalQuery([filterItem.selectedColumn], queryParams);
                const res = await this.dashboardService.executeQuery(query).toPromise();

                // Haciendo el filtro de los nuevos valores:
                const filterName = res[0][0];
                const filterData = res[1].map((item: any) => {
                    return ({
                        label: item[0],
                        value: item[0],
                    })
                })

                filterItem.data = filterData;

                // Creación de un Set con todos los valores válidos
                const validValues = new Set(filterData.map((fd: any) => fd.value));
                // Filtrar los elementos seleccionados que existen en validValues
                filterItem.selectedItems = filterItem.selectedItems.filter(item => validValues.has(item));

                this.loading = false;

                ///////////////////////////////////////////////////////////
                // VERIFICA SI CHILDREN ES DE LONGITUD DIFERENTE DE CERO //
                ///////////////////////////////////////////////////////////
                if(filterItem.children.length !== 0) {
                    // RECURSIVIDAD
                    this.recursiveFilters(filterItem, globalFilters, _id, dashboardId, filterCollection);
                    // .....
                } else {
                    filterCollection = [];
                }
            }
        } else {
            // El filtro no tiene children
        }
    }

    filterCollectionRecursive( children: any[] | undefined, id: string, globalFilter: any, filterCollection: any[] ): boolean {
        
        if (!children || children.length === 0) return false;

        for (const child of children) {
            if (child.filter_id === id) {
                const newFilter = {
                    filter_column: globalFilter.selectedColumn.column_name,
                    filter_column_type: globalFilter.selectedColumn.column_type,
                    filter_elements: [{ value1: globalFilter.selectedItems }],
                    filter_id: globalFilter.id,
                    filter_table: globalFilter.selectedTable.table_name,
                    filter_type: "in",
                    isGlobal: globalFilter.isGlobal,
                    joins: [],
                };

                // comparar sólo las propiedades relevantes
                const newKey = {
                    filter_column: newFilter.filter_column,
                    filter_column_type: newFilter.filter_column_type,
                    filter_elements: newFilter.filter_elements,
                    filter_table: newFilter.filter_table,
                    filter_type: newFilter.filter_type,
                    isGlobal: newFilter.isGlobal,
                    joins: newFilter.joins ?? []
                };

                const exists = filterCollection.some((fc: any) => {
                    const fcKey = {
                    filter_column: fc.filter_column,
                    filter_column_type: fc.filter_column_type,
                    filter_elements: fc.filter_elements,
                    filter_table: fc.filter_table,
                    filter_type: fc.filter_type,
                    isGlobal: fc.isGlobal,
                    joins: fc.joins ?? []
                    };
                    return _.isEqual(fcKey, newKey);
                });

                if (!exists) {
                    filterCollection.push(newFilter);
                }
                return true; // encontramos (o ya existía) => detener búsqueda
            }

            if (child.children && child.children.length > 0) {
                const found = this.filterCollectionRecursive(child.children, id, globalFilter, filterCollection);
                if (found) return true;
            }
        }

        return false;
    }

    // Global Filter Dialog
    public onShowGlobalFilter(isnew: boolean, filter?: any): void {
        if (this.dashboard.validateDashboard('GLOBALFILTER')) {

            const treeQueryMode = this.dashboard.edaPanels.some(
                (panel) => panel.selectedQueryMode === 'EDA2'
            );

            const globalFilter: any = {
                isnew,
                queryMode: treeQueryMode ? 'EDA2' : 'EDA',
                ...filter
            };

            if (!isnew) {
                if (!globalFilter.selectedTable) {
                    globalFilter.selectedTable = { table_name: filter.table.value };
                }

                if (!globalFilter.selectedColumn) {
                    globalFilter.selectedColumn = { ...filter.column.value };
                }
            }


            this.globalFilter = globalFilter;
        }
    }
    // Legacy Global Filter
    public async onGlobalFilterAuto(filter: any, targetTable: string): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            try {
                this.loading = true;
                if (filter.isdeleted) {
                    // Borramos filter 
                    filter.selectedItems = [];
                    this.applyGlobalFilter(filter);
                    this.removeGlobalFilter(filter);
                } else {
                    // Creamos filtro
                    let existFilter = await this.globalFilters.find((f) => f.id === filter.id);

                    if (existFilter) {
                        existFilter.selectedItems = filter.selectedItems;
                    } else {
                        this.globalFilters.push(filter);
                    }

                    // Load Filter dropdwons option s
                    if (filter.column.value.column_type === 'date' && filter.selectedItems.length > 0) {
                        this.loadDatesFromFilter(filter);
                    } else {
                        await this.loadGlobalFiltersData(filter);
                    }

                    // Apply globalFilter to linkedPanels
                    this.applyGlobalFilter(filter);

                    // If filter apply to all panels and this dashboard hasn't any 'apllyToAllFilter' new 'apllyToAllFilter' is set
                    if (filter.applyToAll && (this.dashboard.applyToAllfilter.present === false)) {
                        this.dashboard.applyToAllfilter = { present: true, refferenceTable: targetTable, id: filter.id };
                        this.dashboard.updateApplyToAllFilterInPanels();
                    }
                }
                this.loading = false;
                resolve();
            } catch (err) {
                console.log(err)
                reject(err);
            }
        })
    }

    // Global Filter Dialog
    public async onGlobalFilter(apply: boolean, gf?: any): Promise<void> {
        if (!this.globalFilter && gf) {
            this.globalFilter = gf;
        }


        if (apply) {
            this.dashboard.edaPanels.forEach(panel => {
                if (!this.globalFilter.isdeleted) {
                    panel.globalFilters = panel.globalFilters.filter((f: any) => f.filter_id !== this.globalFilter.id);
                }
            });

            if (this.globalFilter.isnew) {


                // Agregamos un item mas al ordenamiento de filtros dependientes:
                if(this.orderDependentFilters.length !== 0) {
                    this.orderDependentFilters.push({
                        cols: 3,
                        rows: 1,
                        y: this.orderDependentFilters.length,
                        x: 0,
                        filter_table: this.globalFilter.selectedTable.table_name,
                        filter_column: this.globalFilter.selectedColumn.column_name,
                        filter_type: this.globalFilter.selectedColumn.column_type,
                        filter_id: this.globalFilter.id,
                    })
                    this.alertService.addInfo($localize`:@@newFilterAddToDF:Se agregó un nuevo filtro a la relación de filtros dependientes`);
                }

                this.globalFilters.push(this.globalFilter);

            }

            for (const filter of this.globalFilters) {
                if (this.globalFilter.id == filter.id && !filter.isdeleted && !this.globalFilter.isdeleted) {
                    filter.data = this.globalFilter.data;
                    filter.selectedTable = this.globalFilter.selectedTable;
                    filter.selectedColumn = this.globalFilter.selectedColumn;
                    filter.selectedItems = this.globalFilter.selectedItems;
                    filter.selectedRange = this.globalFilter.selectedRange;
                    filter.panelList = this.globalFilter.panelList;
                    filter.pathList = this.globalFilter.pathList;
                    filter.type = this.globalFilter.type;
                    filter.isGlobal = this.globalFilter.isGlobal;
                    filter.visible = this.globalFilter.visible;
                    filter.isAutocompleted = this.globalFilter.isAutocompleted !== undefined ?
                        this.globalFilter.isAutocompleted : false;
                    filter.applyToAll = this.globalFilter.applyToAll;

                    if (filter.pathList) {
                        for (const key in filter.pathList) {
                            if (filter.pathList[key]?.selectedTableNodes) {
                                const selectedTableNodes = filter.pathList[key].selectedTableNodes;
                                delete (selectedTableNodes.parent);
                            }
                        }
                    }


                    delete (filter.isnew);
                } else if (filter.isdeleted) {
                    filter.selectedItems = [];
                    this.applyGlobalFilter(filter);
                    this.removeGlobalFilter(filter);
                }
            }

            if (!this.globalFilter.isdeleted) {
                // Load Filter dropdwons option s
                if (this.globalFilter.selectedColumn.column_type === 'date' && this.globalFilter.selectedItems.length > 0) {
                    this.loadDatesFromFilter(this.globalFilter);
                } else {
                    await this.loadGlobalFiltersData();
                }

                this.applyGlobalFilter(this.globalFilter);
            }
        }

        this.globalFilter = undefined;
        this.dashboard.refreshPanels();
    }

    public deleteFilterEvent(event: any) {
        // Se reinicia el ordenamiento de los filtros dependientes
        if(event) {

            if(this.orderDependentFilters.length !==0) {
                // Eliminando el ordenamiento
                this.orderDependentFilters = [];
                // Eliminando las relaciones entre los filtros globales 
                this.globalFilters.forEach((gf: any) => {
                    gf.children = [];
                });
    
                this.alertService.addWarning($localize`:@@DFSettingsRestarted:Se ha reiniciado la configuración de los filtros dependientes`);
                this.initGlobalFilters(this.globalFilters)
            }

        }
    }

    // Deprecated
    // Legacy Global Filter
    public async xonGlobalFilter(filter: any, targetTable: string): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            try {
                if (filter.isdeleted) {
                    filter.selectedItems = [];
                    this.applyGlobalFilter(filter);
                    this.removeGlobalFilter(filter);
                } else {
                    let existFilter = this.globalFilters.find((f) => f.id === filter.id);

                    if (existFilter) {
                        existFilter.selectedItems = filter.selectedItems;
                    } else {
                        this.globalFilters.push(filter);
                    }

                    // Load Filter dropdwons option s
                    if (filter.column.value.column_type === 'date' && filter.selectedItems.length > 0) {
                        this.loadDatesFromFilter(filter);
                    } else {
                        await this.loadGlobalFiltersData(filter);
                    }

                    // Apply globalFilter to linkedPanels
                    this.applyGlobalFilter(filter);

                    // If filter apply to all panels and this dashboard hasn't any 'apllyToAllFilter' new 'apllyToAllFilter' is set
                    // if (filter.applyToAll && (this.dashboard.applyToAllfilter.present === false)) {
                    //     this.dashboard.applyToAllfilter = { present: true, refferenceTable: targetTable, id: filter.id };
                    //     this.dashboard.updateApplyToAllFilterInPanels();
                    // }
                }
                resolve();
            } catch (err) {
                reject(err);
            }
        })
    }

    public getFilterType(globalFilter: any): string {
        let type = '';

        if (globalFilter.filter_column_type) {
            type = globalFilter.filter_column_type;
        } else if (globalFilter.selectedColumn) {
            type = globalFilter.selectedColumn.column_type;
        } else {
            type = globalFilter.column.value.column_type;
        }

        // New filter_column_type property on globalFilters
        globalFilter.filter_column_type = type;

        return type;
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

    public removeGlobalFilter(filter: any, reload?: boolean): void {
        // Remove 'applytoall' filter if it's the same fitler
        if (this.dashboard.applyToAllfilter && this.dashboard.applyToAllfilter.id === filter.id) {
            this.dashboard.applyToAllfilter = { present: false, refferenceTable: null, id: null };
            this.dashboard.updateApplyToAllFilterInPanels();
        }

        // Update fileterList and clean panels' filters
        this.globalFilters = this.globalFilters.filter((f: any) => f.id !== filter.id);

        this.removeMapFilter(filter);

        if (reload) {
            this.dashboardService._notSaved.next(true);
        }
    }


    public removeGlobalFilterOnClick(filter: any, reload?: boolean): void {
        this.dashboard.edaPanels.forEach(panel => {
            panel.globalFilters = panel.globalFilters.filter((f: any) => f.filter_id !== filter.id);
        });

        this.removeGlobalFilter(filter, reload);
    }

    public removeMapFilter(filter: any): void {
        this.dashboard.edaPanels.forEach((ebp: EdaBlankPanelComponent) => {
            const filterMap = ebp.panel.globalFilterMap ?? [];
            if (!filterMap.length) return;

            const mapping = filterMap.find(f => f.targetId === filter.id);
            if (!mapping) return;


            const panelFilter = ebp.selectedFilters.find(f => f.filter_id === mapping.sourceId);

            if (!panelFilter) return;

            ebp.panel.globalFilterMap = filterMap.filter(f => f.filter_id !== panelFilter.filter_id);
        });
    }

    /**
     * Process data from date picker and apply filter
     * @param event dates and range(week, month, year, all) if any
     * @param filter 
     */
    public processPickerEvent(event: any, filter: any): void {
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

            filter.selectedItems = stringRange;
            filter.selectedRange = event.range;
            this.loadDatesFromFilter(filter);
        }

        if (!event.dates) {
            filter.selectedItems = [];
        }

        if (!event.range) {
            filter.selectedRange = null;
        }

        this.applyGlobalFilter(filter);
        // filter = this.globalFilterService.formatGlobalFilter(filter);
        // this.applyGlobalFilter(filter);
    }

    /**
     * Set datePicker's configuration
     * @param filter 
     */
    private loadDatesFromFilter(filter) {
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

    private async loadGlobalFiltersData(globalFilter?: any): Promise<void> {

        if (!globalFilter) {
            globalFilter = this.globalFilter;
        }

        let targetTable: string;
        let targetColumn: any;
        if (globalFilter.selectedTable) {
            targetTable = globalFilter.selectedTable.table_name;
            targetColumn = globalFilter.selectedColumn;
            targetColumn.ordenation_type = targetColumn.ordenation_type || "Asc";

        } else {
            targetTable = globalFilter.table.value;
            targetColumn = globalFilter.column.value;
            targetColumn.ordenation_type = targetColumn.ordenation_type || "Asc";
        }

        const queryParams = {
            table: targetTable,
            dataSource: this.dashboard.dataSource._id,
            dashboard: '',
            panel: '',
            filters: []
        };

        try {
            
            const query = this.queryBuilderService.normalQuery([targetColumn], queryParams);
            query.query.forSelector = true;

            
            const res = await this.dashboardService.executeQuery(query).toPromise();
            const message = res[0][0];
            
            if (['noDataAllowed', 'noFilterAllowed'].includes(message)) {
                this.globalFilters.find((gf: any) => gf.id == globalFilter.id).visible = 'hidden';
                this.globalFilters.find((gf: any) => gf.id == globalFilter.id).data = false;
            }
            
            const data = res[1].filter(item => !!item[0] || item[0] == '').map(item => ({ label: item[0], value: item[0] }));
            this.globalFilters.find((gf: any) => gf.id == globalFilter.id).data = data;
        } catch (err) {
            this.alertService.addError(err);
            throw err;
        }
    }

    public findGlobalFilterByUrlParams(urlParams: any): void {
        if (Object.keys(urlParams).length === 0) {
            return;
        }

        for (const filter of this.globalFilters) {
            for (const param of Object.keys(urlParams)) {
                const paramTable = _.split(param, '.')[0];
                const paramColumn = _.split(param, '.')[1];

                const tableName = filter.table?.value || filter.selectedTable?.table_name;
                if (tableName === paramTable) {
                    const columnName = filter.column?.value?.column_name || filter.selectedColumn.column_name;

                    if (columnName === paramColumn) {
                        filter.selectedItems = _.split(urlParams[param], '|');

                        filter.panelList
                            .map(id => this.dashboard.panels.find(p => p.id === id))
                            .forEach((panel) => {
                                const panelFilter = panel.content.query.query.filters;
                                const formatedFilter = this.globalFilterService.formatFilter(filter);
                                panelFilter.splice(_.findIndex(panelFilter, (inx) => inx.filter_column === formatedFilter.filter_column), 1);
                                panelFilter.push(formatedFilter);
                            });

                    }
                }
            }
        }
    }

    public disableGlobalFilter(filter: any): boolean {
        let disabled = false;

        if (!this.isAdmin && !this.isDashboardCreator && filter.visible === 'readOnly') {
            disabled = true;
        } else if (this.isAdmin || this.isDashboardCreator || filter.visible === 'public') {
            disabled = false;
        }

        return disabled;
    }

    // Funcion para cargar todos los valores via endpoint
   public async loadFilterAutoComplete(event: any, filtro: any) {
       // Mínimo de caracteres antes de filtrar
       const minLength = 2;
       if (event.query.length < minLength) {
           this.autoCompleteValues = [];
           return;
        }

        // Reset para el control del doble evento keyenter
        this.itemJustSelected = false;

        // milisegundos para no cargar multiples veces mientras se escribe
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
                rootTable:filtro.selectedTable.table_name,
                queryMode: filtro.queryMode,
                forSelector: true,
                queryLimit: 5000,
                filters: [{
                    filter_column:filtro.selectedColumn.column_name,
                    filter_column_type:filtro.selectedColumn.column_type,
                    filter_elements:[{value1: [event.query]}],
                    filter_id:filtro.id,
                    filter_table:filtro.selectedTable.table_name,
                    filter_type:"like",
                    isGlobal:filtro.isGlobal,
                    joins:[],
                }]
            };
        const query = this.queryBuilderService.normalQuery([targetColumn], queryParams);
        const res = await this.dashboardService.executeQuery(query).toPromise();
        
        const data = res[1].filter(item => !!item[0] || item[0] == '').map(item => ({ label: item[0], value: item[0] }));
        this.globalFilters.find((gf: any) => gf.id == filtro.id).data = data;

        this.autoCompleteValues = data;

        }, delay);

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
        this.setGlobalFilterItems(filtro)
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

        this.onItemSelected(filter);
    }
}