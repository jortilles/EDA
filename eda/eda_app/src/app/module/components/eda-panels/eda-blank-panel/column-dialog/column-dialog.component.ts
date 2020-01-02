import { Component } from '@angular/core';
import { SelectItem } from 'primeng/api';
import { EdaDialog, EdaDialogCloseEvent, EdaDialogAbstract } from '@eda_shared/components/shared-components.index';
import {
    DashboardService,
    FilterType,
    ChartUtilsService,
    AlertService,
    OrdenationType,
    ColumnUtilsService
} from '@eda_services/service.index';
import { Column, Query } from '@eda_models/model.index';
import * as _ from 'lodash';

@Component({
    selector: 'app-column-dialog',
    templateUrl: './column-dialog.component.html',
    styleUrls: []
})

export class ColumnDialogComponent extends EdaDialogAbstract {
    public dialog: EdaDialog;
    public selectedColumn: any;

    public display = {
        calendar: false, // calendars inputs
        between: false, // between inputs
        filterValue: false,
        filterButton: true,
        switchButton: true
    };
    public filter = {
        switch: false,
        types: [],
        forDisplay: [],
        selecteds: []
    };
    public filterSelected: FilterType;
    public filterValue: any = {};

    public ordenationTypes: OrdenationType[];
    public aggregationsTypes: any[] = [];
    public inputType: string;
    public dropDownFields: SelectItem[];
    public limitSelectionFields: number;

    constructor( private dashboardService: DashboardService,
                 private chartUtils: ChartUtilsService,
                 private columnUtils: ColumnUtilsService,
                 private alertService: AlertService) {
        super();

        this.filter.types = this.chartUtils.filterTypes;
        this.ordenationTypes = this.chartUtils.ordenationTypes;

        this.dialog = new EdaDialog({
            show: () => this.onShow(),
            hide: () => this.onClose(EdaDialogCloseEvent.NONE),
            title: ''
        });
    }

    onShow(): void {
        this.selectedColumn = this.controller.params.selectedColumn;

        const allowed = [];
        const title = this.selectedColumn.display_name.default;
        this.dialog.title = `Columna ${title} de la tabla ${this.controller.params.table}`;


        this.carregarValidacions();

        for (let i = 0, n = this.filter.types.length; i < n; i += 1) {
            if (this.selectedColumn.column_type === 'varchar') {
                this.filter.types[i].typeof.map(type => {
                    if (type === 'varchar') {
                        allowed.push(this.filter.types[i]);
                    }
                });
            } else if (this.selectedColumn.column_type === 'numeric') {
                this.filter.types[i].typeof.map(type => {
                    if (type === 'numeric') {
                        allowed.push(this.filter.types[i]);
                    }
                });
            } else if (this.selectedColumn.column_type === 'date') {
                this.filter.types[i].typeof.map(type => {
                    if (type === 'date') {
                        allowed.push(this.filter.types[i]);
                    }
                });
            }
        }

        if (!_.isEmpty(allowed)) {
            this.filter.types = allowed;
        }
    }

    carregarValidacions() {
        this.carregarFilters();
        this.handleAggregationType(this.selectedColumn);
        this.handleOrdTypes(this.selectedColumn);
        this.handleInputTypes();
    }

    addFilter() {
        const table =  this.selectedColumn.table_id;
        const column = this.selectedColumn.column_name;
        const type = this.filterSelected.value;

        this.filter.selecteds.push(
            this.columnUtils.addFilter(this.filterValue, table, column, type)
        );

        this.carregarFilters();

        /* Reset Filter Form */
        this.resetDisplay();
        this.filterSelected = undefined; // filtre seleccionat cap
        this.filterValue = {}; // filtre ningun
    }

    removeFilter(item: any) {
        this.filter.selecteds.find(f => _.startsWith(f.filter_id, item.filter_id) ).removed = true;

        this.filter.forDisplay = this.filter.selecteds.filter(f => {
            return _.startsWith(f.filter_table, this.selectedColumn.table_id) &&
                _.startsWith(f.filter_column, this.selectedColumn.column_name) &&
                !f.removed;
        });
    }

    addAggregation(type) {
        // Posem l'agregacció a la columna
        const s = this.aggregationsTypes.find(ag => ag.value === type.value);
        if (!_.isNil(s)) {
            s.selected = true;
        }

        // Aqui busquem si aquella columna ja tenia una agregació, si te agregació la treiem
        const d = this.aggregationsTypes.find(ag => ag.selected === true && s.value !== ag.value);
        if (!_.isNil(d)) {
            d.selected = false;
        }

        // Recarguem les agregacions d'aquella columna + la seleccionada
        this.selectedColumn.aggregation_type = JSON.parse(JSON.stringify(this.aggregationsTypes));

        // Introduim l'agregació a la Select
        const addAggr: Column = this.controller.params.select.find(c => {
            return this.selectedColumn.column_name === c.column_name &&
                this.selectedColumn.table_id === c.table_id;
        });

        addAggr.aggregation_type = JSON.parse(JSON.stringify(this.selectedColumn.aggregation_type));
        this.controller.params.select.find(c => {
            return this.selectedColumn.column_name === c.column_name &&
                this.selectedColumn.table_id === c.table_id;
        }).aggregation_type = JSON.parse(JSON.stringify(this.selectedColumn.aggregation_type));
    }

    addOrdenation(ord: any) {
        const s = this.ordenationTypes.find(o => o.value === ord.value);
        if (!_.isNil(s)) {
            s.selected = true;
        }

        const d = this.ordenationTypes.find(o => o.selected === true && s.value !== o.value);
        if (!_.isNil(d)) {
            d.selected = false;
        }

        this.selectedColumn.ordenation_type = ord.value;
        console.log(this.controller.params);
        const addOrd: Column = this.controller.params.select.find(c => {
            return this.selectedColumn.column_name === c.column_name &&
                this.selectedColumn.table_id === c.table_id;
        });
        addOrd.ordenation_type = this.selectedColumn.ordenation_type;

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

    handleAggregationType(column: Column) {
        if (this.controller.params.inject.panel.content) {
            const tmpAggTypes = [];
            const found = this.controller.params.select
                .find(c => c.column_name === column.column_name)
                .aggregation_type.find(agg => agg.selected === true);

            // Si ja s'ha carregat el panell i tenim dades a this.select
            if (found) {
                column.aggregation_type.forEach(agg => {
                    tmpAggTypes.push(agg);
                });
                this.aggregationsTypes = tmpAggTypes;
                this.controller.params.select.find(c => {
                    return column.column_name === c.column_name && column.table_id === c.table_id;
                }).aggregation_type = JSON.parse(JSON.stringify(this.aggregationsTypes));
                return;
            }
            // Si encara no hem carregat les dades a this.select
            const queryFromServer = this.controller.params.inject.panel.content.query.query.fields;
            let aggregation = queryFromServer.filter(c => c.column_name === column.column_name && c.table_id === column.table_id)[0];
            if (aggregation) {
                aggregation = aggregation.aggregation_type;
                column.aggregation_type.forEach((agg, index) => {
                    tmpAggTypes.push(agg.value === aggregation ? { display_name: agg.display_name, value: agg.value, selected: true }
                        : { display_name: agg.display_name, value: agg.value, selected: false });
                });

                // Si tenim panell però hem de carregar les dades d'una columna nova que no era a la consulta original
            } else {
                column.aggregation_type.forEach((agg, index) => {
                    tmpAggTypes.push({ display_name: agg.display_name, value: agg.value, selected: agg.value === 'none'});
                });
            }
            this.aggregationsTypes = tmpAggTypes;
            this.controller.params.select.find(c => {
                return column.column_name === c.column_name && column.table_id === c.table_id;
            }).aggregation_type = JSON.parse(JSON.stringify(this.aggregationsTypes));
            return;
            // Si no hi ha dades a la consulta
        } else {
            const found = this.controller.params.select.find(c => c.column_name === column.column_name);
            if (!found) {
                const tmpAggTypes = [];
                column.aggregation_type.forEach((agg, index) => {
                    tmpAggTypes.push({ display_name: agg.display_name, value: agg.value, selected: agg.value === 'none'});
                });
                this.aggregationsTypes = tmpAggTypes;
            } else {
                this.aggregationsTypes = JSON.parse(JSON.stringify(column.aggregation_type));
            }
        }
        this.controller.params.select.find(c => {
            return column.column_name === c.column_name && column.table_id === c.table_id;
        }).aggregation_type = JSON.parse(JSON.stringify(this.aggregationsTypes));
    }

    handleOrdTypes(column: Column) {
        let addOrd: Column;

        if (this.controller.params.inject.panel.content) {

            const queryFromServer = this.controller.params.inject.panel.content.query.query.fields;
            const found = this.controller.params.select.find(c => c.column_name === column.column_name).ordenation_type;
            if (found) {
                this.ordenationTypes.forEach(o => {
                    o.value !== column.ordenation_type ? o.selected = false : o.selected = true;
                });

                addOrd = this.controller.params.select.find(c => column.column_name === c.column_name && column.table_id === c.table_id);
                addOrd.ordenation_type = column.ordenation_type;
                return;
            }

            if (!column.ordenation_type) {
                column.ordenation_type = 'No';
            }

            let ordenation = queryFromServer.filter(c => c.column_name === column.column_name && c.table_id === column.table_id)[0];
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

        addOrd = this.controller.params.select.find(c => column.column_name === c.column_name && column.table_id === c.table_id);
        addOrd.ordenation_type = this.ordenationTypes.filter(ord => ord.selected === true)[0].value;

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

    /** Query per dropdown  */
    buildDropDownQuery(column: Column) {
        const labels = [];
        const queryColumns = [];
        const col: any = {};
        col.table_id = column.table_id;
        col.column_name = column.column_name;
        col.display_name = column.display_name.default;
        col.column_type = column.column_type;
        col.aggregation_type = column.aggregation_type.filter(ag => ag.selected === true);
        col.aggregation_type = col.aggregation_type[0] ? col.aggregation_type[0].value : 'none';
        col.ordenation_type = column.ordenation_type;
        col.order = 0;
        col.column_granted_roles = column.column_granted_roles;
        col.row_granted_roles = column.row_granted_roles;

        queryColumns.push(col);


        const body: Query = {
            id: '1',
            model_id: this.controller.params.inject.data_source._id,
            user: {
                user_id: localStorage.getItem('id'),
                user_roles: ['USER_ROLE']
            },
            dashboard: {
                dashboard_id: this.controller.params.inject.dashboard_id,
                panel_id: this.controller.params.inject.panel.id,
            },
            query: {
                fields: queryColumns,
                filters : [],
                simple : true
            },
            output: {
                labels,
                data: []
            }
        };
        return body;
    }

    loadDropDrownData() {
        this.filterValue.value1 = null;
        this.filterValue.value2 = null;
        if (this.filter.switch) {
            this.dashboardService.executeQuery(this.buildDropDownQuery(this.selectedColumn)).subscribe(
                res => this.dropDownFields = res[1].map(item => ({label : item[0], value: item[0]}) ),
                err => this.alertService.addError(err)
            );
        }
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
}
