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
    public dropDownFields: SelectItem[] = [];
    public limitSelectionFields: number;

    constructor(
        private dashboardService: DashboardService,
        private chartUtils: ChartUtilsService,
        private columnUtils: ColumnUtilsService,
        private queryBuilder: QueryBuilderService,
        private alertService: AlertService
    ) {
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
        const table = this.selectedColumn.table_id;
        const column_type  = this.selectedColumn.column_type;
        const column = this.selectedColumn.column_name;
        const type = this.filterSelected.value;
        const selectedRange = this.filter.range;
        const valueListSource = this.selectedColumn.valueListSource;
        const joins = this.selectedColumn.joins;
        const autorelation = this.selectedColumn.autorelation;

        const filter = this.columnUtils.setFilter({
            obj: this.filterValue,
            table,
            column,
            column_type,
            type,
            selectedRange,
            valueListSource,
            autorelation,
            joins
        });
        
        this.filter.selecteds.push(filter);

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

    handleInputTypes() {
        const type = this.selectedColumn.column_type;
        this.inputType = this.columnUtils.handleInputTypes(type);
    }

    carregarFilters() {
        this.filter.selecteds = this.controller.params.filters;
        this.filter.forDisplay = this.filter.selecteds.filter(f =>
            f.filter_table === this.selectedColumn.table_id &&
            f.filter_column === this.selectedColumn.column_name &&
            !f.removed
        );
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
            this.display.switchButton = _.isEqual(filter.value, 'not_null') || _.isEqual(filter.value, 'not_null_nor_empty') || _.isEqual(filter.value, 'null_or_empty') ? true : false ;
            this.display.filterButton = filter.value == 'not_null' || filter.value == 'not_null_nor_empty' || filter.value == 'null_or_empty' ? false : true ;
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

    resetDisplay() {
        this.display.filterButton = true; // btn add filter
        this.display.between = false; // inputs between
        this.display.filterValue = false; // input de valor
        this.display.calendar = false; // input calendar
        this.display.switchButton = true;
        this.filter.switch = false; // options switch
    }

    async loadDropDrownData() {
        this.filterValue.value1 = null;
        this.filterValue.value2 = null;
        if (this.filter.switch) {
            const column = _.cloneDeep(this.selectedColumn);
            column.table_id = column.table_id.split('.')[0];
            column.joins = [];
            column.ordenation_type = 'ASC';

            const params = {
                table: column.table_id,
                dataSource: this.controller.params.inject.dataSource._id,
                dashboard: this.controller.params.inject.dashboard_id,
                panel: this.controller.params.panel._id,
                filters: [],
                forSelector: true
            };

            try {
                const res = await this.dashboardService.executeQuery(this.queryBuilder.normalQuery([column], params)).toPromise();
            
                if (res.length > 1) {
                    for (const item of res[1]) {
                        if (item[0] === '' || item[0] ) { 
                            this.dropDownFields.push({ label : item[0], value: item[0] });
                        }
                    }
                }
            } catch (err) {
                this.alertService.addError(err);
                throw err;
            }
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
