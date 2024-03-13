import {Component, ViewChild} from '@angular/core';
import {SelectItem} from 'primeng/api';
import {EdaDialogAbstract, EdaDialog, EdaDialogCloseEvent, EdaDatePickerComponent} from '@eda/shared/components/shared-components.index';
import {Column} from '@eda/models/model.index';
import {
    AlertService,
    ChartUtilsService,
    ColumnUtilsService,
    DashboardService,
    FilterType, QueryBuilderService,
} from '@eda/services/service.index';
import * as _ from 'lodash';

@Component({
    selector: 'app-filter-dialog',
    templateUrl: './filter-dialog.component.html'
})

export class FilterDialogComponent extends EdaDialogAbstract {

    @ViewChild('myCalendar', { static: false }) datePicker: EdaDatePickerComponent;


    public dialog: EdaDialog;
    public selectedColumn: Column;

    public display = {
        between: false,
        calendar: false,
        filterValue: false,
        filterButton: true,
        switchButton: true
    };
    public filter = {
        switch: false,
        types: [],
        forDisplay: [],
        selecteds: [],
        range : null
    };
    public inputType: string;
    public filterValue: any = {};
    public filterSelected: FilterType;
    public dropDownFields: SelectItem[];
    public limitSelectionFields: number;

    constructor( private dashboardService: DashboardService,
                 private chartUtils: ChartUtilsService,
                 private columnUtils: ColumnUtilsService,
                 private queryBuilder: QueryBuilderService,
                 private alertService: AlertService) {
        super();

        this.filter.types = this.chartUtils.filterTypes;

        this.dialog = new EdaDialog({
            show: () => this.onShow(),
            hide: () => this.onClose(EdaDialogCloseEvent.NONE),
            title: ''
        });

        this.dialog.style = { width: '50%', height: '70%', top:"-4em", left:'1em'};

    }

    onShow(): void {
        this.selectedColumn = this.controller.params.selectedColumn;
        const title = this.selectedColumn.display_name.default;
        this.dialog.title = `Atributo ${title} de la entidad ${this.controller.params.table}`;

        this.carrega();
    }

    addFilter() {

        const table =  this.selectedColumn.table_id;
        const columnType  = this.selectedColumn.column_type;
        const column = this.selectedColumn.column_name;
        const type = this.filterSelected.value;
        const range = this.filter.range;
        if(this.selectedColumn.valueListSource){
            this.filter.selecteds.push(
                this.columnUtils.addFilter(this.filterValue, table, column, columnType, type, range, this.selectedColumn.valueListSource)
            );
        }else{
            this.filter.selecteds.push(
                this.columnUtils.addFilter(this.filterValue, table, column, columnType, type, range)
            );
        }

        
        this.carregarFilters();

        /* Reset Filter Form */
        this.resetDisplay();
        this.filterSelected = undefined; // filtre seleccionat cap
        this.filterValue = {}; // filtre ningun
        this.filter.range = null;
    }

    carrega() {
        this.carregarFilters();
        this.handleInputTypes();
    }

    removeFilter(item: any) {
        this.filter.selecteds.find(f => _.startsWith(f.filter_id, item.filter_id) ).removed = true;

        this.filter.forDisplay = this.filter.selecteds.filter(f => {
            return _.startsWith(f.filter_table, this.selectedColumn.table_id) &&
                _.startsWith(f.filter_column, this.selectedColumn.column_name) &&
                !f.removed;
        });
    }

    handleValidForm(event) {
        if (!this.display.between) {
            this.filterValue = {};
        }
        const validators = {
            between: this.display.between,
            value: this.display.filterValue,
            selected: this.filterSelected,
        };
        this.display.filterButton = this.columnUtils.handleValidForm(event, this.filterValue, validators);
    }

    handleFilterChange(filter: FilterType) {
        if (filter) {
            const handler = this.columnUtils.handleFilterChange(filter);
            this.display.between = handler.between;
            this.display.filterValue = !_.isEqual(this.selectedColumn.column_type, 'date') ? handler.value : false;
            this.display.calendar = _.isEqual(this.selectedColumn.column_type, 'date') ? handler.value : false;
            this.display.switchButton = _.isEqual(filter.value, 'not_null');
            this.display.filterButton = !_.isEqual(filter.value, 'not_null');
            this.limitSelectionFields = handler.limitFields === 1 ? 1 : 50;
            this.filter.switch = handler.switchBtn;

            if (handler.switchBtn) {
                this.loadDropDrownData();
                this.display.switchButton = true;
            }

            if ( !_.isEqual(filter.value, 'between') ) {
                this.filterValue = {};
            }
        } else {
            this.resetDisplay();
        }
    }

    handleInputTypes() {
        const type = this.selectedColumn.column_type;
        this.inputType = this.columnUtils.handleInputTypes(type);
    }

    carregarFilters() {
        this.filter.selecteds = this.controller.params.filters;
        this.filter.forDisplay = this.filter.selecteds.filter(f => {
            return f.filter_table === this.selectedColumn.table_id &&
                f.filter_column === this.selectedColumn.column_name &&
                !f.removed;
        });
    }

    resetDisplay() {
        this.display.filterButton = true; // btn add filter
        this.display.between = false; // inputs between
        this.display.filterValue = false; // input de valor
        this.display.calendar = false; // input calendar
        this.display.switchButton = true;
        this.filter.switch = false; // options switch
    }

    loadDropDrownData() {
        this.filterValue.value1 = null;
        this.filterValue.value2 = null;
        if (this.filter.switch) {
            const params = {
                table: this.selectedColumn.table_id,
                dataSource: this.controller.params.inject.dataSource._id,
                dashboard: this.controller.params.inject.dashboard_id,
                panel: this.controller.params.panel._id,
                filters: [],
                forSelector: true
            };
            this.selectedColumn.ordenation_type= 'ASC' ;
            this.dashboardService.executeQuery(this.queryBuilder.normalQuery([this.selectedColumn], params)).subscribe(
                res => this.dropDownFields = res[1].map(item => ({label : item[0], value: item[0]}) ),
                err => this.alertService.addError(err)
            );
        }
    }

    processPickerEvent(event){
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

            this.filter.range = event.range;
            this.filterValue.value1 = stringRange[0];
            this.filterValue.value2 = stringRange[1];
            this.display.filterButton = false;
        }
    }

    closeDialog() {

        this.filter.switch = false;
        this.filterSelected = undefined;
        this.filterValue = {};
        this.onClose(EdaDialogCloseEvent.NONE, this.filter.selecteds);
    }

    onClose(event: EdaDialogCloseEvent, response?: any): void {
        return this.controller.close(event, response);
    }
}
