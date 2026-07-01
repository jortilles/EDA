import {Component, Output, EventEmitter, ViewChild} from '@angular/core';
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
/* SDA CUSTOM */ import { DateUtils } from '@eda/services/utils/date-utils.service';
/* SDA CUSTOM */ import { rangeDateFormats } from '@eda/shared/components/date-dialog/date-format-dialog.index';
import * as _ from 'lodash';

import { aggTypes } from 'app/config/aggretation-types';


@Component({
    selector: 'app-filter-dialog',
    templateUrl: './filter-dialog.component.html',
    styleUrls: ['./filter-dialog.component.css']
})

export class FilterDialogComponent extends EdaDialogAbstract {

    @ViewChild('myCalendar', { static: false }) datePicker: EdaDatePickerComponent;
    @Output() updateSortedFiltersFilterDialog: EventEmitter<any> = new EventEmitter<any>();    


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

    public filterBeforeAfter = {
        filterBeforeGrouping: true, // valor por defecto true ==> WHERE / valor false ==> HAVING
        elements: [
            {label: 'Aplicar el filtro sobre todos los registros.', value: true}, // WHERE
            {label: 'Aplicar el filtro sobre los resultados.', value: false}, // HAVING
        ],
    }
    public filterBeforeAfterSelected: any;

    public inputType: string;
    public filterValue: any = {};
    public filterSelected: FilterType;
    public dropDownFields: any[] = [];
    public limitSelectionFields: number;
    public aggregationsTypes: any[] = [];
    public aggregationType: any = null;

    /* SDA CUSTOM */ public displayDateFormat: boolean = false;
    /* SDA CUSTOM */ private _pendingDynamicValue: string = null;

    /* SDA CUSTOM */ public datePickerConfig: any;
    /* SDA CUSTOM */ public dateFormatSelected: any;
    /* SDA CUSTOM */ public showDateFormatSelecter: boolean = true;
    /* SDA CUSTOM */ public showEdaDatePicker: boolean = false;
    /* SDA CUSTOM */ public showEdaDatePickerSingleSelection: boolean = false;
    /* SDA CUSTOM */ public showEdaDatePickerMultipleSelection: boolean = false;
    /* SDA CUSTOM */ public isDateFormatAvailable: boolean = false;
    /* SDA CUSTOM */ public rangeDateFormat: Array<SelectItem> = [];
    /* SDA CUSTOM */ public dateFilterOperators: FilterType[] = [];

    // Tooltip
    public whereMessage: string = $localize`:@@whereMessage: Filtro sobre todos los registros`;
    public havingMessage: string = $localize`:@@havingMessage: Filtro sobre los resultados`;
    public textBetween: string = $localize`:@@textBetween:Entre`
    /* SDA CUSTOM */    public isValueListSource: boolean = false;


    constructor(
        private dashboardService: DashboardService,
        private chartUtils: ChartUtilsService,
        private columnUtils: ColumnUtilsService,
        private queryBuilder: QueryBuilderService,
        private alertService: AlertService,
        /* SDA CUSTOM */ private dateUtils: DateUtils
    ) {
        super();

        this.filter.types = this.chartUtils.filterTypes;

        this.dialog = new EdaDialog({
            show: () => this.onShow(),
            hide: () => this.onClose(EdaDialogCloseEvent.NONE),
            title: ''
        });

        this.dialog.style = { width: '70%', height: '70%', top:"-4em", left:'1em'};

        // Inicializando el valor del WHERE / HAVING
        this.filterBeforeAfterSelected = this.filterBeforeAfter.elements[0]

    }

    onShow(): void {
        this.selectedColumn = this.controller.params.selectedColumn;
        const title = this.selectedColumn.display_name.default;
        this.dialog.title = `Atributo ${title} de la entidad ${this.controller.params.table}`;

        /* SDA CUSTOM */ if (this.selectedColumn.column_type === 'date') {
        /* SDA CUSTOM */     this.initDateFilterConfig();
        /* SDA CUSTOM */ }

        this.carrega();
        /* SDA CUSTOM */ if(this.selectedColumn.valueListSource) this.isValueListSource = true;
    }

    addFilter() {
        const table = this.selectedColumn.table_id;
        const column_type  = this.selectedColumn.column_type;
        const column = this.selectedColumn.column_name;
        const type = this.filterSelected.value;
        const selectedRange = this.filter.range;
        /* SDA CUSTOM */ let dynamicValue = this._pendingDynamicValue;
        /* SDA CUSTOM */ if (!dynamicValue && this.dateFormatSelected && this.dateFormatSelected.value !== 'customDate' && this.selectedColumn.column_type === 'date') {
        /* SDA CUSTOM */     dynamicValue = this.dateFormatSelected.value;
        /* SDA CUSTOM */ }
        const valueListSource = this.selectedColumn.valueListSource;
        const joins = this.selectedColumn.joins;
        const autorelation = this.selectedColumn.autorelation;
        const filterBeforeGrouping = this.filterBeforeAfter.filterBeforeGrouping
        const aggregation_type = this.aggregationType ? this.aggregationType.value : null;
        const data = this.dropDownFields;

        const computed_column = this.selectedColumn.computed_column;
        const SQLexpression = this.selectedColumn.SQLexpression;

        const filter = this.columnUtils.setFilter({
            obj: this.filterValue,
            table,
            column,
            column_type,
            type,
            selectedRange,
            /* SDA CUSTOM */ dynamicValue,
            valueListSource,
            autorelation,
            joins,
            filterBeforeGrouping,
            aggregation_type,
            data,
            computed_column,
            SQLexpression
        });
        
        this.filter.selecteds.push(filter);
        this.carregarFilters();

        /* Reset Filter Form */
        this.resetDisplay();
        this.filterSelected = undefined; // filtre seleccionat cap
        this.filterValue = {}; // filtre ningun
        this.filter.range = null;
        /* SDA CUSTOM */ if (this.selectedColumn?.column_type === 'date') {
        /* SDA CUSTOM */     this.resetDateFilterUI();
        /* SDA CUSTOM */ }

        // Regresando al valor inicial el WHERE / HAVING
        this.filterBeforeAfter.filterBeforeGrouping = true;
        this.filterBeforeAfterSelected = this.filterBeforeAfter.elements[0]
        this.aggregationType = {display_name: 'Suma', value: 'sum', selected: true};

        const addToSortedFilters = {
            add: true,
            filter: filter
        };

        // Control of adding just filter in the where section
        if(filter['filterBeforeGrouping']) {
            this.updateSortedFiltersFilterDialog.emit(addToSortedFilters); // Emitting an event to the eda-blank-panel component
        }
    }

    carrega() {
        this.carregarFilters();
        this.handleInputTypes();
        this.handleAggregationType();
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

    handleAggregationType() {

        this.aggregationsTypes = JSON.parse(JSON.stringify(this.selectedColumn.aggregation_type));

        for (let agg of this.aggregationsTypes) {
            if(agg.value === 'sum') {
                agg.selected = true;
                this.aggregationType = agg; // Obtenemos la agregación por default
            } else {
                agg.selected = false;
            }
        }

        // La agregacion none, esta descartada
        this.aggregationsTypes.pop();

    }
    
    addAggregation(type: any) {

        // Seleccionando la agregación
        this.aggregationsTypes.find((ag:any) => ag.value === type.value).selected = true;

        for (let ag of this.aggregationsTypes) {
            if (ag.selected === true && type.value !== ag.value) {
                ag.selected = false;
            }
        }

        // Recarguem les agregacions d'aquella columna + la seleccionada
        this.selectedColumn.aggregation_type = JSON.parse(JSON.stringify(this.aggregationsTypes));

        // Obteniendo la agregación seleccionada
        this.aggregationType = _.cloneDeep(type);

    }

    getAggName(value: string) {
        return aggTypes.filter(agg => agg.value === value)[0].label;
    }

    getAggregationText(value: any) {
        if(!value.aggregation_type){
            return 'none'; //  if there isn`t aggregation, none is added.
        } else {
            const label = aggTypes.filter(agg => {
                return (agg.value === value.aggregation_type);
            })[0].label;
            return label;
        } 
    }

/**SDA CUSTOM  */    getFilterText(value) {
/**SDA CUSTOM  */        if(value.filter_type === 'between') return this.chartUtils.filterTypesLabels.find((value: any) => value.value === 'between').label;
/**SDA CUSTOM  */        if(value.filter_type === 'in') return this.chartUtils.filterTypesLabels.find((value: any) => value.value === 'in').label;
/**SDA CUSTOM  */        if(value.filter_type === 'not_in') return this.chartUtils.filterTypesLabels.find((value: any) => value.value === 'not_in').label;
/**SDA CUSTOM  */        if(value.filter_type === 'not_null') return this.chartUtils.filterTypesLabels.find((value: any) => value.value === 'not_null').label;
/**SDA CUSTOM  */        if(value.filter_type === 'not_null_nor_empty') return this.chartUtils.filterTypesLabels.find((value: any) => value.value === 'not_null_nor_empty').label;
/**SDA CUSTOM  */        if(value.filter_type === 'null_or_empty') return this.chartUtils.filterTypesLabels.find((value: any) => value.value === 'null_or_empty').label;
/**SDA CUSTOM  */        return value.filter_type;
/**SDA CUSTOM  */    }

    removeFilter(item: any) {

        const addToSortedFilters = {
            add: false,
            filter: item
        };

        this.updateSortedFiltersFilterDialog.emit(addToSortedFilters); // Emitting an event to the eda-blank-panel component

        /* SDA CUSTOM */ const matched = this.filter.selecteds.find(f => _.startsWith(f.filter_id, item.filter_id));
        /* SDA CUSTOM */ if (matched) {
        /* SDA CUSTOM */     matched.removed = true;
        /* SDA CUSTOM */ }

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

            /**SDA CUSTOM  */ if(['in', 'not_in'].includes(filter.value) && this.selectedColumn.column_type === 'date') {
            /**SDA CUSTOM  */     this.filter.switch = false;
            /**SDA CUSTOM  */ } else {
            /**SDA CUSTOM  */     this.filter.switch = handler.switchBtn;
            /**SDA CUSTOM  */ }

            if (handler.switchBtn) {
                this.loadDropDrownData();
                this.display.switchButton = true;
            } /**SDA CUSTOM  */else {
              /**SDA CUSTOM  */  this.dropDownFields = [];
            }

            if ( !_.isEqual(filter.value, 'between') ) {
                this.filterValue = {};
            }

            /* SDA CUSTOM */ if(filter.value === "=" || filter.value === "!=") {
            /* SDA CUSTOM */     this.loadDropDrownData();
            /* SDA CUSTOM */     this.filter.switch = handler.switchBtn || this.isValueListSource;
            /* SDA CUSTOM */ }

            if(['in', 'not_in', 'not_null', 'not_null_nor_empty', 'null_or_empty'].includes(filter.value)) {
                this.whereHavingSwitch({
                    label: 'WHERE',
                    value: true,
                })
                this.filterBeforeAfterSelected = {label: 'WHERE', value: true}
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
        /**SDA CUSTOM  */ this.dropDownFields = [];
    }

    async loadDropDrownData() {
        this.filterValue.value1 = null;
        this.filterValue.value2 = null;
/* SDA CUSTOM*/ this.dropDownFields = [];
        if (this.filter.switch || this.isValueListSource ) {  // SDA CUSTOM => this.isValueListSource
            const column = _.cloneDeep(this.selectedColumn);
            column.table_id = column.table_id.split('.')[0];
            column.joins = [];
            column.ordenation_type = 'Asc';

            const params = {
                table: column.table_id,
                dataSource: this.controller.params.inject.dataSource._id,
                dashboard: this.controller.params.inject.dashboard_id,
                panel: this.controller.params.panel._id,
                connectionProperties: this.controller.params.connectionProperties,
                filters: [],
                forSelector: true
            };

            try {
                const res = await this.dashboardService.executeQuery(this.queryBuilder.normalQuery([column], params)).toPromise();
            
                if (res.length > 1) {
                    for (const item of res[1]) {
                        if (item[0] === '' || item[0] ) { 
                            if(column.valueListSource !== undefined) {
                                this.dropDownFields.push({ label : item[0], value: item[0], id: item[1] });
                            } else {
                                this.dropDownFields.push({ label : item[0], value: item[0] });
                            }
                        }
                    }
                }
            } catch (err) {
                this.alertService.addError(err);
                throw err;
            }
        }
    }

    whereHavingSwitch(selected) {

        if(selected.value) {
            this.filterBeforeAfter.filterBeforeGrouping = true;
            return true
        } else {
            this.filterBeforeAfter.filterBeforeGrouping = false;
            return false
        }

    }

    processPickerEvent(event) {
        /**SDA CUSTOM  */ this.dropDownFields = [];
        if (event.dates) {
            const dtf = new Intl.DateTimeFormat('en', { year: 'numeric', month: '2-digit', day: '2-digit' });
            /**SDA CUSTOM  */const dates = Array.isArray(event.dates) ? event.dates : [event.dates, event.dates];
            /**SDA CUSTOM  */if (!dates[1]) {
            /**SDA CUSTOM  */    dates[1] = dates[0];
            /**SDA CUSTOM  */}

            /**SDA CUSTOM  */this.filter.range = event.range;

            /**SDA CUSTOM  */const isInFilter = this.filterSelected?.value === 'in' || this.filterSelected?.value === 'not_in';
            /**SDA CUSTOM  */if (isInFilter) {
            /**SDA CUSTOM  */    const allDates = [];
            /**SDA CUSTOM  */    const start = new Date(dates[0]);
            /**SDA CUSTOM  */    const end = new Date(dates[1]);
            /**SDA CUSTOM  */    start.setHours(0, 0, 0, 0);
            /**SDA CUSTOM  */    end.setHours(0, 0, 0, 0);
            /**SDA CUSTOM  */    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            /**SDA CUSTOM  */        const [{ value: mo }, , { value: da }, , { value: ye }] = dtf.formatToParts(new Date(d));
            /**SDA CUSTOM  */        allDates.push(`${ye}-${mo}-${da}`);
            /**SDA CUSTOM  */    }
            /**SDA CUSTOM  */    this.filterValue.value1 = allDates;
            /**SDA CUSTOM  */} else {
            /**SDA CUSTOM  */    const stringRange = [dates[0], dates[1]].map(date => {
            /**SDA CUSTOM  */        const [{ value: mo }, , { value: da }, , { value: ye }] = dtf.formatToParts(date);
            /**SDA CUSTOM  */         return `${ye}-${mo}-${da}`;
            /**SDA CUSTOM  */    });
            /**SDA CUSTOM  */    this.filterValue.value1 = stringRange[0];
            /**SDA CUSTOM  */    if (this.display.between) {
            /**SDA CUSTOM  */        this.filterValue.value2 = stringRange[1];
            /**SDA CUSTOM  */    }
            }
            this.display.filterButton = false;
        }
    }

    /**SDA CUSTOM  */ onOpenDateFormatDialog() {
    /**SDA CUSTOM  */     this.displayDateFormat = true;
    /**SDA CUSTOM  */ }

    /**SDA CUSTOM  */onCloseDateFormatDialog(event: any) {
    /**SDA CUSTOM  */    this.displayDateFormat = false;
    /**SDA CUSTOM  */
    /**SDA CUSTOM  */    if (event) {
    /**SDA CUSTOM  */        const { dateFormatSet, filterSelected }: any = event;
    /**SDA CUSTOM  */        this.filterSelected = JSON.parse(JSON.stringify(filterSelected));
    /**SDA CUSTOM  */
    /**SDA CUSTOM  */        if (dateFormatSet.dynamic) {
    /**SDA CUSTOM  */            const dates = this.dateUtils.getRange(dateFormatSet.dynamicValue);
    /**SDA CUSTOM  */            const dtf = new Intl.DateTimeFormat('en', { year: 'numeric', month: '2-digit', day: '2-digit' });
    /**SDA CUSTOM  */            const toStr = (d: Date): string => {
    /**SDA CUSTOM  */                const [{ value: mo }, , { value: da }, , { value: ye }] = dtf.formatToParts(d);
    /**SDA CUSTOM  */                return `${ye}-${mo}-${da}`;
    /**SDA CUSTOM  */            };
    /**SDA CUSTOM  */
    /**SDA CUSTOM  */            if (filterSelected.value === 'in' || filterSelected.value === 'not_in') {
    /**SDA CUSTOM  */                /* SDA CUSTOM: store boundary dates; dynamicValue signals BETWEEN semantics to the backend */
    /**SDA CUSTOM  */                this.filterValue = { value1: toStr(dates[0]), value2: toStr(dates[1]) };
    /**SDA CUSTOM  */            } else {
    /**SDA CUSTOM  */                this.filterValue = { value1: toStr(dates[0]) };
    /**SDA CUSTOM  */            }
    /**SDA CUSTOM  */
    /**SDA CUSTOM  */            this.filter.range = dateFormatSet.dynamicValue;
    /**SDA CUSTOM  */            this._pendingDynamicValue = dateFormatSet.dynamicLabel;
    /**SDA CUSTOM  */        } else {
    /**SDA CUSTOM  */            this.filterValue = JSON.parse(JSON.stringify(dateFormatSet.dateValue));
    /**SDA CUSTOM  */            this.filter.range = null;
    /**SDA CUSTOM  */            this._pendingDynamicValue = null;
    /**SDA CUSTOM  */        }
    /**SDA CUSTOM  */
    /**SDA CUSTOM  */        this.addFilter();
    /**SDA CUSTOM  */        this._pendingDynamicValue = null;
    /**SDA CUSTOM  */    }
    /**SDA CUSTOM  */}

    /* SDA CUSTOM */ private initDateFilterConfig(): void {
    /* SDA CUSTOM */     this.dateFilterOperators = this.chartUtils.filterTypes.filter((ft: any) => ft.value !== 'like' && ft.value !== 'not_like');
    /* SDA CUSTOM */     this.rangeDateFormat = [...rangeDateFormats];
    /* SDA CUSTOM */     this.resetDateFilterUI();
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ private resetDateFilterUI(): void {
    /* SDA CUSTOM */     this.showDateFormatSelecter = true;
    /* SDA CUSTOM */     this.showEdaDatePicker = false;
    /* SDA CUSTOM */     this.showEdaDatePickerSingleSelection = false;
    /* SDA CUSTOM */     this.showEdaDatePickerMultipleSelection = false;
    /* SDA CUSTOM */     this.isDateFormatAvailable = false;
    /* SDA CUSTOM */     this.dateFormatSelected = null;
    /* SDA CUSTOM */     this.filterSelected = null;
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ public handleDateFilterOperatorChange(operator: FilterType): void {
    /* SDA CUSTOM */     this.showDateFormatSelecter = true;
    /* SDA CUSTOM */     this.showEdaDatePicker = false;
    /* SDA CUSTOM */     this.showEdaDatePickerSingleSelection = false;
    /* SDA CUSTOM */     this.showEdaDatePickerMultipleSelection = false;

    /* SDA CUSTOM */     if (operator !== undefined && operator !== null) {
    /* SDA CUSTOM */         this.isDateFormatAvailable = true;
    /* SDA CUSTOM */     } else {
    /* SDA CUSTOM */         this.dateFormatSelected = null;
    /* SDA CUSTOM */         this.isDateFormatAvailable = false;
    /* SDA CUSTOM */         this.rangeDateFormat = [];
    /* SDA CUSTOM */         this.display.filterButton = true;
    /* SDA CUSTOM */         return;
    /* SDA CUSTOM */     }

    /* SDA CUSTOM */     const noDateNeeded = ['not_null', 'not_null_nor_empty', 'null_or_empty'];
    /* SDA CUSTOM */     if (noDateNeeded.includes(operator.value)) {
    /* SDA CUSTOM */         this.display.filterButton = false;
    /* SDA CUSTOM */         this.showDateFormatSelecter = false;
    /* SDA CUSTOM */         this.isDateFormatAvailable = false;
    /* SDA CUSTOM */         return;
    /* SDA CUSTOM */     }

    /* SDA CUSTOM */     if(['=', '!=', '>', '<', '>=', '<='].includes(operator.value)) {
    /* SDA CUSTOM */         this.dateFormatSelected = null;
    /* SDA CUSTOM */         this.rangeDateFormat = rangeDateFormats.filter((ft: any, index: number) => index < 5);
    /* SDA CUSTOM */         this.rangeDateFormat.push(rangeDateFormats[rangeDateFormats.length - 1]);
    /* SDA CUSTOM */         return;
    /* SDA CUSTOM */     }

    /* SDA CUSTOM */     if(['in', 'not_in'].includes(operator.value)) {
    /* SDA CUSTOM */         this.dateFormatSelected = null;
    /* SDA CUSTOM */         this.rangeDateFormat = rangeDateFormats.filter((ft: any, index: number) => index >= 5);
    /* SDA CUSTOM */         return;
    /* SDA CUSTOM */     }

    /* SDA CUSTOM */     if(['between', 'not_between'].includes(operator.value)) {
    /* SDA CUSTOM */         this.dateFormatSelected = { label: $localize`:@@DatePickerCustomDate:Seleccionar fecha`, value: 'customDate' };
    /* SDA CUSTOM */         this.showDateFormatSelecter = false;
    /* SDA CUSTOM */         this.showEdaDatePicker = true;
    /* SDA CUSTOM */         this.display.between = true;
    /* SDA CUSTOM */         this.filterValue = {};
    /* SDA CUSTOM */         this.initInlineDatePickerConfig();
    /* SDA CUSTOM */         return;
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ public handleDateFilterFormatChange(format: any): void {
    /* SDA CUSTOM */     this.showEdaDatePickerSingleSelection = false;
    /* SDA CUSTOM */     this.showEdaDatePickerMultipleSelection = false;

    /* SDA CUSTOM */     if (!format) {
    /* SDA CUSTOM */         this.display.filterButton = true;
    /* SDA CUSTOM */         this.filter.range = null;
    /* SDA CUSTOM */         return;
    /* SDA CUSTOM */     }

    /* SDA CUSTOM */     if(['=', '!=', '>', '<', '>=', '<='].includes(this.filterSelected?.value) && format.value === 'customDate') {
    /* SDA CUSTOM */         this.showEdaDatePickerSingleSelection = true;
    /* SDA CUSTOM */         this.initInlineDatePickerConfig();
    /* SDA CUSTOM */         return;
    /* SDA CUSTOM */     }

    /* SDA CUSTOM */     if(['in', 'not_in'].includes(this.filterSelected?.value) && format.value === 'customDate') {
    /* SDA CUSTOM */         this.showEdaDatePickerMultipleSelection = true;
    /* SDA CUSTOM */         this.initInlineDatePickerConfig();
    /* SDA CUSTOM */         return;
    /* SDA CUSTOM */     }

    /* SDA CUSTOM */     this.filter.range = format.value;
    /* SDA CUSTOM */     this.display.filterButton = false;

    /* SDA CUSTOM */     // When selecting a predefined range, calculate the dates for filterValue
    /* SDA CUSTOM */     if (format.value !== 'customDate') {
    /* SDA CUSTOM */         const dates = this.dateUtils.getRange(format.value);
    /* SDA CUSTOM */         const dtf = new Intl.DateTimeFormat('en', { year: 'numeric', month: '2-digit', day: '2-digit' });
    /* SDA CUSTOM */         const toStr = (d: Date): string => {
    /* SDA CUSTOM */             const [{ value: mo }, , { value: da }, , { value: ye }] = dtf.formatToParts(d);
    /* SDA CUSTOM */             return `${ye}-${mo}-${da}`;
    /* SDA CUSTOM */         };
    /* SDA CUSTOM */         this.filterValue = { value1: toStr(dates[0]) };
    /* SDA CUSTOM */         if (this.filterSelected?.value === 'in' || this.filterSelected?.value === 'not_in') {
    /* SDA CUSTOM */             this.filterValue.value2 = toStr(dates[1]);
    /* SDA CUSTOM */         }
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ private initInlineDatePickerConfig(): void {
    /* SDA CUSTOM */     if (!this.datePickerConfig) {
    /* SDA CUSTOM */         this.datePickerConfig = {};
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */     this.datePickerConfig.dateRange = [];
    /* SDA CUSTOM */     this.datePickerConfig.range = null;

    /* SDA CUSTOM */     if (this.filterValue?.value1) {
    /* SDA CUSTOM */         const v1 = this.filterValue.value1;
    /* SDA CUSTOM */         if (Array.isArray(v1)) {
    /* SDA CUSTOM */             this.datePickerConfig.dateRange = v1.map((d: string) => new Date(d.replace(/-/g, '/')));
    /* SDA CUSTOM */         } else {
    /* SDA CUSTOM */             this.datePickerConfig.dateRange.push(new Date(v1.replace(/-/g, '/')));
    /* SDA CUSTOM */             if (this.filterValue.value2) {
    /* SDA CUSTOM */                 this.datePickerConfig.dateRange.push(new Date(this.filterValue.value2.replace(/-/g, '/')));
    /* SDA CUSTOM */             }
    /* SDA CUSTOM */         }
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ public processInlineDatePickerEvent(event: any): void {
    /* SDA CUSTOM */     if (!event.dates) return;

    /* SDA CUSTOM */     const dtf = new Intl.DateTimeFormat('en', { year: 'numeric', month: '2-digit', day: '2-digit' });
    /* SDA CUSTOM */     const dates = Array.isArray(event.dates) ? event.dates : [event.dates, event.dates];

    /* SDA CUSTOM */     if (!dates[1]) {
    /* SDA CUSTOM */         dates[1] = dates[0];
    /* SDA CUSTOM */     }

    /* SDA CUSTOM */     this.filter.range = event.range;

    /* SDA CUSTOM */     const isInFilter = this.filterSelected?.value === 'in' || this.filterSelected?.value === 'not_in';
    /* SDA CUSTOM */     if (isInFilter) {
    /* SDA CUSTOM */         this.filterValue.value1 = dates
    /* SDA CUSTOM */             .filter((d: any) => d != null)
    /* SDA CUSTOM */             .map((date: any) => {
    /* SDA CUSTOM */                 const [{ value: mo }, , { value: da }, , { value: ye }] = dtf.formatToParts(new Date(date));
    /* SDA CUSTOM */                 return `${ye}-${mo}-${da}`;
    /* SDA CUSTOM */             });
    /* SDA CUSTOM */     } else {
    /* SDA CUSTOM */         const stringRange = [dates[0], dates[1]].map(date => {
    /* SDA CUSTOM */             const [{ value: mo }, , { value: da }, , { value: ye }] = dtf.formatToParts(date);
    /* SDA CUSTOM */             return `${ye}-${mo}-${da}`;
    /* SDA CUSTOM */         });
    /* SDA CUSTOM */         this.filterValue.value1 = stringRange[0];
    /* SDA CUSTOM */         if (this.filterSelected?.value === 'between') {
    /* SDA CUSTOM */             this.filterValue.value2 = stringRange[1];
    /* SDA CUSTOM */         }
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */     this.display.filterButton = false;
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ public getDateFilterDisplayLabel(filtre: any): string {
    /* SDA CUSTOM */     if (!filtre) return '';

    /* SDA CUSTOM */     const dynamicValue = filtre.dynamicValue || filtre.selectedRange;
    /* SDA CUSTOM */     if (dynamicValue && dynamicValue !== 'customDate') {
    /* SDA CUSTOM */         return this.getRangeLabel(dynamicValue);  // Only return the value, operator is shown separately
    /* SDA CUSTOM */     }

    /* SDA CUSTOM */     if (!filtre.filter_elements || filtre.filter_elements.length === 0) {
    /* SDA CUSTOM */         return '';  // No value to display
    /* SDA CUSTOM */     }

    /* SDA CUSTOM */     const fmt = (s: string) => {
    /* SDA CUSTOM */         if (!s) return '';
    /* SDA CUSTOM */         const [ye, mo, da] = s.split('-');
    /* SDA CUSTOM */         return `${da}-${mo}-${ye.slice(2)}`;
    /* SDA CUSTOM */     };

    /* SDA CUSTOM */     const items = filtre.filter_elements;
    /* SDA CUSTOM */     if (items.length === 1 || !items[1]) {
    /* SDA CUSTOM */         const val = items[0].value1;
    /* SDA CUSTOM */         if (Array.isArray(val)) {
    /* SDA CUSTOM */             return val.map((v: string) => fmt(v)).join(', ');
    /* SDA CUSTOM */         }
    /* SDA CUSTOM */         return fmt(val);
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */     const v1 = items[0].value1;
    /* SDA CUSTOM */     const v2 = items[1].value2;
    /* SDA CUSTOM */     const s1 = Array.isArray(v1) ? fmt(v1[0]) : fmt(v1);
    /* SDA CUSTOM */     const s2 = Array.isArray(v2) ? fmt(v2[0]) : fmt(v2);
    /* SDA CUSTOM */     return `${s1} - ${s2}`;
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ public getRangeLabel(value: string): string {
    /* SDA CUSTOM */     return rangeDateFormats.find((r: any) => r.value === value)?.label || value;
    /* SDA CUSTOM */ }

    /* SDA CUSTOM */ public get isReadyForDateFilter(): boolean {
    /* SDA CUSTOM */     if (this.filterSelected == null) return true;
    /* SDA CUSTOM */     const noDateNeeded = ['not_null', 'not_null_nor_empty', 'null_or_empty'];
    /* SDA CUSTOM */     if (noDateNeeded.includes(this.filterSelected.value)) return false;
    /* SDA CUSTOM */     if (this.dateFormatSelected == null) return true;
    /* SDA CUSTOM */     if (this.dateFormatSelected?.value === 'customDate') {
    /* SDA CUSTOM */         const hasValue1 = !this.filterValue?.value1;
    /* SDA CUSTOM */         const isBetween = this.filterSelected?.value === 'between';
    /* SDA CUSTOM */         return isBetween ? (hasValue1 || !this.filterValue?.value2) : hasValue1;
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */     return false;
    /* SDA CUSTOM */ }

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
