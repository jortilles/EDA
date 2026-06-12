import { Component, ViewChild, Input, Output, EventEmitter } from '@angular/core';
import { NgClass } from '@angular/common';
import { Column } from '@eda/models/model.index';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MultiSelectModule } from 'primeng/multiselect';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { CommonModule } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip'; 
import { SelectItem } from 'primeng/api';
import { DropdownModule } from 'primeng/dropdown';
import { InputSwitchModule } from 'primeng/inputswitch';
import { DashboardService, FilterType, ChartUtilsService, AlertService, OrdenationType, ColumnUtilsService, FormatDates, QueryBuilderService} from '@eda/services/service.index';
import { EdaDialog, EdaDialogCloseEvent, EdaDialog2Component, EdaDialogAbstract, EdaDatePickerComponent } from '@eda/shared/components/shared-components.index';
import { aggTypes } from 'app/config/aggretation-types';
import * as _ from 'lodash';
import { firstValueFrom } from 'rxjs';
import { InputTextModule } from 'primeng/inputtext';
import { IconComponent } from '@eda/shared/components/icon/icon.component';
import { FocusOnShowDirective } from '@eda/shared/directives/autofocus.directive';

const ANGULAR_MODULES = [
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    NgClass,
    MultiSelectModule,
    ScrollPanelModule
];

const PRIMENG_MODULES = [
    DropdownModule,
    InputSwitchModule,
    TooltipModule,
    InputTextModule
];

const STANDALONE_COMPONENTS = [
    EdaDialog2Component,
    EdaDatePickerComponent,
    IconComponent,
    FocusOnShowDirective
];

@Component({
    standalone: true,
    imports: [STANDALONE_COMPONENTS, ANGULAR_MODULES, PRIMENG_MODULES],
    selector: 'app-column-dialog',
    templateUrl: './column-dialog.component.html',
    styleUrls: ['../eda-blank-panel.component.css', './column-dialog.component.css']
})

export class ColumnDialogComponent {
    public displayWindow: boolean = false;
    @Input() controller: any;

    @ViewChild('myCalendar', { static: false }) datePicker: EdaDatePickerComponent;
    @Output() updateSortedFiltersColumnDialog: EventEmitter<any> = new EventEmitter<any>();

    public dialog: EdaDialog;
    public selectedColumn: Column;
    public duplicatedColumnName: string;
    public loading: boolean = true;
    
    public display = {
        calendar: false, // calendar inputs
        between: false, // between inputs
        filterValue: false,
        filterButton: true,
        switchButton: true,
        duplicateColumn: false
    };
    public filter = {
        switch: false,
        types: [],
        forDisplay: [],
        selecteds: [],
        range: null
    };
    public filterSelected: FilterType;
    public filterValue: any = {};
    public showFormatDateSection: boolean = false;

    public ordenationTypes: OrdenationType[];
    public formatDates: FormatDates[];
    public formatDate: FormatDates;
    public aggregationsTypes: any[] = [];
    public aggregationSelected: any;
    public inputType: string;
    public dropDownFields: SelectItem[] = [];
    public limitSelectionFields: number;
    public cumulativeSum: boolean;
    public dateNavEnabled: boolean = false;
    public cumulativeSumTooltip: string = $localize`:@@cumulativeSumTooltip:Si activas ésta función se calculará la suma acumulativa 
                                            para los campos numéricos que eligas. Sólo se puede activar si la fecha está agregada por mes, semana o dia.`
    public title: string;
    public editingTitle: boolean = false;
    public editableTitle: string = '';

    public ranges: number[] = [];
    public rangeString: string;
    public selectedRange: string = '';
    public showRange: boolean = false;
    public availableRange: boolean = true;
    public allowedAggregations: boolean = true;

    public childOptions: {label: string, value: any}[] = [];
    public selectedParent: any = null;
    public ptooltipViewTextRanges: string = $localize`:@@ptooltipViewTextRanges:Al configurar un Rango las agregaciones quedarán bloqueadas, Ejemplo de un rango válido - 12:18:50:100 `;
    public ptooltipNotAvailableRanges: string = $localize`:@@ptooltipNotAvailableRanges:No es posible crear un rango nuevo por que ya existe uno configurado`;
    public rangeDescriptionNumberError: string = $localize`:@@rangeDescriptionNumberError:El correcto orden de los límites del rango van de menor a mayor`;
    public rangeDescriptionCharacterError: string = $localize`:@@rangeDescriptionCharacterError:El último caracter del rango debe ser un número`;
    public filterBeforeAfter = {
        filterBeforeGrouping: true, // default value true ==> WHERE / false value ==> HAVING
        elements: [
            { label: $localize`:@@whereMessageLabel:Aplicar el filtro sobre todos los registros`, value: true },
            { label: $localize`:@@havingMessageLabel:Aplicar el filtro sobre los resultados`, value: false },
        ],
    }
    public filterBeforeAfterSelected: any;
    public aggregationType: any = null;

    // Tooltip
    public whereMessage: string = $localize`:@@whereMessage: Filtro sobre todos los registros`;
    public havingMessage: string = $localize`:@@havingMessage: Filtro sobre los resultados`;
    public textBetween: string = $localize`:@@textBetween:Entre`

    constructor(
        private dashboardService: DashboardService,
        private chartUtils: ChartUtilsService,
        private columnUtils: ColumnUtilsService,
        private queryBuilder: QueryBuilderService,
        private alertService: AlertService) {

        this.filter.types = this.chartUtils.filterTypes;
        this.ordenationTypes = this.chartUtils.ordenationTypes;
        this.formatDates = this.chartUtils.formatDates;
    }

    ngOnInit(): void {
        this.selectedColumn = this.controller.params.selectedColumn;
        const allowed = [];
        const col = $localize`:@@atributoLabel:Atributo`, from = $localize`:@@table:de la entidad`;
        this.title = `${col} ${this.selectedColumn.display_name.default} ${from} ${this.controller.params.table}`;

        this.carregarValidacions();
        this.verifyRange();
        this.initParentOption();

        const columnType = this.selectedColumn.column_type;

        for (const type of this.filter.types) {
            type.typeof.forEach(columnTypeOf => {
                if (columnTypeOf === columnType) {
                    allowed.push(type);
                }
            });
        }

        if (allowed.length > 0) {
            this.filter.types = allowed;
        }

        this.showFormatDateSection = columnType == 'date';

        if(this.controller.params.currentQuery.find( elemento => elemento.hasOwnProperty('ranges') &&  elemento.ranges.length!==0)) {
            if(this.selectedColumn.hasOwnProperty('ranges') && this.selectedColumn.ranges.length!==0) {
                this.availableRange = true;
            } else {
                this.availableRange = false;
            }
        } else {
            this.availableRange = true;
        }
        
        // Find the initial aggregation value of the selected column
        for(let agg of this.selectedColumn.aggregation_type) {
            if(agg.selected){
                this.aggregationSelected = _.cloneDeep(agg);
            }
        } 
    }



    // Edit mode change methods
    // Input switches to editable mode
    public startEditTitle(): void {
        this.editableTitle = this.selectedColumn.display_name.default;
        this.editingTitle = true;
    }

    // Save changes
    public saveTitle(): void {
        if (this.editableTitle?.trim()) {
            this.updateDisplayName(this.editableTitle.trim());
        }
        this.editingTitle = false;
    }

    // Cancel changes
    public cancelEditTitle(): void {
        this.editingTitle = false;
    }

    // Update the name in the column dialog and current query
    public updateDisplayName(name: string): void {
        const col = $localize`:@@atributoLabel:Atributo`, from = $localize`:@@table:de la entidad`;
        const foundInQuery = this.findColumn(this.selectedColumn, this.controller.params.currentQuery);
        if (foundInQuery) {
            foundInQuery.display_name.default = name;
        }
        this.selectedColumn.display_name.default = name;
        this.title = `${col} ${name} ${from} ${this.controller.params.table}`;
    }

    private carregarValidacions(): void {
        this.carregarFilters();
        this.handleAggregationType();
        this.handleOrdTypes();

        if (this.selectedColumn.column_type === "date") {
            this.handleDataFormatTypes();
            this.addCumulativeSum();
        }

        this.handleInputTypes();
        
    }

    public addFilter(): void {
        const table = this.selectedColumn.table_id;
        const column = this.selectedColumn.column_name;
        const column_type = this.selectedColumn.column_type;
        const type = this.filterSelected.value;
        const selectedRange = this.filter.range;
        const valueListSource = this.selectedColumn.valueListSource;
        const joins = this.selectedColumn.joins;
        const autorelation = this.selectedColumn.autorelation;
        const data = this.dropDownFields;
        const computed_column = this.selectedColumn.computed_column;
        const SQLexpression = this.selectedColumn.SQLexpression;
        const filterBeforeGrouping = this.filterBeforeAfter.filterBeforeGrouping;
        const aggregation_type = this.aggregationSelected ? this.aggregationSelected.value : null;

        const filter = this.columnUtils.setFilter({
            obj: this.filterValue,
            table,
            column,
            column_type,
            type,
            selectedRange,
            valueListSource,
            autorelation,
            joins,
            data,
            computed_column,
            SQLexpression,
            filterBeforeGrouping,
            aggregation_type,
        });

        this.filter.selecteds.push(filter);        
        this.carregarFilters();

        /* Reset filter form */
        this.resetDisplay();
        this.filterSelected = undefined; // no selected filter
        this.filterValue = {}; // no filter
        this.filter.range = null;

        // Control adding only the filter in the Where section
        const addToSortedFilters = { add: true, filter: filter };
        if(filter['filterBeforeGrouping']) this.updateSortedFiltersColumnDialog.emit(addToSortedFilters);        
        this.filterBeforeAfter.filterBeforeGrouping = true;
        this.filterBeforeAfterSelected = this.filterBeforeAfter.elements[0]
    }

    removeFilter(item: any) {

        const addToSortedFilters = { add: false, filter: item };
        this.updateSortedFiltersColumnDialog.emit(addToSortedFilters);

        this.filter.selecteds.find(f => _.startsWith(f.filter_id, item.filter_id)).removed = true;

        this.filter.forDisplay = this.filter.selecteds.filter(f => {
            return _.startsWith(f.filter_table, this.selectedColumn.table_id) &&
                _.startsWith(f.filter_column, this.selectedColumn.column_name) &&
                !f.removed;
        });

    }

    addAggregation(type: any) {
        this.aggregationsTypes.find((ag: any) => ag.value === type.value).selected = true;

        for (let ag of this.aggregationsTypes) {
            if (ag.selected === true && type.value !== ag.value) {
                ag.selected = false;
            }
        }

        // Reload the aggregations for that column and the selected one
        this.selectedColumn.aggregation_type = JSON.parse(JSON.stringify(this.aggregationsTypes));

        // Add the aggregation to Select
        const addAggr = this.findColumn(this.selectedColumn, this.controller.params.currentQuery);

        if (addAggr) {
            addAggr.aggregation_type = JSON.parse(JSON.stringify(this.selectedColumn.aggregation_type));
        }

        // For computed columns with 3 aggregation options (text/date type): change column_type based on aggregation
        if (this.aggregationsTypes.length === 3 && type.value !== 'none') {
            this.selectedColumn.column_type = 'numeric';
            const allowed = [];
            for (const ft of this.chartUtils.filterTypes) {
                ft.typeof.forEach((columnTypeOf: string) => {
                    if (columnTypeOf === 'numeric') allowed.push(ft);
                });
            }
            if (allowed.length > 0) this.filter.types = allowed;
        }

        if (this.aggregationsTypes.length === 3 && type.value === 'none') {
            this.selectedColumn.column_type = 'text';
            const allowed = [];
            for (const ft of this.chartUtils.filterTypes) {
                ft.typeof.forEach((columnTypeOf: string) => {
                    if (columnTypeOf === 'text') allowed.push(ft);
                });
            }
            if (allowed.length > 0) this.filter.types = allowed;
        }
        
        // Set aggregationSelected based on the user's selection
        this.aggregationSelected = _.cloneDeep(type);

        // If there is no aggregation, the selected Where/Having is set to Where
        if(this.aggregationSelected.value==='none') {
            this.whereHavingSwitch({
                label: 'WHERE',
                value: true,
            })
        }
    }


    addOrdenation(ord: any) {

        const select = this.controller.params.currentQuery;

        _.find(this.ordenationTypes, o => o.value === ord.value).selected = true;

        _.forEach(this.ordenationTypes, o => {
            if (o.selected === true && ord.value !== o.value) {
                o.selected = false;
            }
        });

        this.selectedColumn.ordenation_type = ord.value;

        _.find(select, c =>
            this.selectedColumn.column_name === c.column_name &&
            this.selectedColumn.table_id === c.table_id &&
            this.selectedColumn.display_name.default === c.display_name.default
        ).ordenation_type = this.selectedColumn.ordenation_type;
    }

    public addFormatDate(): void {
        const foundFormat = this.formatDates.find(o => o.value === this.formatDate.value);

        if (foundFormat) {
            foundFormat.selected = true;

            if (!this.formatDate.display_name) {
                this.formatDate = foundFormat;
            }
    
            this.formatDates.forEach(o => {
                if (o.selected === true && this.formatDate.value !== o.value) {
                    o.selected = false;
                }
            });

            const selectedColumn = this.selectedColumn;
            const foundColumn = this.findColumn(selectedColumn, this.controller.params.currentQuery);

            if (foundColumn) {
                foundColumn.format = this.formatDate.value;
            }

            if (!this.cumulativeSumAllowed()) {
                this.cumulativeSum = false;
            }
        }
    }

    public addCumulativeSum(): void {
        const newCol = this.findColumn(this.selectedColumn, this.controller.params.currentQuery);
        this.cumulativeSum = newCol?.cumulativeSum;
        this.dateNavEnabled = !!newCol?.dateNav;
        // If the column already has dateNav enabled, restrict the format options
        if (this.dateNavEnabled) {
            this.formatDates = this.chartUtils.formatDates.filter(f => ['year', 'month', 'day'].includes(f.value));
        }
    }

    handleCumulativeSum() {
        const newCol = this.findColumn(this.selectedColumn, this.controller.params.currentQuery);
        newCol.cumulativeSum = this.cumulativeSum;

        /**
        * Force ascending order
        */
        if (!!this.cumulativeSum) {
            this.ordenationTypes = this.ordenationTypes.map(t => {
                let type = t;
                t.selected = t.value === 'Asc'
                return type
            });
            this.addOrdenation({ display_name: "ASC", value: "Asc", selected: true });
        }
    }

    cumulativeSumAllowed() {
        let current = this.formatDates.filter(f => f.selected === true)[0];
        return ['month', 'week', 'day'].includes(current.value);
    }

    handleDateNavEnabled() {
        const newCol = this.findColumn(this.selectedColumn, this.controller.params.currentQuery);
        if (!newCol) return;
        newCol.dateNav = this.dateNavEnabled;
        if (this.dateNavEnabled) {
            this.selectedParent = null;
            // dateNav and downChild are mutually exclusive: if the date column becomes
            // navigable by date, its child must lose the parent link
            delete newCol.downChild;
            // Restrict the format selector to only year/month/day and force 'day' as the default
            this.formatDates = this.chartUtils.formatDates.filter(f => ['year', 'month', 'day'].includes(f.value));
            this.formatDate = this.formatDates.find(f => f.value === 'day');
            this.addFormatDate();
        } else {
            // Restore all format options when dateNav is disabled
            this.formatDates = this.chartUtils.formatDates;
        }
    }

    handleFilterChange(filter: FilterType) {
        if (filter) {
            const handler = this.columnUtils.handleFilterChange(filter);
            this.display.between = handler.between;
            this.display.filterValue = !_.isEqual(this.selectedColumn.column_type, 'date') ? handler.value : false;
            this.display.calendar = _.isEqual(this.selectedColumn.column_type, 'date') ? handler.value : false;
            this.display.switchButton = _.isEqual(filter.value, 'not_null') || _.isEqual(filter.value, 'not_null_nor_empty') || _.isEqual(filter.value, 'null_or_empty');
            this.display.filterButton = filter.value == 'not_null' || filter.value == 'not_null_nor_empty' || filter.value == 'null_or_empty' ? false : true ;
            this.limitSelectionFields = handler.limitFields === 1 ? 1 : 50;
            this.filter.switch = handler.switchBtn;

            if (handler.switchBtn) {
                this.loadDropDrownData();
                this.display.switchButton = true;
            }

            if (!_.isEqual(filter.value, 'between')) {
                this.filterValue = {};
            }
        } else {
            this.resetDisplay();
        }
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

    /** Manages the aggregations of the selected column */
    public handleAggregationType(): void {
        const column = this.selectedColumn;
        const matchingQuery = this.controller.params.currentQuery.find((c: any) =>
            c.table_id === column.table_id &&
            c.column_name === column.column_name &&
            c.display_name.default === column.display_name.default
        );

        if (this.controller.params.panel.content) {
            const tmpAggTypes = [];
            
            const selectedAggregation = matchingQuery
                ? matchingQuery.aggregation_type.find((agg: any) => agg.selected === true)
                : undefined;

            // If the panel has already loaded and there is data in this.select
            if (selectedAggregation) {
                tmpAggTypes.push(...column.aggregation_type);

                if (matchingQuery) {
                    this.aggregationsTypes = JSON.parse(JSON.stringify(matchingQuery.aggregation_type));
                }

                return;
            } else {
                this.aggregationsTypes = JSON.parse(JSON.stringify(this.controller.params.selectedColumn.aggregation_type));
            }
        } else {
            if (!matchingQuery) {
                const tmpAggTypes = column.aggregation_type.map(agg => ({
                    display_name: agg.display_name,
                    value: agg.value,
                    selected: agg.value === 'sum'
                }));

                this.aggregationsTypes = tmpAggTypes;
            } else {
                this.aggregationsTypes = JSON.parse(JSON.stringify(column.aggregation_type));
            }
        }

        if (matchingQuery) {
            matchingQuery.aggregation_type = JSON.parse(JSON.stringify(this.aggregationsTypes));
        }
    }

    public findColumn(column: Column, columns: any[]) {
        const found = columns.find((c: any) => 
            column.table_id === c.table_id &&
            column.column_name === c.column_name &&
            column.display_name.default === c.display_name.default
        );

        return found;
    }

    handleDataFormatTypes() {
        const column = this.selectedColumn;

        let tmpDateFormat = '';
    
        if (this.controller.params.panel.content) {
            const foundColumn = this.findColumn(column, this.controller.params.currentQuery);
            const foundFormat = foundColumn?.format;

            if (foundColumn && foundFormat) {
                this.formatDate = { display_name: '', value: foundFormat, selected: true };
                this.addFormatDate();
                foundColumn.format = foundFormat;
            } else {
                // If the data has not been loaded into this.select yet
                const queryFromServer = this.controller.params.panel.content.query.query.fields;
                const dateFormat = this.findColumn(column, queryFromServer)?.format;
                tmpDateFormat = dateFormat || 'No';

                this.formatDate = { display_name: '', value: tmpDateFormat, selected: true };
                this.addFormatDate();

                const foundColumn = this.findColumn(column, this.controller.params.currentQuery);

                if (foundColumn) {
                    foundColumn.format = tmpDateFormat;
                }
            }
        } else {
            const foundColumn = this.findColumn(column, this.controller.params.currentQuery);            
            tmpDateFormat = foundColumn?.format || 'No';

            this.formatDate = { display_name: '', value: tmpDateFormat, selected: true };
            this.addFormatDate();

            foundColumn.format = tmpDateFormat;
        }
    }

    old_handleOrdTypes(column: Column) {

        let addOrd: Column;

        if (this.controller.params.panel.content) {

            const queryFromServer = this.controller.params.panel.content.query.query.fields;
            const found = this.controller.params.currentQuery.find(c => c.column_name === column.column_name && c.table_id === column.table_id  && c.display_name.default === column.display_name.default)?.ordenation_type;
            if (found) {
                this.ordenationTypes.forEach(o => {
                    o.value !== column.ordenation_type ? o.selected = false : o.selected = true;
                });

                this.controller.params.currentQuery.find(c => c.column_name === column.column_name && c.table_id === column.table_id  && c.display_name.default === column.display_name.default).ordenation_type = column.ordenation_type;
                return;
            }

            if (!column.ordenation_type) {
                column.ordenation_type = 'No';
            }

            let ordenation = queryFromServer.filter(c => c.column_name === column.column_name && c.table_id === column.table_id  && c.display_name.default === column.display_name.default)[0];
            ordenation = ordenation ? ordenation.ordenation_type : column.ordenation_type;
            const d = this.ordenationTypes.find(ag => ag.selected === true && ordenation !== ag.value);
            if (!_.isNil(d)) {
                d.selected = false;
            }
            const ord = this.ordenationTypes.find(o => o.value === ordenation);
            if (!_.isNil(ord)) {
                ord.selected = true;
            }

        } else if (!column.ordenation_type) {

            this.ordenationTypes = [
                { display_name: 'Asc', value: 'Asc', selected: false },
                { display_name: 'Desc', value: 'Desc', selected: false },
                { display_name: 'No', value: 'No', selected: true }
            ];
        } else {
            this.ordenationTypes.forEach(ord => {
                ord.value !== column.ordenation_type ? ord.selected = false : ord.selected = true;
            });
        }

        addOrd = this.controller.params.currentQuery.find(c => c.column_name === column.column_name && c.table_id === column.table_id  && c.display_name.default === column.display_name.default);

        if (addOrd) {
            addOrd.ordenation_type = this.ordenationTypes.filter(ord => ord.selected === true)[0].value;
        }

    }

    public handleOrdTypes(): void {
        const column = this.selectedColumn;

        if (this.controller.params.panel.content) {
            const { currentQuery } = this.controller.params;
            const queryFromServer = this.controller.params.panel.content.query.query.fields;
            
            const foundColumn = currentQuery.find(c =>
                c.column_name === column.column_name &&
                c.table_id === column.table_id &&
                c.display_name.default === column.display_name.default
            );
    
            if (foundColumn) {
                const { ordenation_type } = column;
                this.ordenationTypes.forEach(o => o.selected = o.value === ordenation_type);
                foundColumn.ordenation_type = ordenation_type;
                return;
            }
    
            if (!column.ordenation_type) {
                column.ordenation_type = 'No';
            }

            const ordenation = queryFromServer.find(c =>
                c.column_name === column.column_name &&
                c.table_id === column.table_id &&
                c.display_name.default === column.display_name.default
            )?.ordenation_type || column.ordenation_type;
    
            const selectedOrd = this.ordenationTypes.find(ag => ag.selected);
            if (selectedOrd && selectedOrd.value !== ordenation) {
                selectedOrd.selected = false;
            }
            const ord = this.ordenationTypes.find(o => o.value === ordenation);
            if (ord) {
                ord.selected = true;
            }
        } else {
            const defaultOrd = column.ordenation_type || (column.column_type === 'date' ? 'Asc' : 'No');
            this.ordenationTypes = [
                { display_name: 'Asc', value: 'Asc', selected: defaultOrd === 'Asc' },
                { display_name: 'Desc', value: 'Desc', selected: defaultOrd === 'Desc' },
                { display_name: 'No', value: 'No', selected: defaultOrd === 'No' }
            ];
        }
    
        const addOrd = this.controller.params.currentQuery.find(c =>
            c.column_name === column.column_name &&
            c.table_id === column.table_id &&
            c.display_name.default === column.display_name.default
        );
    
        if (addOrd) {
            const selectedOrder = this.ordenationTypes.find(ord => ord.selected);
            if (selectedOrder) {
                addOrd.ordenation_type = selectedOrder.value;
            }
        }
    }
    

    handleInputTypes() {
        const type = this.selectedColumn.column_type;
        this.inputType = this.columnUtils.handleInputTypes(type);
    }

    carregarFilters() {
        this.controller.params.filters.forEach(filter => {
            this.filter.selecteds.push(filter);
        });
        this.filter.selecteds = _.uniqBy(this.filter.selecteds, (e) => {
            return e.filter_id;
        });
        this.filter.forDisplay = this.filter.selecteds.filter(f => {
            return f.filter_table === this.selectedColumn.table_id &&
                f.filter_column === this.selectedColumn.column_name &&
                !f.removed;
        });
    }

    resetDisplay() {
        this.display.filterButton = true; // add filter button
        this.display.between = false; // between inputs
        this.display.filterValue = false; // value input
        this.display.calendar = false; // calendar input
        this.display.switchButton = true;
        this.filter.switch = false; // options switch
    }

    /** Query for dropdown */
    async loadDropDrownData() {

    this.filterValue.value1 = null;
    this.filterValue.value2 = null;
    this.dropDownFields = [];
    this.loading = true;

    if (!this.filter.switch) {
        this.loading = false;
        return;
    }

    const column = _.cloneDeep(this.selectedColumn);
    column.table_id = column.table_id.split('.')[0];
    column.ordenation_type = 'Asc';

    const params = {
        table: column.table_id,
        dataSource: this.controller.params.inject.dataSource._id,
        dashboard: this.controller.params.inject.dashboard_id,
        panel: this.controller.params.panel._id,
        connectionProperties: this.controller.params.connectionProperties,
        forSelector: true,
        filters: []
    };

    try {
        const res = await firstValueFrom(
            this.dashboardService.executeQuery(
                this.queryBuilder.normalQuery([column], params)
            )
        );

        if (Array.isArray(res) && res.length > 1) {
            for (const item of res[1]) {
                if (item[0] != null && item[0] !== '') {
                    this.dropDownFields.push({
                        label: item[0],
                        value: item[0]
                    });
                }
            }
        }
    } catch (err) {
        this.alertService.addError(err);
        throw err;
    } finally {
        this.loading = false;
    }
}


    getAggName(value: string) {
        return aggTypes.find(agg => agg.value === value)?.label;
    }

    getAggregationText(value: any) {
        const label = aggTypes.filter(agg => {
            return (agg.value === value.aggregation_type);
        })[0].label;
        return label;
    }

    getFilterText(value) {
        if(value.filter_type === 'between') return this.textBetween;
        return value.filter_type;
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
        if (event.dates) {
            const dtf = new Intl.DateTimeFormat('en', { year: 'numeric', month: '2-digit', day: '2-digit' });
            const singleValueOperators = ['=', '!=', '>', '<', '>=', '<='];
            const isSingleDate = singleValueOperators.includes(this.filterSelected?.value);

            const dates = Array.isArray(event.dates) ? event.dates : [event.dates, event.dates];
            if (!dates[1]) dates[1] = dates[0];

            let stringRange = [dates[0], dates[1]]
                .map(date => {
                    let [{ value: mo }, , { value: da }, , { value: ye }] = dtf.formatToParts(date);
                    return `${ye}-${mo}-${da}`
                });

            this.filter.range = event.range;
            this.filterValue.value1 = stringRange[0];
            this.filterValue.value2 = isSingleDate ? null : stringRange[1];
            this.display.filterButton = false;
        }
    }

    public onCancelDuplicateColumn(): void {
        this.display.duplicateColumn = false;
    }

    public duplicateColumn() {
        this.display.duplicateColumn = true;
        this.duplicatedColumnName = this.selectedColumn.display_name.default + ' (Copy)';
    }

    public saveDuplicatedColumn() {
        if (_.isNil(this.duplicatedColumnName) || _.isEmpty(this.duplicatedColumnName)) return;

        this.display.duplicateColumn = false;
        const newColumn = _.cloneDeep(this.selectedColumn);
        newColumn.display_name.default = this.duplicatedColumnName;
        this.onClose(EdaDialogCloseEvent.NEW, { duplicated: true, column: newColumn});
    }

    /* Close methods */
    closeDialog() {
        this.displayWindow = false;
        this.filter.switch = false;
        this.filterSelected = undefined;
        this.filterValue = {};
        this.onClose(EdaDialogCloseEvent.NONE, this.filter.selecteds);
    }

    onClose(event: EdaDialogCloseEvent, response?: any): void {
        return this.controller.close(event, response);
    }

    onApply(){
        this.onParentChange(this.selectedParent);
        this.closeDialog();
    }

    onDuplicate(){
        this.display.duplicateColumn = true;
        this.duplicatedColumnName = this.selectedColumn.display_name.default + ' (Copy)';    
    }


    addRange(rangeString: string) {
        const regexNumber = /^[0-9]/;

        if(regexNumber.test(rangeString[rangeString.length-1])){

            const ranges = rangeString.split(":")
                .map(item => parseFloat(item.replace(",", ".")));

            for (let i = 0; i < ranges.length-1; i++) {
                // Check whether the current number is less than or equal to the previous one
                if (ranges[i] >= ranges[i + 1]) {
                    this.ranges=[];
                    this.alertService.addError('El correcto orden de los límites del rango van de menor a mayor');
                    return;
                }
            }

            this.ranges = ranges
            this.showRange = true;
            this.selectedRange = this.generarStringRango(this.ranges); // extract the selected range
            this.rangeString = '';
            this.allowedAggregations = false;

            // Range selection sets the aggregation to 'none'
            const selectionAggregationRange = { value: 'none', display_name: 'No', selected: 'true' };
            this.addAggregation(selectionAggregationRange);

            // Find the current column and add the range
            const addAggr = this.findColumn(this.selectedColumn, this.controller.params.currentQuery);
            addAggr.column_type = 'text';
            addAggr.ranges = this.ranges;
        }
        else {
            this.alertService.addError('El último caracter del rango debe ser un número');
            return;
        }

    }

    removeRange() {
        this.selectedRange='';
        this.showRange=false;
        this.allowedAggregations = true;
        const addAggr = this.findColumn(this.selectedColumn, this.controller.params.currentQuery);
        addAggr.column_type = 'numeric';
        this.selectedColumn.column_type = 'numeric';
        this.rangeString = this.ranges.join(':');
        addAggr.ranges = [];
    }

    generarStringRango(rango: number[]): string {
        let resultado = "";

        // Add the first condition
        resultado += `< ${rango[0]}<br>`;

        // Create the intermediate conditions
        for (let i = 0; i < rango.length - 1; i++) {
            resultado += `${rango[i]} - ${rango[i + 1] - 1}<br>`;
        }

        // Add the last condition
        resultado += `>= ${rango[rango.length - 1]}`;

        return resultado;
    }

    /** Returns the "table_id.column_name" keys for all descendants of col following downChild. */
    private getDescendantKeys(col: any, currentQuery: any[]): Set<string> {
        const keys = new Set<string>();
        let current = col;
        while (current?.downChild) {
            const key = `${current.downChild.table_id}.${current.downChild.column_name}`;
            if (keys.has(key)) break; // safety check for existing cycles
            keys.add(key);
            current = currentQuery.find(c =>
                c.table_id === current.downChild.table_id &&
                c.column_name === current.downChild.column_name
            );
        }
        return keys;
    }

    private initParentOption(): void {
        const currentQuery: any[] = this.controller.params.currentQuery;

        // All descendants of the current column cannot be its parent (prevents cycles)
        const descendantKeys = this.getDescendantKeys(this.selectedColumn, currentQuery);

        this.childOptions = currentQuery
            .filter(col => {
                if (col.column_type === 'numeric') return false;
                if (col.column_type === 'date' && col.dateNav) return false;
                if (col.table_id === this.selectedColumn.table_id &&
                    col.column_name === this.selectedColumn.column_name) return false;
                // Exclude descendants to avoid circular references
                if (descendantKeys.has(`${col.table_id}.${col.column_name}`)) return false;
                if (col.downChild &&
                    !(col.downChild.table_id === this.selectedColumn.table_id &&
                      col.downChild.column_name === this.selectedColumn.column_name)) return false;
                return true;
            })
            .map(col => ({ label: col.display_name.default, value: col }));

        this.selectedParent = currentQuery.find(col =>
            col.downChild &&
            col.downChild.table_id === this.selectedColumn.table_id &&
            col.downChild.column_name === this.selectedColumn.column_name
        ) || null;
    }

    public onParentChange(parentCol: any): void {
        const currentQuery: any[] = this.controller.params.currentQuery;

        // Remove any existing parent link pointing to selectedColumn, track former parent
        let formerParentInQuery: any = null;
        for (const col of currentQuery) {
            if (col.downChild &&
                col.downChild.table_id === this.selectedColumn.table_id &&
                col.downChild.column_name === this.selectedColumn.column_name) {
                delete col.downChild;
                formerParentInQuery = col;
                break;
            }
        }

        if (parentCol) {
            const parentInQuery = this.findColumn(parentCol, currentQuery);
            if (parentInQuery) {
                parentInQuery.downChild = {
                    table_id: this.selectedColumn.table_id,
                    column_name: this.selectedColumn.column_name,
                    display_name: this.selectedColumn.display_name.default
                };
            }
        } else if (formerParentInQuery) {
            // This column had a parent and now has none - behavior depends on chart type.
            const chartSubType: string = this.controller.params.chartSubType || '';
            const isCrossTable = chartSubType === 'crosstable';

            if (isCrossTable) {
                // In cross table: keep child in currentQuery but force both parent and child
                // to itemX (vertical axis) so the child doesn't land in itemY and cause OOM pivots.
                formerParentInQuery._forceItemX = true;
                const childInQuery = currentQuery.find(
                    (c: any) => c.table_id === this.selectedColumn.table_id &&
                                c.column_name === this.selectedColumn.column_name
                );
                if (childInQuery) childInQuery._forceItemX = true;
            } else {
                // Non-cross-table: remove child and its entire downChild chain.
                const keysToRemove = new Set<string>();
                keysToRemove.add(`${this.selectedColumn.table_id}.${this.selectedColumn.column_name}`);
                this.getDescendantKeys(this.selectedColumn, currentQuery).forEach(k => keysToRemove.add(k));
                this.controller.params.currentQuery = currentQuery.filter(
                    (col: any) => !keysToRemove.has(`${col.table_id}.${col.column_name}`)
                );
            }
        }
        // else: column was never a nav-child (no formerParentInQuery) - do nothing
    }

    verifyRange() {

        if(this.selectedColumn.ranges !== undefined){

            if(this.selectedColumn.ranges.length !==0){
                this.allowedAggregations = false;
                this.showRange = true;
                this.ranges = this.selectedColumn.ranges;
                this.selectedRange = this.generarStringRango(this.ranges);
            }
        }
    }

    validateInput(event: Event): void {
        const inputElement = event.target as HTMLInputElement;
        const validCharacters = /[1234567890.,:-]*/g;
        inputElement.value = inputElement.value.match(validCharacters)?.join('') || '';
        // If the input starts with (. , :), the range button is not enabled and the sign is not added to the input. It must start with a number or with a sign (-) followed by a number for negatives.
        if(inputElement.value=== '.' || inputElement.value===',' || inputElement.value===':') inputElement.value = '';
        this.rangeString = inputElement.value; // ngModel is updated
    }

}
