import { Component, Input, OnInit } from "@angular/core";
import { AlertService, DashboardService, GlobalFiltersService, QueryBuilderService, UserService } from "@eda/services/service.index";
import { EdaDatePickerConfig } from "@eda/shared/components/eda-date-picker/datePickerConfig";
import { EdaDialogCloseEvent, EdaDialogController } from "@eda/shared/components/shared-components.index";
import { DashboardComponent } from "../dashboard.component";
import { EdaBlankPanelComponent } from "@eda/components/eda-panels/eda-blank-panel/eda-blank-panel.component";
import * as _ from 'lodash';

@Component({
    selector: 'app-global-filter',
    templateUrl: './global-filter.component.html',
    styleUrls: ['../dashboard.component.css']
})
export class GlobalFilterComponent implements OnInit {
    @Input() dashboard: DashboardComponent;
    public globalFilters: any[] = [];
    public globalFilter: any;

    public filterController: EdaDialogController;

    public hideFilters: boolean = false;
    public isAdmin: boolean = false;
    public isDashboardCreator: boolean = false;
    public filterButtonVisibility = { public: false, readOnly: false };

    //Date filter ranges Dropdown
    public datePickerConfigs: {} = {};

    public filtrar: string = $localize`:@@filterButtonDashboard:Filtrar`;

    constructor(
        private globalFilterService: GlobalFiltersService,
        private dashboardService: DashboardService,
        private queryBuilderService: QueryBuilderService,
        private alertService: AlertService,
        private userService: UserService) { }

    public ngOnInit(): void {
        this.isAdmin = this.userService.isAdmin;
        this.isDashboardCreator = this.dashboard.isDashboardCreator;
        this.hideFilters = this.dashboard.display_v.panelMode;
    }

    public initGlobalFilters(filters: any[]): void {
        this.globalFilters = _.cloneDeep(filters);
        this.setFiltersVisibility();
        this.setFilterButtonVisibilty();
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
        this.globalFilters = this.globalFilters.filter((f: any) => {
            return (f.visible != "hidden" && f.visible == "readOnly") ||
                (f.visible != "hidden" && f.visible == "public")
        });

        this.globalFilters.forEach(a => {
            if (a.visible == "public") {
                this.filterButtonVisibility.public = true;
            } else if (a.visible == "readOnly") {
                this.filterButtonVisibility.readOnly = true;
            }
        });
    }

    public fillFiltersData() {
        for (const filter of this.globalFilters) {
            if (this.getFilterType(filter) == 'date') {
                this.loadDatesFromFilter(filter)
            } else {
                this.loadGlobalFiltersData(filter);
            }
        }
    }

    /** Apply filter to panels when filter's selected value changes */
    public applyGlobalFilter(filter: any): void {
        const formatedFilter = this.globalFilterService.formatFilter(filter);

        filter.panelList
            .map((id: string) => this.dashboard.edaPanels.toArray().find(p => p.panel.id === id))
            .forEach((panel: EdaBlankPanelComponent) => {
                if (panel) panel.setGlobalFilter(formatedFilter);
            });
    }

    // Main Global Filter
    public onShowGlobalFilter(isnew: boolean, filter?: any): void {
        if (this.dashboard.validateDashboard('GLOBALFILTER')) {
            const treeQueryMode = this.dashboard.edaPanels.some((panel) => panel.selectedQueryMode === 'EDA2');
            if (treeQueryMode) {
                if (isnew) this.globalFilter = { isnew: true };
                else this.globalFilter = { isnew: false, ...filter };

                this.dashboard.display_v.rightSidebar = false;
            } else {
                this.onFilterConfig(isnew, filter);
            }
        }
    }

    // Global Filter Tree
    public async onCloseGlobalFilter(apply: boolean): Promise<void> {
        if (apply) {
            if (this.globalFilter.isdeleted) {
                this.globalFilter.selectedItems = [];
                this.applyGlobalFilter(this.globalFilter);
                this.removeGlobalFilter(this.globalFilter);
            } else {

                for (const key in this.globalFilter.pathList) {
                    const selectedTableNodes = this.globalFilter.pathList[key].selectedTableNodes;
                    delete (selectedTableNodes.parent);
                }

                if (this.globalFilter.isnew) {
                    this.globalFilters.push(this.globalFilter);
                } else {
                    this.globalFilters.find((f) => f.id === this.globalFilter.id).selectedItems = this.globalFilter.selectedItems;
                }

                delete (this.globalFilter.isnew);

                // Load Filter dropdwons option s
                if (this.globalFilter.selectedColumn.column_type === 'date' && this.globalFilter.selectedItems.length > 0) {
                    this.loadDatesFromFilter(this.globalFilter);
                } else {
                    await this.loadGlobalFiltersData();
                }

                // If default values are selected filter is applied
                if (this.globalFilter.selectedItems.length > 0) {
                    this.applyGlobalFilter(this.globalFilter);
                }

                // If filter apply to all panels and this dashboard hasn't any 'apllyToAllFilter' new 'apllyToAllFilter' is set
                // if (this.globalFilter.applyToAll && (this.applyToAllfilter.present === false)) {
                //     this.applyToAllfilter = { present: true, refferenceTable: this.globalFilter.selectedTable.table_name, id: this.globalFilter.id };
                //     this.updateApplyToAllFilterInPanels();
                // }

            }
        }

        this.globalFilter = undefined;
        this.dashboard.reloadOnGlobalFilter();
    }

    // Legacy Global Filter
    public onFilterConfig(isnew: boolean, filter?: any): void {
        this.dashboard.display_v.rightSidebar = false;
        this.filterController = new EdaDialogController({
            params: {
                panels: this.dashboard.panels,
                dataSource: this.dashboard.dataSource,
                filtersList: this.globalFilters,
                filter,
                isnew
            },
            close: async (event, response) => {
                if (_.isEqual(event, EdaDialogCloseEvent.NEW)) {

                    await this.onGlobalFilter(response.filterList, response.targetTable);
                    this.dashboard.reloadOnGlobalFilter();

                } else if (_.isEqual(event, EdaDialogCloseEvent.UPDATE)) {

                    this.globalFilters = [];

                    for (let filter of response.filterList) {
                        await this.onGlobalFilter(filter, filter.table?.value);
                    }

                    this.dashboard.reloadOnGlobalFilter();
                }

                this.filterController = undefined;
            }
        });
    }

    // Legacy Global Filter
    public async onGlobalFilter(filter: any, targetTable: string): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            try {
                if (filter.isdeleted) {
                    filter.selectedItems = [];
                    this.applyGlobalFilter(filter);
                    this.removeGlobalFilter(filter);
                } else {
                    let existFilter = this.globalFilters.find((f) => f.id === `${targetTable}_${filter.column.value?.column_name}`);

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

                    // If default values are selected filter is applied
                    if (filter.selectedItems.length > 0) {
                        this.applyGlobalFilter(filter);
                    }

                    // If filter apply to all panels and this dashboard hasn't any 'apllyToAllFilter' new 'apllyToAllFilter' is set
                    if (filter.applyToAll && (this.dashboard.applyToAllfilter.present === false)) {
                        this.dashboard.applyToAllfilter = { present: true, refferenceTable: targetTable, id: filter.id };
                        this.dashboard.updateApplyToAllFilterInPanels();
                    }
                }
                resolve();
            } catch (err) {
                reject(err);
            }
        })
    }

    public getFilterType(globalFilter: any): string {
        let type = '';

        if (globalFilter.selectedColumn) {
            type = globalFilter.selectedColumn.column_type;
        } else {
            type = globalFilter.column.value.column_type;
        }

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
            // this.updateApplyToAllFilterInPanels(); TODO
        }

        // Update fileterList and clean panels' filters
        this.globalFilters = this.globalFilters.filter((f: any) => f.id !== filter.id);

        this.dashboard.edaPanels.forEach(panel => {
            panel.globalFilters = panel.globalFilters.filter((f: any) => f.filter_id !== filter.id);
        });

        if (reload) {
            //not saved alert message
            // TODO
            // this.dashboardService._notSaved.next(true);
            // this.reloadPanels();
        }
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
            targetColumn.ordenation_type = 'ASC';
            // globalFilter.selectedColumn.ordenation_type = 'ASC';
        } else {
            targetTable = globalFilter.table.value;
            targetColumn = globalFilter.column.value;
            targetColumn.column.value.ordenation_type = 'ASC';
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
            globalFilter.data = res[1].filter(item => !!item[0]).map(item => ({ label: item[0], value: item[0] }));
        } catch (err) {
            this.alertService.addError(err);
            throw err;
        }
    }

    /** Ajsust the filter dorpdwon widht to make it easier to read.... */
    public dropdownFiltersSize(filter: any): void {
        if (filter.data) {
            let bol = false;
            for (const item of filter.data) {
                if ((item.value || []).length > 60) bol = true;
            }

            // si els elements del filtre son llargs amplio el multiselect. 
            if (bol) {
                const dropdowns = document.querySelectorAll('p-multiselect');
                try {
                    dropdowns.forEach(d => {
                        d.getElementsByTagName("p-multiselect-label");
                        if (d.getElementsByClassName("p-multiselect-label")[0].textContent.trim() == filter.column.label) {
                            const elems = d.getElementsByClassName('p-multiselect-panel');
                            for (var i = 0; i < elems.length; i++) {
                                elems[i].setAttribute("style", "width: 500px !important;  z-index:1000; ");
                            }
                        }
                    })
                } catch (e) {
                    console.warn('dropdownFilterStyles' + e);
                }

            }
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