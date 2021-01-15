import { Component } from '@angular/core';
import { SelectItem } from 'primeng/api';
import { EdaDialog, EdaDialogCloseEvent, EdaDialogAbstract } from '@eda/shared/components/shared-components.index';
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
    styleUrls: []
})

export class ColumnDialogComponent extends EdaDialogAbstract {
    public dialog: EdaDialog;
    public selectedColumn: Column;

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
    public formatDates: FormatDates[];
    public aggregationsTypes: any[] = [];
    public inputType: string;
    public dropDownFields: SelectItem[];
    public limitSelectionFields: number;

    constructor(private dashboardService: DashboardService,
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
            title: ''
        });
    }

    onShow(): void {
        this.selectedColumn = this.controller.params.selectedColumn;
        const allowed = [];
        const title = this.selectedColumn.display_name.default;
        const col = $localize`:@@col:Columna`, from = $localize`:@@table:de la tabla`;
        this.dialog.title = `${col} ${title} ${from} ${this.controller.params.table}`;

        this.carregarValidacions();
        
        for (let i = 0, n = this.filter.types.length; i < n; i += 1) {
            if (this.selectedColumn.column_type === 'text') {
                this.filter.types[i].typeof.map(type => {
                    if (type === 'text') {
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
        if(this.selectedColumn.column_type === "date"){
            this.handleDataFormatTypes(this.selectedColumn);
        }
        this.handleInputTypes();
    }

    addFilter() {
        const table = this.selectedColumn.table_id;
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
        this.filter.selecteds.find(f => _.startsWith(f.filter_id, item.filter_id)).removed = true;

        this.filter.forDisplay = this.filter.selecteds.filter(f => {
            return _.startsWith(f.filter_table, this.selectedColumn.table_id) &&
                _.startsWith(f.filter_column, this.selectedColumn.column_name) &&
                !f.removed;
        });
        
    }

    addAggregation(type) {
        _.find(this.aggregationsTypes, ag => ag.value === type.value).selected = true;

        _.forEach(this.aggregationsTypes, ag => {
            if (ag.selected === true && type.value !== ag.value) {
                ag.selected = false;
            }
        });

        // Recarguem les agregacions d'aquella columna + la seleccionada
        this.selectedColumn.aggregation_type = JSON.parse(JSON.stringify(this.aggregationsTypes));

        // Introduim l'agregació a la Select
        const addAggr: Column = this.controller.params.currentQuery.find(c => {
            return this.selectedColumn.column_name === c.column_name &&
                this.selectedColumn.table_id === c.table_id;
        });

        addAggr.aggregation_type = JSON.parse(JSON.stringify(this.selectedColumn.aggregation_type));
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
            this.selectedColumn.table_id === c.table_id
        ).ordenation_type = this.selectedColumn.ordenation_type;
    }

    addFormatDate(format: FormatDates) {
        const select = this.controller.params.currentQuery;

        _.find(this.formatDates, o => o.value === format.value).selected = true;

        _.forEach(this.formatDates, o => {
            if (o.selected === true && format.value !== o.value) {
                o.selected = false;
            }
        });

        _.find(select, c =>
            this.selectedColumn.column_name === c.column_name &&
            this.selectedColumn.table_id === c.table_id
        ).format = format.value;

        // Introduim l'agregació a la Select
        const column: Column = this.controller.params.currentQuery.find(c => {
            return this.selectedColumn.column_name === c.column_name &&
                this.selectedColumn.table_id === c.table_id;
        });
        column.format = format.value; 
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

    handleAggregationType(column: Column) {
        if (this.controller.params.panel.content) {
            const tmpAggTypes = [];
            const found = this.controller.params.currentQuery
                .find(c => c.column_name === column.column_name)
                .aggregation_type.find(agg => agg.selected === true);

            // Si ja s'ha carregat el panell i tenim dades a this.select
            if (found) {
                column.aggregation_type.forEach(agg => {
                    tmpAggTypes.push(agg);
                });
                this.aggregationsTypes = tmpAggTypes;
                this.controller.params.currentQuery.find(c => {
                    return column.column_name === c.column_name && column.table_id === c.table_id;
                }).aggregation_type = JSON.parse(JSON.stringify(this.aggregationsTypes));
                return;
            }
        } else {
            const found = this.controller.params.currentQuery.find(c => c.column_name === column.column_name);
            if (!found) {
                const tmpAggTypes = [];
                column.aggregation_type.forEach((agg, index) => {
                    tmpAggTypes.push({ display_name: agg.display_name, value: agg.value, selected: agg.value === 'none' });
                });
                this.aggregationsTypes = tmpAggTypes;
            } else {
                this.aggregationsTypes = JSON.parse(JSON.stringify(column.aggregation_type));
            }
        }
        this.controller.params.currentQuery.find(c => {
            return column.column_name === c.column_name && column.table_id === c.table_id;
        }).aggregation_type = JSON.parse(JSON.stringify(this.aggregationsTypes));
    }

    handleDataFormatTypes(column: Column) {
        let tmpDateFormat = '';
        if (this.controller.params.panel.content) {
            const found = this.controller.params.currentQuery
                .find(c => c.column_name === column.column_name)
                .format;
            if (found) {
                this.addFormatDate({ display_name: '', value: found, selected: true });
                this.controller.params.currentQuery.find(c => {
                    return column.column_name === c.column_name && column.table_id === c.table_id;
                }).format = found;
                return;
            } else {
                // Si encara no hem carregat les dades a this.select
                const queryFromServer = this.controller.params.panel.content.query.query.fields;
                let dateFormat = queryFromServer.filter(c => c.column_name === column.column_name && c.table_id === column.table_id)[0];
                if (dateFormat && dateFormat.format) {
                    tmpDateFormat = dateFormat.format;
                } else {
                    tmpDateFormat = 'No';
                }
                this.addFormatDate({ display_name: '', value: tmpDateFormat, selected: true })
                this.controller.params.currentQuery.find(c => {
                    return column.column_name === c.column_name && column.table_id === c.table_id;
                }).format = tmpDateFormat;
                return;
            }
        } else {
            const found = this.controller.params.currentQuery.find(c => c.column_name === column.column_name);
            let tmpDateFormat = '';
            if (!found || !found.format) {
                tmpDateFormat = 'No';
                this.addFormatDate({ display_name: '', value: 'No', selected: true });
            } else {
                tmpDateFormat = found.format;
                this.addFormatDate({ display_name: '', value: tmpDateFormat, selected: true });
            }
            this.controller.params.currentQuery.find(c => {
                return column.column_name === c.column_name && column.table_id === c.table_id;
            }).format = tmpDateFormat;

        }
    }

    handleOrdTypes(column: Column) {

        let addOrd: Column;

        if (this.controller.params.panel.content) {

            const queryFromServer = this.controller.params.panel.content.query.query.fields;
            const found = this.controller.params.currentQuery.find(c => c.column_name === column.column_name).ordenation_type;
            if (found) {
                this.ordenationTypes.forEach(o => {
                    o.value !== column.ordenation_type ? o.selected = false : o.selected = true;
                });

                this.controller.params.currentQuery.find(c => column.column_name === c.column_name && column.table_id === c.table_id).ordenation_type = column.ordenation_type ;
                //addOrd.ordenation_type = column.ordenation_type;
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

        addOrd = this.controller.params.currentQuery.find(c => column.column_name === c.column_name && column.table_id === c.table_id);
        addOrd.ordenation_type = this.ordenationTypes.filter(ord => ord.selected === true)[0].value;

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
    loadDropDrownData() {
        this.filterValue.value1 = null;
        this.filterValue.value2 = null;
        if (this.filter.switch) {
            const params = {
                table: this.selectedColumn.table_id,
                dataSource: this.controller.params.inject.dataSource._id,
                dashboard: this.controller.params.inject.dashboard_id,
                panel: this.controller.params.panel._id,
                filters: []
            };
            this.dashboardService.executeQuery(this.queryBuilder.normalQuery([this.selectedColumn], params)).subscribe(
                res => this.dropDownFields = res[1].map(item => ({ label: item[0], value: item[0] })),
                err => this.alertService.addError(err)
            );
        }
    }

    getAggName(value:string){
        return aggTypes.filter(agg => agg.value === value)[0].label;
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
