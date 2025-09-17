import { Component, EventEmitter, Output, ViewChild } from '@angular/core';
import { SelectItem } from 'primeng/api';
import { EdaDialog, EdaDialogCloseEvent, EdaDialogAbstract, EdaDatePickerComponent } from '@eda/shared/components/shared-components.index';
import {
    DashboardService,
    FilterType,
    ChartUtilsService,
    AlertService,
    OrdenationType,
    ColumnUtilsService, FormatDates, QueryBuilderService
} from '@eda/services/service.index';
import { Column, Query } from '@eda/models/model.index';
import * as _ from 'lodash';

import { aggTypes } from 'app/config/aggretation-types';


@Component({
    selector: 'app-column-dialog',
    templateUrl: './column-dialog.component.html',
    styleUrls: ['./column-dialog.component.css']
})

export class ColumnDialogComponent extends EdaDialogAbstract {

    @ViewChild('myCalendar', { static: false }) datePicker: EdaDatePickerComponent;
    @Output() updateSortedFiltersColumnDialog: EventEmitter<any> = new EventEmitter<any>();

    public dialog: EdaDialog;
    public selectedColumn: Column;
    public duplicatedColumnName: string;

    public display = {
        calendar: false, // calendars inputs
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

    public ordenationTypes: OrdenationType[];
    public formatDates: FormatDates[];
    public formatDate: FormatDates;
    public aggregationsTypes: any[] = [];
    public aggregationSelected: any;
    public inputType: string;
    public dropDownFields: SelectItem[] = [];
    public limitSelectionFields: number;
    public cumulativeSum: boolean;
    public cumulativeSumTooltip: string = $localize`:@@cumulativeSumTooltip:Si activas ésta función se calculará la suma acumulativa 
                                            para los campos numéricos que eligas. Sólo se puede activar si la fecha está agregada por mes, semana o dia.`

    public filterBeforeAfter = {    
        filterBeforeGrouping: true, // valor por defecto true ==> WHERE / valor false ==> HAVING
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


    public ranges: number[] = [];
    public rangeString: string;
    public selectedRange: string = '';
    public showRange: boolean = false;
    public availableRange: boolean = true;
    public allowedAggregations: boolean = true;
    public ptooltipViewTextRanges: string = $localize`:@@ptooltipViewTextRanges:Al configurar un Rango las agregaciones quedarán bloqueadas, Ejemplo de un rango válido - 12:18:50:100 `;
    public ptooltipNotAvailableRanges: string = $localize`:@@ptooltipNotAvailableRanges:No es posible crear un rango nuevo por que ya existe uno configurado`;
    public rangeDescriptionNumberError: string = $localize`:@@rangeDescriptionNumberError:El correcto orden de los límites del rango van de menor a mayor`;
    public rangeDescriptionCharacterError: string = $localize`:@@rangeDescriptionCharacterError:El último caracter del rango debe ser un número`;


    constructor(
        private dashboardService: DashboardService,
        private chartUtils: ChartUtilsService,
        private columnUtils: ColumnUtilsService,
        private queryBuilder: QueryBuilderService,
        private alertService: AlertService) {
        super();

        this.filter.types = this.chartUtils.filterTypes;
        this.ordenationTypes = this.chartUtils.ordenationTypes;
        this.formatDates = this.chartUtils.formatDates;

        this.dialog = new EdaDialog({
            show: () => this.onShow(),
            hide: () => this.onClose(EdaDialogCloseEvent.NONE),
            title: $localize`:@@col:Atributo`
        });
        this.dialog.style = { width: '85%', height: '75%', top: "-4em", left: '1em' };

        // Inicializando el valor del WHERE / HAVING
        this.filterBeforeAfterSelected = this.filterBeforeAfter.elements[0]
    }

    onShow(): void {
        this.selectedColumn = this.controller.params.selectedColumn;
        const allowed = [];
        const title = this.selectedColumn.display_name.default;
        const col = $localize`:@@col:Atributo`, from = $localize`:@@table:de la entidad`;
        this.dialog.title = `${col} ${title} ${from} ${this.controller.params.table}`;
        
        this.carregarValidacions();
        this.verifyRange();

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

        // Buscando el valor inicial de agregacion de la columna seleccionada
        for(let agg of this.selectedColumn.aggregation_type) {
            if(agg.selected){
                this.aggregationSelected = _.cloneDeep(agg);
            }
        }        
        if(this.controller.params.currentQuery.find( elemento => elemento.hasOwnProperty('ranges') &&  elemento.ranges.length!==0)) {
            if(this.selectedColumn.hasOwnProperty('ranges') && this.selectedColumn.ranges.length!==0) {
                this.availableRange = true;
            } else {
                this.availableRange = false;
            }
        } else {
            this.availableRange = true;
        }

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
            filterBeforeGrouping,
            aggregation_type,
        });

        this.filter.selecteds.push(filter);        
        this.carregarFilters();

        /* Reset Filter Form */
        this.resetDisplay();
        this.filterSelected = undefined; // filtre seleccionat cap
        this.filterValue = {}; // filtre ningun
        this.filter.range = null;

        // Regresando al valor inicial el WHERE / HAVING
        this.filterBeforeAfter.filterBeforeGrouping = true;
        this.filterBeforeAfterSelected = this.filterBeforeAfter.elements[0]

        const addToSortedFilters = {
            add: true,
            filter: filter
        };
        
        this.updateSortedFiltersColumnDialog.emit(addToSortedFilters); // Emitting an event to the eda-blank-panel component

    }

    removeFilter(item: any) {

        const addToSortedFilters = {
            add: false,
            filter: item
        };

        this.updateSortedFiltersColumnDialog.emit(addToSortedFilters); // Emitting an event to the eda-blank-panel component

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

        // Recarguem les agregacions d'aquella columna + la seleccionada
        this.selectedColumn.aggregation_type = JSON.parse(JSON.stringify(this.aggregationsTypes));

        // Introduim l'agregació a la Select
        const addAggr = this.findColumn(this.selectedColumn, this.controller.params.currentQuery);

        if (addAggr) {
            addAggr.aggregation_type = JSON.parse(JSON.stringify(this.selectedColumn.aggregation_type));
        }

        // Seteo de aggregationSelected dependiendo de la selección realizada por el usuario
        this.aggregationSelected = _.cloneDeep(type);

        // En caso no tengamos agregación el selected Where/Having se establece en Where
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


    handleFilterChange(filter: FilterType) {
        if (filter) {
            const handler = this.columnUtils.handleFilterChange(filter);
            this.display.between = handler.between;
            this.display.filterValue = !_.isEqual(this.selectedColumn.column_type, 'date') ? handler.value : false;
            this.display.calendar = _.isEqual(this.selectedColumn.column_type, 'date') ? handler.value : false;
            this.display.switchButton = _.isEqual(filter.value, 'not_null') || _.isEqual(filter.value, 'not_null_nor_empty') || _.isEqual(filter.value, 'null_or_empty'); // se usa para deshabilitar el boton que da las opciones en el selector.
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

    /**Gestiona las agregaciones de la columna seleccionada */
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

            // Si ja s'ha carregat el panell i tenim dades a this.select
            if (selectedAggregation) {
                
                tmpAggTypes.push(...column.aggregation_type);
                
                if (matchingQuery) {
                    this.aggregationsTypes = JSON.parse(JSON.stringify(matchingQuery.aggregation_type));
                }

                return;
            } else{
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
                // Si encara no hem carregat les dades a this.select
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
            this.ordenationTypes = [
                { display_name: 'Asc', value: 'Asc', selected: false },
                { display_name: 'Desc', value: 'Desc', selected: false },
                { display_name: 'No', value: 'No', selected: true }
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
        this.display.filterButton = true; // btn add filter
        this.display.between = false; // inputs between
        this.display.filterValue = false; // input de valor
        this.display.calendar = false; // input calendar
        this.display.switchButton = true;
        this.filter.switch = false; // options switch
    }

    /** Query per dropdown  */
    async loadDropDrownData() {
        this.filterValue.value1 = null;
        this.filterValue.value2 = null;
        if (this.filter.switch) {
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

    getAggName(value: string) {
        return aggTypes.filter(agg => agg.value === value)[0].label;
    }

    getAggregationText(value: any) {
        if(!value.aggregation_type){
            return 'none'; // if there isn`t aggregation, none is added
        } else {
            const label = aggTypes.filter(agg => {
                return (agg.value === value.aggregation_type);
            })[0].label;
            return label;
        }
    }

    getFilterText(value) {
        if(value.filter_type === 'between') return this.textBetween;
        return value.filter_type;
    }

    processPickerEvent(event) {
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

    /* Close functions */
    closeDialog() {
        this.filter.switch = false;
        this.filterSelected = undefined;
        this.filterValue = {};
        this.onClose(EdaDialogCloseEvent.NONE, this.filter.selecteds);
    }

    onClose(event: EdaDialogCloseEvent, response?: any): void {
        return this.controller.close(event, response);
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

    addRange(rangeString: string) {

        const regexNumber = /^[0-9]/;

        if(regexNumber.test(rangeString[rangeString.length-1])){

            const ranges = rangeString.split(":")
            .map(item => parseFloat(item.replace(",", ".")));

            for (let i = 0; i < ranges.length-1; i++) {
                // Verificar si el número actual es menor o igual al anterior
                if (ranges[i] >= ranges[i + 1]) {
                    this.ranges=[];
                    this.alertService.addError('El correcto orden de los límites del rango van de menor a mayor');
                    return;
                }
            }

            this.ranges = ranges
            this.showRange = true;
            this.selectedRange = this.generarStringRango(this.ranges); // extraemos el rango seleccionado
            this.rangeString = '';
            this.allowedAggregations = false;

            // Selección de Rango, genera que la agregación sea 'none'
            const selectionAggregationRange = { value: 'none', display_name: 'No', selected: 'true' };
            this.addAggregation(selectionAggregationRange);

            // Encuentra la columna de turno y agrega el rango 
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
    
        // Agregamos la primera condición
        resultado += `< ${rango[0]}<br>`;
        
        // Creamos las condiciones intermedias
        for (let i = 0; i < rango.length - 1; i++) {
            resultado += `${rango[i]} - ${rango[i + 1] - 1}<br>`;
        }
        
        // Agregamos la última condición
        resultado += `>= ${rango[rango.length - 1]}`;
        
        return resultado;
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
        // Si el input inicia con (. , :) no se habilitara el botón del rango ni se agregará el signo en el input. Se debe empezar con un número o con un signo (-) y un número para los negativos.
        if(inputElement.value=== '.' || inputElement.value===',' || inputElement.value===':') inputElement.value = '';
        this.rangeString = inputElement.value; // Se actualiza ngModel
    }

}
