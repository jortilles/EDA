import { Component, inject, Input, OnInit } from "@angular/core";
import { AlertService, DashboardService, GlobalFiltersService, QueryBuilderService, UserService } from "@eda/services/service.index";
import { EdaDatePickerConfig } from "@eda/shared/components/eda-date-picker/datePickerConfig";
import { EdaDialogCloseEvent, EdaDialogController } from "@eda/shared/components/shared-components.index";
// import { DashboardComponent } from "../dashboard.component";
import { EdaBlankPanelComponent } from "@eda/components/eda-panels/eda-blank-panel/eda-blank-panel.component";
import * as _ from 'lodash';
import { DashboardPageV2 } from "../../dashboard/dashboard.page";
import { MultiSelectModule } from "primeng/multiselect";
import { FormsModule } from "@angular/forms";
import { IconComponent } from "@eda/shared/components/icon/icon.component";
import { SharedModule } from "../../../../../shared/shared.module";
import { StyleProviderService } from '@eda/services/service.index';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import '@angular/localize/init';


@Component({
    selector: 'app-v2-global-filter',
    templateUrl: './global-filter.component.html',
    standalone: true,
    imports: [FormsModule, MultiSelectModule, IconComponent, SharedModule, CommonModule],
    styleUrls: ['./global-filter.component.css']
})
export class GlobalFilterV2Component implements OnInit {
    @Input() dashboard: DashboardPageV2;
    public globalFilters: any[] = [];
    public globalFilter: any;
    public styleButton: any = {};
    loading: boolean = true;
    placeholderText = this.loading ? $localize`:@@Cargando:Cargando...` : '';

    public filterController: EdaDialogController;

    public hideFilters: boolean = false;
    public isAdmin: boolean = false;
    public isDashboardCreator: boolean = false;
    public filterButtonVisibility = { public: false, readOnly: false };
    private styleProviderService = inject(StyleProviderService)

    //Date filter ranges Dropdown
    public datePickerConfigs: {} = {};

    public filtrar: string = $localize`:@@filterButtonDashboard:Filtrar`;

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
            fontSize: (this.styleProviderService.filtersFontSize.source['_value']*2 + 14) + 'px',
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
        this.loading = false;
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
        if(!this.isDashboardCreator  || !this.isAdmin){
            myFilters= myFilters.filter((f: any) => {
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

        filter.panelList
            .map((id: string) => this.dashboard.edaPanels.toArray().find(p => p.panel.id === id))
            .forEach((panel: EdaBlankPanelComponent) => {
                if (panel) panel.assertGlobalFilter(formatedFilter);
            });
    }

    public setGlobalFilterItems(filter: any) {
        this.dashboard.edaPanels.forEach((ebp: EdaBlankPanelComponent) => {
            const filterMap = ebp.panel.globalFilterMap || [];
            console.log(filter)
         // if (filter.panelList.includes(ebp.panel.id)) {
                //console.log(1)
                const filterApplied = ebp.globalFilters.find((gf: any) => gf.filter_id === filter.id);

                if (filterApplied) {
                    filterApplied.filter_elements = this.globalFilterService.assertGlobalFilterItems(filter);
                } else {
                    const formatedFilter = this.globalFilterService.formatFilter(filter);
                    ebp.assertGlobalFilter(formatedFilter);
                }

        /*   } else if (filterMap.length) {
                console.log(2)
                const map = filterMap.find((f) => f.targetId == filter.id);
                console.log(ebp)
                console.log(map)
                const panelFilter = ebp.selectedFilters.find((f) => f.filter_id === map?.sourceId);
                console.log(panelFilter, 'externo')
                if (panelFilter?.filter_id) {
                    console.log(panelFilter, 'interno')
                    const items = this.globalFilterService.assertGlobalFilterItems(filter);
                    panelFilter.filter_elements = items;
                    map.filter_elements = items;
                }
            }*/
        })
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
        console.log('???')

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
        console.log('???')

        if (!globalFilter) {
            globalFilter = this.globalFilter;
        }

        let targetTable: string;
        let targetColumn: any;
        if (globalFilter.selectedTable) {
            targetTable = globalFilter.selectedTable.table_name;
            targetColumn = globalFilter.selectedColumn;
            //targetColumn.ordenation_type = 'Asc';
            targetColumn.ordenation_type = targetColumn.ordenation_type || "Asc";
            
        } else {
            targetTable = globalFilter.table.value;
            targetColumn = globalFilter.column.value;
            //targetColumn.ordenation_type = 'Asc';
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

}