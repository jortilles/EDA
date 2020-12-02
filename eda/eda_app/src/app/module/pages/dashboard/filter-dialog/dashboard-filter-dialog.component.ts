import { Component, ViewChild } from '@angular/core';
import {
    GlobalFiltersService,
    AlertService,
    DashboardService,
    FileUtiles,
    QueryBuilderService
} from '@eda/services/service.index';
import { EdaDialog, EdaDialogCloseEvent, EdaDialogAbstract, EdaDatePickerComponent } from '@eda/shared/components/shared-components.index';


@Component({
    selector: 'dashboard-filter-dialog',
    templateUrl: './dashboard-filter-dialog.component.html',
    styleUrls: ['../dashboard.component.css']
})

export class DashboardFilterDialogComponent extends EdaDialogAbstract {

    
    @ViewChild('myCalendar', { static: false }) datePicker: EdaDatePickerComponent;

    public dialog: EdaDialog;
    public dashboard: any;

    public panelsToDisplay: Array<{ title, id, active, avaliable }>;
    public panelstoFilter: Array<{ title, id, active, avaliable }>;

    // Dialog  vars
    public targetCols: any[] = [];
    public targetTables: any[] = [];
    public targetValues: any = [];
    public targetCol: any;
    public targetTable: any;
    public selectedValues: any = [];
    public applyToAll: boolean = true;
    public switchChecked: boolean = false;

    public rangeDates: Date[];
    public selectedRange : string = null;

    // Global filters vars
    public filtersList: Array<{ table, column, panelList, data, selectedItems, selectedRange, id, isGlobal, applyToAll }> = [];

    constructor(private globalFiltersService: GlobalFiltersService,
        private dashboardService: DashboardService,
        private queryBuilderService: QueryBuilderService,
        private fileUtils: FileUtiles,
        private alertService: AlertService) {
        super();

        this.dialog = new EdaDialog({
            show: () => this.onShow(),
            hide: () => this.onClose(EdaDialogCloseEvent.NONE),
            title: $localize`:@@DashboardFilters:FILTROS DEL INFORME`
        });
    }

    onShow() {
        this.dashboard = this.controller.params;
        this.selectPanelToFilter(this.dashboard.panels.filter(p => p.content)[0]);
    }


    selectPanelToFilter(panel) {
        const newPanel = this.dashboard.panels.find(p => p.id === panel.id);
        const panels = this.globalFiltersService.panelsToDisplay(this.dashboard.dataSource.model.tables, this.dashboard.panels, newPanel);
        const sortByTittle = (a, b) => {
            if (a.title < b.title) { return -1; }
            if (a.title > b.title) { return 1; }
            return 0;
        };
        this.panelsToDisplay = panels.sort(sortByTittle);
        this.panelstoFilter = this.panelsToDisplay.filter(p => p.avaliable === true);
        this.applyToAll = !(this.panelsToDisplay.length === this.panelstoFilter.length); // Filter can only apply to all panels if all panels are in display list
        this.setTablesAndColumnsToFilter();
    }

    setTablesAndColumnsToFilter() {
        const tables = [];
        let notVisibleTables = [];
        this.targetTables = [];

        notVisibleTables = this.dashboard.dataSource.model.tables.filter(t => t.visible === false).map(t => t.table_name);
        this.panelstoFilter.forEach(panel => {
            const tmpPanel = this.dashboard.panels.find(p => p.id === panel.id);
            tmpPanel.content.query.query.fields.forEach(field => {
                if (!tables.includes(field.table_id)) {
                    tables.push(field.table_id);
                }
            });
        });

        const fMap = this.globalFiltersService.relatedTables(tables, this.dashboard.dataSource.model.tables);
        fMap.forEach((value: any, key: string) => {
            if (!notVisibleTables.includes(key)) {
                this.targetTables.push({ label: value.display_name.default, value: key });
            }
        });

        this.targetTables = this.targetTables.slice();
    }

    addPanelToFilter(panel) {
        if (panel.avaliable === false) {
            this.selectPanelToFilter(panel);
        } else if (panel.active === true) {
            panel.active = false;
            this.panelstoFilter = this.panelstoFilter.filter(p => p.id !== panel.id);
        } else {
            panel.active = true;
            this.panelstoFilter.push(panel);
        }
    }

    getColumnsByTable() {
        this.targetCols = [];
        const table = this.dashboard.dataSource.model.tables.filter(t => t.display_name.default === this.targetTable.label);

        table[0].columns.filter(col => col.visible === true).forEach(col => {
            this.targetCols.push({ label: col.display_name.default, value: col });
        });

        this.targetCols = this.targetCols.slice();
    }

    saveGlobalFilter() {
        if (this.panelstoFilter.length === 0 || !this.targetTable || !this.targetCol) {
            return this.alertService.addWarning($localize`:@@MandatoryFields:Recuerde rellenar los campos obligatorios`);
        }

        this.filtersList.push({
            table: this.targetTable, column: this.targetCol,
            panelList: this.panelstoFilter.map(p => p.id), data: null, selectedItems: this.selectedValues, selectedRange:this.selectedRange, id: this.fileUtils.generateUUID(),
            isGlobal: true, applyToAll: !this.applyToAll
        });

        // this.loadGLobalFiltersData(this.filtersList[this.filtersList.length - 1]);
        const response = {
            filterList: this.filtersList[this.filtersList.length - 1],
            targetTable: this.targetTable.value
        };
        this.onClose(EdaDialogCloseEvent.NEW, response);
    }

    loadGlobalFiltersData() {
        const params = {
            table: this.targetTable.value,
            dataSource: this.dashboard.dataSource._id,
            dashboard: this.dashboard.id,
            panel: '',
            filters: []
        };
        this.dashboardService.executeQuery(
            this.queryBuilderService.normalQuery([this.targetCol.value], params)
        ).subscribe(
            res => this.targetValues = res[1].map(item => ({ label: item[0], value: item[0] })),
            err => this.alertService.addError(err)
        );
    }

    processPickerEvent(event){
        if (event.dates) {
            const dtf = new Intl.DateTimeFormat('en', { year: 'numeric', month: '2-digit', day: '2-digit' });
            if ( !event.dates[1]) {
                event.dates[1] = event.dates[0];
            }

            let stringRange = [event.dates[0], event.dates[1]]
                .map(date => {
                    let [{ value: mo }, , { value: da }, , { value: ye }] = dtf.formatToParts(date);
                    return `${ye}-${mo}-${da}`
                });

            this.selectedValues = stringRange;
            this.selectedRange = event.range;
        }
    }

    confirmDisabled(){
        if(this.datePicker){
            return this.targetCol && this.targetCol.value.column_type === 'date' && this.datePicker.active;
        }
       else return false;
    }

    applyToAllCheck() {
        return this.applyToAll;
    }


    resetSelectedValues() {
        this.selectedValues = [];
    }

    closeDialog() {
        this.onClose(EdaDialogCloseEvent.NONE);
    }

    onClose(event: EdaDialogCloseEvent, response?: any): void {
        return this.controller.close(event, response);
    }

}
