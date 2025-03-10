import { LinkedDashboardProps } from '@eda/components/eda-panels/eda-blank-panel/link-dashboards/link-dashboard-props';
import { Observable } from 'rxjs';
import { EdaColumn } from './eda-columns/eda-column';
import { EdaColumnText } from './eda-columns/eda-column-text';
import { AlertService } from '@eda/services/service.index';
import { EdaContextMenu } from '@eda/shared/components/eda-context-menu/eda-context-menu';
import { EdaTableHeaderGroup } from './eda-table-header-group';
import * as _ from 'lodash';
import { Column } from '@eda/models/model.index';
import { EdaColumnNumber } from './eda-columns/eda-column-number';
import { EdaColumnPercentage } from './eda-columns/eda-column-percentage';
import { Output, EventEmitter, Component } from '@angular/core';
import { EdaColumnChart } from './eda-columns/eda-column-chart';
import { ToastModule } from 'primeng/toast';
import { Key } from 'protractor';
import { FindValueSubscriber } from 'rxjs/internal/operators/find';
import { values } from 'd3';
import { title } from 'process';

interface PivotTableSerieParams {
  mainCol: any, // Main dynamic column
  mainColLabel: string, // Main column name
  mainColValues: Array<string>, // Main column values
  aggregatedColLabels: Array<string>, // Numeric values ----------> Z axis
  pivotColsLabels: Array<string>, // Pivot column names ----------> Y axis
  pivotCols: Array<Column>, // Dynamic pivot columns
  oldRows: Array<any>, // Base table values
  newCols: Array<any> // Array of column groups from main section
}

interface CrossTableSerieParams {
  mainColsLabels: Array<string>, // NEW ----------> X axis
  mainCols: Array<Column>, // NEW

  pivotColsLabels: Array<string>, // Pivot column names ----------> Y axis
  pivotCols: Array<Column>, // Dynamic pivot columns

  aggregatedColLabels: Array<string>, // Numeric values ----------> Z axis

  oldRows: Array<any>, // Base table values
  newCols: Array<any> // Array of column groups from main section
}


export class EdaTable {

    public onNotify: EventEmitter<any> = new EventEmitter();
    public onSortPivotEvent: EventEmitter<any> = new EventEmitter();
    public onSortColEvent: EventEmitter<any> = new EventEmitter();

    public _value: any[] = [];

    public cols: EdaColumn[] = [];
    public rows: number = 10;
    public initRows: number = 10;
    public search: boolean = false;
    public loading: boolean = false;
    public alertService: AlertService;
    public filteredValue: any[] | undefined;
    public headerGroup: EdaTableHeaderGroup[] = [];
    linkedDashboardProps: LinkedDashboardProps;

    //Input switch
    public oldvalue: any[] = [];
    public oldcols: EdaColumn[] = [];
    public pivot: boolean = false;

    public contextMenu: EdaContextMenu = new EdaContextMenu({});
    public contextMenuRow: any;

    private lastFunctLoad: Observable<any>;

    public series: Array<any>;
    public partialTotalsRow: Array<any> = [];
    public totalsRow: Array<any> = [];
    public withColTotals: boolean = false;
    public withRowTotals: boolean = false;
    public withTrend: boolean = false;
    public withColSubTotals: boolean = false;
    public resultAsPecentage: boolean = false;
    public onlyPercentages: boolean = false;
    public percentageColumns: Array<any> = [];
    public noRepetitions: boolean;
    public origValues: any[] = [];


    public autolayout: boolean = true;
    public sortedSerie: any = null;
    public sortedColumn: any = { field: null, order: null };

    public styles: [];

    public Totals:string = $localize`:@@addTotals:Totales`;
    public SubTotals:string = $localize`:@@SubTotals:SubTotales`;
    public Trend:string = $localize`:@@addtrend:Tendencia`;
    public ordering: any[];


    public constructor(init: Partial<EdaTable>) {
        Object.assign(this, init);
        this.initRows = init['visibleRows'] || 10;
        if (!this.sortedColumn) this.sortedColumn = { field: null, order: null }
    }

    get value() {
        return this._value;
    }

    set value(values: any[]) {
      this.clear();
      this._value = values;
      /* Initialize filters */
      if (!_.isEmpty(this.value)) {
          _.forEach(this.cols, c => {
              if (!_.isNil(c.filter)) {
                  /* Get all unique values from that column to initialize the filter */
                  c.filter.init(_.orderBy(_.uniq(_.map(this.value, c.field))));
              }
          });
      }
      if (this.pivot) {
          this.PivotTable();
      }
      if (this.sortedSerie) {
          this.loadSort();
      }
    }

    public clear() {
        this._value = [];
    }

    public onPage(event: { first, rows }): void {
        this.rows = event.rows;
        this.initRows = event.rows;
        this.onNotify.emit(this.rows)
        this.checkTotals(event);
    }


    public load(funct: Observable<any>) {
        this.clear();
        this.loading = true;
        this.lastFunctLoad = funct;
        return new Promise((resolve, reject) => {
            funct.subscribe(
                response => {
                    this.value = response;
                    this.loading = false;

                    resolve(null);
                },
                err => {
                    this.loading = false;
                    if (!_.isNil(this.alertService)) {
                        this.alertService.addError(err);
                    }
                    reject(err);
                },
            );
        });
    }

    public reload() {
        return this.load(this.lastFunctLoad);
    }


    public getFilteredValues() {
        const me = this;
        if (!me.filteredValue) {
            return me.value;
        } else {
            return me.filteredValue;
        }
    }

    public getValues() {
        return this.value;
    }

    public _showContextMenu(row: any) {
        this.contextMenu.showContextMenu();
        this.contextMenuRow = row;
    }

    public _hideContexMenu() {
        this.contextMenu.hideContextMenu();
        this.contextMenuRow = undefined;
    }

    public getContextMenuRow() {
        return this.contextMenuRow;
    }

    getColsInfo() {
        let out = { numeric: [], text: [], numericLabels: [], textLabels: [], numericDescriptions:[], textDescriptions:[] }
        this.cols.forEach((col, index) => {
            if (col.type === "EdaColumnNumber") {
                out.numeric.push(index)
                out.numericLabels.push(col.header);
                out.numericDescriptions.push(col.description)
            } else {
                out.text.push(index)
                out.textLabels.push(col.header);
                out.textDescriptions.push(col.description)
            }
        });
        return out;
    }

    checkTotals(event) {

        if (this.withRowTotals) {
            this.rowTotals();
        } else {
            if (this.series && !this.withTrend) {
                this.deleteRowTotals();
            }
        }
        if (this.withTrend) {
            this.rowTrend();
        } else {
            if (this.series && !this.withRowTotals) {
                this.deleteTrend();
            }
        }
        if (this.resultAsPecentage === true) {
            this.colsPercentages();
        } else if (this.resultAsPecentage === false && this.percentageColumns.length !== 0) {
            this.removePercentages();
        }

        if (this.withColTotals) {
            this.coltotals();
        }
        if (this.withColSubTotals) {
            event ? this.colSubTotals(event.first / event.rows + 1) : this.colSubTotals(1);
        }
        // SDA CUSTOM Este código produce repeticiones en tabnlas normales y tablas cruzadas  Issue 96 y 101
        // SDA CUSTOM if (this.noRepetitions || !this.noRepetitions) {
        // SDA CUSTOM    this.noRepeatedRows();
        // SDA CUSTOM }
        // Nueva propuesta
        // if ( !this.pivot) {
        // console.log('desactivadas las no repeticiones');
        // this.noRepeatedRows();
        // }
        // END SDA CUSTOM

    }

    deleteRowTotals() {

        const numSeries = this.series.length;
        const withTotalcols = this.cols.filter(col => col.rowTotal === true).length > 0;
        const series = [];

        if (withTotalcols) {
            this.cols = this.cols.filter(col => col.rowTotal !== true);
            this.series[numSeries - 2].labels = this.series[numSeries - 2].labels.filter(label => label.isTotal !== true);
            //percentage columns has no label

            if(this.ordering[0]!==undefined){
                if(this.ordering[0].axes[0].itemX.length>1){
                    this.series[0].labels = this.series[0].labels.filter(label => label.isTotal !== true);

                    const lastLayerLabels = this.cols.filter(col => col.type !== "EdaColumnPercentage").length - this.ordering[0].axes[0].itemX.length;
                    this.series[numSeries - 1].labels = this.series[numSeries - 1].labels.slice(0, lastLayerLabels);
                } else {
                    this.series[0].labels = this.series[0].labels.filter(label => label.isTotal !== true);

                    const lastLayerLabels = this.cols.filter(col => col.type !== "EdaColumnPercentage").length - 1;
                    this.series[numSeries - 1].labels = this.series[numSeries - 1].labels.slice(0, lastLayerLabels);
                }
            } else {
                const lastLayerLabels = this.cols.filter(col => col.type !== "EdaColumnPercentage").length - 1;
                this.series[numSeries - 1].labels = this.series[numSeries - 1].labels.slice(0, lastLayerLabels);
            }

        }
    }

    deleteTrend() {
        const numSeries = this.series.length;
        const series = [];

        this.cols = this.cols.filter(col => col.rowTotal !== true);
        this.series[numSeries - 2].labels = this.series[numSeries - 2].labels.filter(label => label.isTotal !== true);

        //percentage columns has no label
        const lastLayerLabels = this.cols.filter(col => col.type !== "EdaColumnPercentage").length - 1;
        this.series[numSeries - 1].labels = this.series[numSeries - 1].labels.slice(0, lastLayerLabels);


    }

    rowTotals() {
        if (this.pivot === true) {

            const colNames = this.cols.map(col => col.field);

            //get unique names for same metric in each sub-set -> columns : A-income, B-income, A-amount, B-amount -> returns:  [income, amount]
            const numericCols = this.cols.filter(col => col.type === "EdaColumnNumber").map(c => c.field);

            const keys = Object.keys(this._value[0])
                .filter(key => numericCols.includes(key))
                .map(key => key.slice(key.lastIndexOf('~') + 1));
            const valuesKeys = Array.from(new Set(keys));

            //get names for new columns from series array
            let pretyNames; // Valores Numéricos de Columna.
            if (this.series[0].labels.length > 2) {

                if(this.ordering[0]!==undefined){
                    if(this.ordering[0].axes[0].itemZ.length===1){
                        pretyNames = [this.ordering[0].axes[0].itemZ[0].description];
                    } else {
                        pretyNames = Array.from(new Set(this.series[this.series.length - 1].labels.map(serie => serie.title)))
                    }
                } else {
                    pretyNames = Array.from(new Set(this.series[this.series.length - 1].labels.map(serie => serie.title)))
                }

            } else {
                pretyNames = [this.series[0].labels[this.series[0].labels.length - 1].title];
            }

            //add total header  --> se agrego la descripción de la columna
            if (!colNames.includes(valuesKeys[0])) {
                this.series[0].labels.push({ title: this.Totals, rowspan: (this.series.length-1), colspan: valuesKeys.length, isTotal: true, description: this.Totals });
            }

            //add cols and headers --> se agrego las descripciones de las columnas
            valuesKeys.forEach((valueKey, i) => {
                if (!colNames.includes(valueKey)) {
                    const col = new EdaColumnNumber({ header: valueKey, field: valueKey });
                    col.styleClass = 'total-col';
                    col.rowTotal = true;
                    this.cols.push(col);
                    this.series[this.series.length - 1].labels.push({ title: pretyNames[i], rowspan: 2, colspan: 1, sortable: true, column: valueKey, description: pretyNames[i] });
                }
            });

            //put values in each row
            this._value.forEach(row => {
                let totals = {};
                valuesKeys.forEach(key => {
                    totals[key] = 0;
                    row[key] = 0;
                });

                numericCols.forEach(key => {
                    valuesKeys.forEach(valueKey => {
                      let keyArray = key.split('~');
                        if (keyArray.includes(valueKey)) {
                            let decimalplaces = new EdaColumnNumber({}).decimals;  /** esto se hace  para ajustar el número de dicimales porque 3.1+2.5 puede dar 5.600004 */
                            try{
                                if(  row[key].toString().split(".")[1].length > 0){
                                    decimalplaces =  row[key].toString().split(".")[1].length;
                                }
                            }catch(e){ }

                            if(row[key] === '') {
                                totals[valueKey] = parseFloat(totals[valueKey]) + 0;
                                totals[valueKey] = parseFloat(totals[valueKey].toFixed(decimalplaces ));
                            } else {
                                totals[valueKey] = parseFloat(totals[valueKey]) + parseFloat(row[key]);
                                totals[valueKey] = parseFloat(totals[valueKey].toFixed(decimalplaces ));
                            }
                        }
                    });
                });

                Object.entries(totals).forEach(pair => {
                    row[pair[0]] = pair[1];
                });

            });

        }

    }

    rowTrend() {
        if (this.pivot === true) {
            const colNames = this.cols.map(col => col.field);

            //get unique names for same metric in each sub-set -> columns : A-income, B-income, A-amount, B-amount -> returns:  [income, amount]
            const numericCols = this.cols.filter(col => col.type === "EdaColumnNumber").map(c => c.field);
            const keys = Object.keys(this._value[0])
                .filter(key => numericCols.includes(key))
                .map(key => key.slice(key.lastIndexOf('~') + 1));
            const valuesKeys = Array.from(new Set(keys));

            //get names for new columns from series array
            let pretyNames;
            if (this.series[0].labels.length > 2) {

                if(this.ordering[0]!==undefined){
                    if(this.ordering[0].axes[0].itemZ.length===1){
                        pretyNames = [this.ordering[0].axes[0].itemZ[0].description];
                    } else {
                        pretyNames = Array.from(new Set(this.series[this.series.length - 1].labels.map(serie => serie.title)))
                    }
                } else {
                    pretyNames = Array.from(new Set(this.series[this.series.length - 1].labels.map(serie => serie.title)))
                }

            } else {
                pretyNames = [this.series[0].labels[this.series[0].labels.length - 1].title];
            }

            //add total header
            if (!colNames.includes(valuesKeys[0])) {
                this.series[0].labels.push({ title: this.Trend, rowspan: this.series.length - 1, colspan: valuesKeys.length, isTotal: true, description: this.Trend });
            }

            //add cols and headers
            valuesKeys.forEach((valueKey, i) => {
                if (!colNames.includes(valueKey)) {
                    const col = new EdaColumnChart({ header: valueKey, field: valueKey });
                    col.styleClass = 'trend-col';
                    col.rowTotal = true;
                    col.width = 100;
                    this.cols.push(col);

                    this.series[this.series.length - 1].labels.push({ title: pretyNames[i], rowspan: 2, colspan: 1, sortable: true, column: valueKey, description: pretyNames[i] });
                }
            });

            //put values in each row
            this._value.forEach(row => {
                let totals = {};
                valuesKeys.forEach(key => {
                    totals[key] = [];
                    row[key] = [];
                });
                numericCols.forEach(key => {
                    valuesKeys.forEach(valueKey => {
                        if (key.includes(valueKey)) {
                            totals[valueKey].push(row[key]);
                        }
                    });
                });
                Object.entries(totals).forEach((pair: any) => {

                    let data = {
                        labels: new Array(pair[1].length).fill(0),
                        datasets: [
                            {
                                data: pair[1],
                                fill: false,
                                borderColor: '#4bc0c0'
                            }
                        ]
                    }
                    row[pair[0]] = data;
                });
            });
        }
    }

    colSubTotals(page) {
        this.partialTotalsRow = [];

        const offset = page * this.initRows - this.initRows;
        let partialRow = this.sumPartialRows(offset);
        let firstNonNumericRow = true;

        this.cols.forEach((col, i) => {
            if (col.type === "EdaColumnNumber") {
                this.partialTotalsRow.push(
                    {
                        data: parseFloat(partialRow[col.field]).toLocaleString('de-DE'),
                        style: "right",
                        class: "sub-total-row",
                        border: '',
                        type: col.type
                    });
            }
            else {
                if (firstNonNumericRow) {
                    this.partialTotalsRow.push({ data: `${this.SubTotals} `, border: " ", class: 'sub-total-row-header', type: col.type });
                    firstNonNumericRow = false;
                } else {
                    this.partialTotalsRow.push({ data: " ", border: " ", class: 'sub-total-row', type: col.type });
                }
            }
        });
    }

    coltotals() {

        this.withColTotals = true;
        this.totalsRow = [];


        let row = this.buildTotalRow();
        const values = this._value;
        const keys = this.cols.map(col => col.field);


        for (let i = 0; i < values.length; i++) {
            for (let j = 0; j < keys.length; j++) {
                if (i < values.length) {
                    const currentCol = this.cols.filter(col => col.field === keys[j])[0];
                    if (currentCol.type === "EdaColumnNumber") {

                        let decimalplaces = 0;
                        try{
                            let c =  <EdaColumnNumber>currentCol;
                            decimalplaces =  c.decimals;  /** esta mierda se hace  para ajustar el número de dicimales porque 3.1+2.5 puede dar 5.600004 */
                        }catch(e){
                            console.log('error getting decimal places');
                            console.log(e);
                         }

                        if(values[i][keys[j]]===''){
                            row[keys[j]] = parseFloat(row[keys[j]] ) + 0;
                            row[keys[j]] = row[keys[j]].toFixed(decimalplaces );
                        }
                        else {
                            row[keys[j]] = parseFloat(row[keys[j]] ) + parseFloat(values[i][keys[j]]);
                            row[keys[j]] = row[keys[j]].toFixed(decimalplaces );
                        }

                    } else {
                        row[keys[j]] = NaN;
                    }
                }
            }
        }

        let firstNonNumericRow = true;
        this.cols.forEach((col, i) => {
            if (col.type === "EdaColumnNumber") {
                this.totalsRow.push(
                    {
                        data: parseFloat(row[col.field])
                            .toLocaleString('de-DE'),
                        style: "right",
                        class: "total-row",
                        border: '',
                        type: col.type
                    });
            }
            else {
                if (firstNonNumericRow) {
                    this.totalsRow.push({ data: `${this.Totals} `, border: " ", class: 'total-row-header', type: col.type });
                    firstNonNumericRow = false;
                } else {
                    this.totalsRow.push({ data: " ", border: " ", class: 'total-row', type: col.type });
                }
            }
        });
    }

    // Function that fills totals with zeros
    buildTotalRow() {
        let row = {};
        const keys = Object.keys(this._value[0]);
        for (let i = 0; i < keys.length; i++) {
            row[keys[i]] = 0;
        }
        return row;
    }
    sumPartialRows(offset: number) {
        let row = this.buildTotalRow();
        const values = this._value;
        const keys = this.cols.map(col => col.field);
        const lastValue = this.initRows + offset;
        for (let i = offset; i < lastValue; i++) {
            for (let j = 0; j < keys.length; j++) {
                const currentCol = this.cols.filter(col => col.field === keys[j])[0];
                if (i < values.length) {
                    if (currentCol.type === "EdaColumnNumber") {
                        if(values[i][keys[j]] === '') {
                            row[keys[j]] = row[keys[j]] + 0;
                        }
                        else {
                            row[keys[j]] = row[keys[j]] + parseFloat(values[i][keys[j]]);
                        }
                    }
                }
            }
        }

        return row;
    }

//extract values for noRepetitions
extractDataValues(val) {
  //separate values from keys
  let values = [];
  for (let i=0; i<val.length;i++) {
      values.push(Object.values(val[i]));
  }
  return values;
}

      //extract labels for noRepetitions
      extractLabels(val) {
        let labels = [];
        labels.push(Object.keys(val[0])); //insert first object with header to iterate and extract data
        labels.forEach(e => {
            e.forEach(function(key,val) {
                labels.push(key);

            })
        })
        return labels;
    }

    noRepeatedRows() {

        if (!this.noRepetitions) {
          this.value = this.origValues;
        } else {
            //separate values from keys
            let values = this.extractDataValues(this.value);
            //get keys that will be the header
            let labels = this.extractLabels(this.value)
            labels.shift(); //delete first object
            let output = [];
            //this is done to avoid duplicates in the table. if a field has a repeating column
            let first  = _.cloneDeep(values[0]);
            for (let i = 0; i < values.length; i += 1) {
                const obj = [];
                if(i == 0){
                    for (let e = 0; e < values[i].length; e += 1) {
                            obj[labels[e]] = values[i][e];
                        }
                }else{
                    for (let e = 0; e < values[i].length; e += 1) {
                        if (values[i][e] === first[e]    &&  isNaN(values[i][e]) ) {
                            obj[labels[e]] = "";   // AQUI SE SUSTITUYEN LOS REPETIDOS POR UNA CADENA EN BLANCO
                        } else {
                            obj[labels[e]] = values[i][e];
                        }
                        first[e]  =  values[i][e]; //AQUI SE SUTITUYE EL PRIMER VALOR
                        }
                }
                output.push(obj);
            }
            this.value = output;
        }


    }


    colsPercentages() {

        if (this.percentageColumns.length !== 0) {
            this.removePercentages();
        }
        let numericColsMap = new Map();
        const newColumns = [];

        this.percentageColumns = [];

        this.cols.forEach(col => {
            newColumns.push(col);
            if (col.type === "EdaColumnNumber") {
                const column = new EdaColumnPercentage({ header: col.header + '%', field: col.field + '%' });
                if (col.rowTotal === true) {
                    column.rowTotal = true;
                    column.styleClass = "total-col"
                } else {
                    column.styleClass = 'text-right';
                }
                newColumns.push(column);
                this.percentageColumns.push(column);
                numericColsMap.set(col.field, 0);
            }

        });

        this._value.forEach(row => {
            numericColsMap.forEach((value, key, map) => {
                if(row[key] === ''){
                    map.set(key, parseFloat(value) + 0);
                } else {
                    map.set(key, parseFloat(value) + parseFloat(row[key]));
                }
            })
        });

        //calculate percentage for every value
        //get totals
        this._value.forEach(row => {
            numericColsMap.forEach((value, key, map) => {
                const newField = key + '%';
                let percentage = row[key] / value * 100;
                if (isNaN(percentage)) {
                    row[newField] = ' ~ ';
                } else {
                    row[newField] = percentage.toFixed(2) + '%';
                }
            });
        });
        this.cols = newColumns;
        //set new headers
        if (this.pivot && !this.onlyPercentages) {

            const numericColumns = Array.from(new Set(this.series[this.series.length - 1].labels
                .map(serie => serie.title))).length;
            
            this.series.forEach((serie, i) => {
                serie.labels.forEach((column, j) => {
                    if (column.isTotal) {
                        column.colspan = numericColumns * 2;
                    } else if (i !== 0 && j >= 0) {
                        column.colspan = column.colspan * 2;
                    }

                    if(i===0 && column.rowspan===1) {
                        column.colspan = column.colspan * 2;
                    }

                });
            })
            
        }

        if (this.onlyPercentages === true) {
            this.cols.forEach(col => {
                if (col.type === "EdaColumnNumber") {
                    col.visible = false;
                }
            });
        }
    }

    removePercentages() {
        const cols = [];
        const hidenColumns = this.cols.filter(col => col.visible === false).length > 0;
        //remove labels
        if (this.pivot && !hidenColumns) {
            this.series.forEach((serie, i) => {
                serie.labels.forEach((column, j) => {
                    if ((i !== 0 || j !== 0) && column.colspan > 1) {
                        column.colspan = column.colspan / 2;
                    }
                });
            })
        }
        this._value.forEach(row => {
            this.percentageColumns.forEach(col => {
                delete row[col.field];
            })
        });
        //remove columns
        this.cols.forEach(column => {
            if (!this.percentageColumns.includes(column)) {
                column.visible = true;
                cols.push(column);
            }
        });
        this.percentageColumns = [];
        this.cols = cols;

    }
    onHeaderClick(serie) {
        serie.sortState = !serie.sortState;
        this.sort(serie);
        this.sortedSerie = serie;
        this.onSortPivotEvent.emit(this.sortedSerie);
        this.checkTotals(null);
    };

    loadSort() {
        this.checkTotals(null);
        const serie = this.sortedSerie;
        this.sort(serie);
    }


    public onSort($event) {

        this.sortedColumn = $event;
        this.onSortColEvent.emit($event);
        this.checkTotals(null);
    }

    sort(serie) {
        if (typeof this._value[0][serie.column] === 'string') {

            this._value = this._value.sort((a, b) => {
                if (serie.sortState === true) {
                    if (a[serie.column] < b[serie.column])
                        return -1;
                    if (a[serie.column] > b[serie.column])
                        return 1;
                    return 0;
                } else {
                    if (a[serie.column] > b[serie.column])
                        return -1;
                    if (a[serie.column] < b[serie.column])
                        return 1;
                    return 0;
                }
            });

        }
        else {
            this._value = this._value.sort((a, b) => {
                if (serie.sortState === true) {
                    return a[serie.column] - b[serie.column];
                } else {
                    return b[serie.column] - a[serie.column];
                }
            });
        }
    }

    PivotTable() {

        let axes = []
        // console.log('PIVOTtABLE: ',this);
        const colsInfo = this.getColsInfo();
        const oldRows = this.getValues();

        const seriesLabels = [];
        for (let i = 0; i < colsInfo.numeric.length; i++) {
            seriesLabels.push(Object.keys(oldRows[0])[colsInfo.numeric[i]]);
        }

        const rowsToMerge = [];
        const colsToMerge = [];
        let newLabels;

        // Start reorganization
        if(this.ordering!=undefined && this.ordering.length!==0) {
            axes = this.ordering[0].axes

            const newSeriesLabels = [];
            axes[0].itemZ.forEach(e => {
                newSeriesLabels.push(e.column_name)
            });

            newSeriesLabels.forEach((serie, index) => {
                let colsRows = this.buildCrossSerie(index, axes)
                rowsToMerge.push(colsRows.rows);
                colsToMerge.push(colsRows.cols);
                if (index === 0) {
                    newLabels = colsRows.newLabels; //new labels are equal for each serie, first execution is enough to get new labels
                }
            });

            newLabels.metricsLabels = colsInfo.numericLabels;
            newLabels.metricsDescriptions = colsInfo.numericDescriptions;
            newLabels.textDescriptions = colsInfo.textDescriptions;
            newLabels.axes = axes;

            this._value = this.mergeCrossRows(rowsToMerge, axes); // Nueva función que genera las filas de la tabla cruzada
            this.cols = this.mergeCrossColumns(colsToMerge, axes); // Nueva función que genera las columnas de la tabla cruzada
            this.buildCrossHeaders(newLabels, colsInfo); // Nueva función para la creación de los encabezados

            return
        }

        seriesLabels.forEach((serie, index) => {
            let colsRows = this.buildPivotSerie(index);
            rowsToMerge.push(colsRows.rows);
            colsToMerge.push(colsRows.cols);
            if (index === 0) {
                newLabels = colsRows.newLabels; //new labels are equal for each serie, first execution is enough to get new labels
            }
        });

        newLabels.metricsLabels = colsInfo.numericLabels;
        newLabels.metricsDescriptions = colsInfo.numericDescriptions;
        newLabels.textDescriptions = colsInfo.textDescriptions;
        this._value = this.mergeRows(rowsToMerge);
        this.cols = this.mergeColumns(colsToMerge);

        this.buildHeaders(newLabels, colsInfo);
    }

    /**
     * Build a serie to pivot (one serie per metric)
     * @param serieIndex
     */
    buildPivotSerie(serieIndex: number) {
        const params = this.generatePivotParams();
        // console.log(`params ---> serieIndex ${serieIndex} <---`, params);
        const mapTree = this.buildMainMap(params.mainColValues, params.newCols);
        // console.log(`mapTree ---> serieIndex ${serieIndex} <---`, mapTree);
        const populatedMap = this.populateMap(mapTree, params.oldRows, params.mainColLabel, params.aggregatedColLabels[serieIndex], params.pivotColsLabels);
        // console.log(`populatedMap ---> serieIndex ${serieIndex} <---`, populatedMap);

        let newRows = this.buildNewRows(populatedMap, params.mainColLabel, params.aggregatedColLabels[serieIndex]);
        let newColNames = this.getNewColumnsNames(newRows[0]).slice(1); //For left column we want user's name, not technical
        const tableColumns = [];
        tableColumns.push(new EdaColumnText({ header: params.mainCol.header, field: params.mainCol.field }));
        newColNames.forEach(col => {
            tableColumns.push(new EdaColumnNumber({ header: col, field: col }));
        });
        let newLabels = { mainLabel: '', seriesLabels: [], metricsLabels: [] };
        newLabels.mainLabel = params.mainColLabel;
        newLabels.seriesLabels = params.newCols.splice(1);
        return { cols: tableColumns, rows: newRows, newLabels: newLabels }
    }


    buildCrossSerie(serieIndex: number, axes: any[]) {

        const params = this.generateCrossParams(axes);
        // console.log(`params ===> serieIndex ${serieIndex} <===`, params)

        const mapTree = this.buildMapCrossRecursive(params.newCols);
        // console.log(`mapTree ===> serieIndex ${serieIndex} <===`, mapTree);

        const populatedMap = this.populateCrossMap(mapTree, params.oldRows, params.mainColsLabels, params.aggregatedColLabels[serieIndex], params.pivotColsLabels);
        // console.log(`populatedMap ===> serieIndex ${serieIndex} <===`, populatedMap);

        let newRows = this.buildNewCrossRows(populatedMap, params.mainColsLabels, params.aggregatedColLabels[serieIndex], params.newCols);
        let newColNames = this.getNewColumnsNames(newRows[0]).slice(params.mainColsLabels.length); //For left column we want user's name, not technical

        const tableColumns = [];
        params.mainCols.forEach(element => {
            tableColumns.push(new EdaColumnText({ header: element['header'], field: element['field'] }))
        })
        newColNames.forEach(col => {
            tableColumns.push(new EdaColumnNumber({ header: col, field: col }));
        })

        let newLabels = { mainsLabels: [], seriesLabels: [], metricsLabels: [] };
        newLabels.mainsLabels = params.mainColsLabels;
        newLabels.seriesLabels = params.newCols.splice(params.mainColsLabels.length);

        return { cols: tableColumns, rows: newRows, newLabels: newLabels }

    }

    /**
     * Merges series rows in one set of rows
     * @param rowsToMerge
     */
    mergeCrossRows(rowsToMerge: any, axes: any) {
        const NUM_ROWS_IN_SERIES = rowsToMerge[0].length;
        const NUM_SERIES = rowsToMerge.length;
        const rows = [];
        for (let row = 0; row < NUM_ROWS_IN_SERIES; row++) {
            let newRow = {};
            for (let serie = 0; serie < NUM_SERIES; serie++) {
                newRow = { ...newRow, ...rowsToMerge[serie][row] }
            }
            rows.push(newRow);
        }

        let newRows= [] // Arreglo que contendra la lista con almenos un valor

        rows.forEach(row => {
            let contador = 0;
            for(const propiedad in row){
                contador++
                if(contador > axes[0].itemX.length){
                    if(row[propiedad]!==""){
                        newRows.push(row);
                        return;
                    }
                }
            }
        })

        return newRows;
    }

    mergeRows(rowsToMerge: any) {
        const NUM_ROWS_IN_SERIES = rowsToMerge[0].length;
        const NUM_SERIES = rowsToMerge.length;
        const rows = [];
        for (let row = 0; row < NUM_ROWS_IN_SERIES; row++) {
            let newRow = {};
            for (let serie = 0; serie < NUM_SERIES; serie++) {
                newRow = { ...newRow, ...rowsToMerge[serie][row] }
            }
            rows.push(newRow);
        }
        return rows;
    }

    mergeCrossColumns(colsToMerge: any, axes: any){

        const NUM_COLS = colsToMerge[0].length;
        let cols = [];  //first column is the same for each serie

        for (let i = 0; i < axes[0].itemX.length; i++) {
            cols.push(colsToMerge[0][i]);
        }

        for (let col = axes[0].itemX.length; col < NUM_COLS; col++) {
            colsToMerge.forEach(serie => {
                cols.push(serie[col])
            });
        }

        return cols
    }

    /**
     * Merges series columns in one set of columns
     * @param colsToMerge
     */
    mergeColumns(colsToMerge: any) {
        const NUM_COLS = colsToMerge[0].length;
        let cols = [colsToMerge[0][0]];  //first column is the same for each serie
        for (let col = 1; col < NUM_COLS; col++) {
            colsToMerge.forEach(serie => {
                cols.push(serie[col])
            });
        }
        return cols
    }

    /**
     * Builds main map to store data classified by labels in tree format
     */
    buildMainMap(mainColLabels: Array<string>, newCols: Array<Array<string>>) {
        let newArray = newCols;
        newArray.unshift(mainColLabels);
        return this.buildMapRecursive(newArray);
    }
    /**
     * Returns a Map; every key has a map as value with all values passed as parameter as keys and 0 as values
     */
    buildSubMapTree(keys: Array<any>, values: any) {
        let out = new Map();
        keys.forEach(key => {
            let valuesMap = new Map();
            values.forEach(value => {
                valuesMap.set(value, 0); // para la tabla cruzada se utiliza --> ''
            });
            out.set(key, valuesMap);
        });
        return out;
    }
    /**
     * Build a map of maps recursively
     * @param cols
     */
    buildMapRecursive(cols: Array<Array<string>>) {
        let map = new Map();

        if (cols.length === 2) {
            return this.buildSubMapTree(cols[0], cols[1]);
        } else {
            const unsetCols = cols.slice(1);
            cols[0]?.forEach(col => {
                map.set(col, this.buildMapRecursive(unsetCols));
            });
        }
        return map;
    }

    /**
     * Returns a Cross Map
     */
    buildSubMapCrossTree(keys: Array<any>, values: any) {
        let out = new Map();
        keys.forEach(key => {
            let valuesMap = new Map();
            values.forEach(value => {
                valuesMap.set(value, "");
            });
            out.set(key, valuesMap);
        });
        return out;
    }
    /**
     * Build a map of maps recursively
     * @param cols
     */
    buildMapCrossRecursive(cols: Array<Array<string>>) {
        let map = new Map();

        if (cols.length === 2) {
            return this.buildSubMapCrossTree(cols[0], cols[1]);
        } else {
            const unsetCols = cols.slice(1);
            cols[0]?.forEach(col => {
                map.set(col, this.buildMapCrossRecursive(unsetCols));
            });
        }
        return map;
    }

    /**
     * Puts values in the tree map
     */
    populateMap(map: Map<string, any>, rows: any, mainColLabel: string, aggregatedColLabel: string, pivotColsLabels: any) {
        rows.forEach(row => {
            const value = row[aggregatedColLabel]; // Capturas los valores numéricos de oldRows
            const pivotSteps = pivotColsLabels.length - 1; // Número de pasos en seccion pivot
            const leftColTarget = map.get(row[mainColLabel]); // Captura cada mapa de la columna principal
            let lastMapKey = leftColTarget;
            let i;
            for (i = 0; i < pivotSteps; i++) {
                lastMapKey = lastMapKey.get(row[pivotColsLabels[i]]);
            }
            const actualValue = lastMapKey.get(row[pivotColsLabels[i]]);
            lastMapKey.set(row[pivotColsLabels[i]], actualValue + value);
        });
        return map;
    }

    populateCrossMap(map: Map<string, any>, rows: any, mainColsLabels: any, aggregatedColLabel: string, pivotColsLabels: any) {

        let cloneMainColsLabels = _.cloneDeep(mainColsLabels)
        let clonePivotColsLabels = _.cloneDeep(pivotColsLabels)
        const firstMainColsLabels = cloneMainColsLabels[0];

        cloneMainColsLabels.shift(1);
        clonePivotColsLabels.forEach(v => {
            cloneMainColsLabels.push(v);
        });

        clonePivotColsLabels = cloneMainColsLabels;

        rows.forEach(row => {
            const value = row[aggregatedColLabel]; // Capturas los valores numéricos de oldRows

            const pivotSteps = clonePivotColsLabels.length - 1; // Número de pasos en seccion pivot
            const leftColTarget = map.get(row[firstMainColsLabels]); // Captura cada mapa de la columna principal
            let lastMapKey = leftColTarget;
            let i;

            for (i = 0; i < pivotSteps; i++) {
                lastMapKey = lastMapKey.get(row[clonePivotColsLabels[i]]);
            }
            let actualValue = lastMapKey.get(row[clonePivotColsLabels[i]]);
            // console.log('actualValue: ', actualValue);
            // console.log('typeOf actualValue: ', typeof(actualValue));
            lastMapKey.set(row[clonePivotColsLabels[i]], Number(actualValue) + value);
        });
        return map;
    }

    /**
     * Builds new rows given a tree map
     */
    buildNewRows(map: Map<string, any>, mainColLabel: string, serieLabel: string) {
        let rows = [];
        map.forEach((value, key) => {
            let row = {};
            row[mainColLabel] = key;
            let pivotedCols = this.buildNewRowsRecursive(value, '', [], serieLabel);
            pivotedCols.forEach(col => {
                row[col.label] = col.value;
            });
            rows.push(row);
        });
        return rows;
    }
    /**
     * Buils new rows recursively (iterating over the tree until last nodes are found)
     * @param map
     * @param colLabel
     * @param row
     * @param serieLabel
     */
    buildNewRowsRecursive(map: Map<string, any>, colLabel: string, row: any, serieLabel: string) {
        map.forEach((value, key) => {
            if (typeof value !== 'object') {
                let label = `${colLabel} ~ ${key} ~ ${serieLabel}`;
                label = label.substr(2)
                row.push({ label: label, value: value });
                return
            } else {
                this.buildNewRowsRecursive(value, `${colLabel} ~ ${key}`, row, serieLabel);
            }
        });
        return row;
    }

    buildNewCrossRows(map: Map<string, any>, mainColsLabels: any, serieLabel: string, newCols: any) {
        const arraysMain = []; // Arreglo de los nombres de las columnas principales
        const rows = []
        const rowsTest = []

        mainColsLabels.forEach((e, i) => {
            arraysMain[i] = _.cloneDeep(newCols[i]);
        });

        const combinations = this.combineArrays(arraysMain);

        combinations.forEach( element => {
            const row = {}
            mainColsLabels.forEach((main, j) => {
                row[main] = element[j];
            });
            rows.push(row);
        })

        // Uso de una función recursiva para acceder a una posición usando una lista de claves
        combinations.forEach(keys => {
            let row = {};
            let mapItem = this.recursiveAccessCrossTable(map, keys)
            let pivotedCols = this.buildNewRowsRecursive(mapItem, '', [], serieLabel);

            pivotedCols.forEach(col => {
                row[col.label] = col.value;
            });
            rowsTest.push(row);

        });

        // totalRows:
        const totalRows = rows.map((item, index) => {
            return { ...item, ...rowsTest[index] };
        });

        return totalRows;
    }

    recursiveAccessCrossTable(map: Map<string, any>, keys: any){
        // Si no hay más claves, retornamos el mapa actual
        if(keys.length===0) {
            return map;
        }

        // Tomar la primera clave y eliminarla de la lista
        const [firstKey, ...remainingKeys] = keys;

        // Obtener el siguiente mapa o valor usando la clave actual
        const nextMap = map.get(firstKey);

        // Si el siguiente mapa es un `Map`, continuar recursivamente
        if (nextMap instanceof Map) {
            return this.recursiveAccessCrossTable(nextMap, remainingKeys);
        }

        return nextMap;
    }

    combineArrays(arrays: any){

        function combine(currentIndex: number, currentCombination: any){
            if(currentIndex === arrays.length){
                result.push(currentCombination);
                return;
            }

            arrays[currentIndex].forEach(e => {
                const newCombination = [ ...currentCombination, e];
                combine(currentIndex+1,  newCombination);
            });
        }

        const result = [];
        combine(0, []);
        return result;
    }

    getNewColumnsNames(sampleRow: any) {
        return Object.keys(sampleRow);
    }

    /**
     * Generates params to build crosstable
     */
    generatePivotParams(): PivotTableSerieParams {
        //get old rows to build new ones
        const oldRows = this.getValues();
        //get index for numeric and text/date columns
        const typesIndex = this.getColsInfo();
        //Get left column
        const mainCol = this.cols[typesIndex.text[0]];
        const mainColLabel = Object.keys(oldRows[0])[typesIndex.text[0]];
        const mainColValues = _.orderBy(_.uniq(_.map(this.value, mainCol.field)));
        //get aggregation columns
        const aggregatedColLabels = [];
        for (let i = 0; i < typesIndex.numeric.length; i++) {
            aggregatedColLabels.push(Object.keys(oldRows[0])[typesIndex.numeric[i]]);
        }
        //get pivot columns
        const pivotCols = [];
        const pivotColsLabels = [];
        for (let i = 1; i < typesIndex.text.length; i++) {
            pivotCols.push(this.cols[typesIndex.text[i]]);
            pivotColsLabels.push(Object.keys(oldRows[0])[typesIndex.text[i]]);
        }
        //get distinct values of pivot columns (new-columns names)
        const newCols = [];

        pivotCols.forEach(pivotCol => {
            newCols.push(_.orderBy(_.uniq(_.map(this.value, pivotCol.field))));
        });


        const params = {
            mainCol: mainCol,
            mainColLabel: mainColLabel,
            mainColValues: mainColValues,
            aggregatedColLabels: aggregatedColLabels,
            pivotColsLabels: pivotColsLabels,
            pivotCols: pivotCols,
            oldRows: oldRows,
            newCols: newCols
        }
        return params
    }

    generateCrossParams(axes: any[]): CrossTableSerieParams {
        const oldRows = this.getValues(); //get old rows to build new ones
        // const typesIndex = this.getColsInfo(); //get index for numeric and text/date columns
        //get aggregation columns

        let aggregatedColLabels = [];
        axes[0].itemZ.forEach(e => {
            this.cols.forEach(c => {
                if(c.header === e.description){
                    aggregatedColLabels.push(c.field);
                }
            })
        });

        //get pivot columns
        const pivotCols = [];
        const pivotColsLabels = [];

        this.cols.forEach(e => {
            axes[0].itemY.forEach(y => {
                if(e.field === y.column_name) {
                    pivotCols.push(e);
                    pivotColsLabels.push(e.field)
                }
            });
        })

        //get main columns
        const mainCols = [];
        const mainColsLabels = [];

        this.cols.forEach(e => {
            axes[0].itemX.forEach(x => {
                if(e.field === x.column_name) {
                    mainCols.push(e);
                    mainColsLabels.push(e.field)
                }
            });
        })

        //get distinct values of pivot columns (new-columns names)
        const newCols = [];
        axes[0].itemX.forEach(e => newCols.push(_.orderBy(_.uniq(_.map(this.value, e.column_name)))));
        axes[0].itemY.forEach(e => newCols.push(_.orderBy(_.uniq(_.map(this.value, e.column_name)))));

        const params = {
            mainCols: mainCols,
            mainColsLabels: mainColsLabels,
            aggregatedColLabels: aggregatedColLabels,
            pivotColsLabels: pivotColsLabels,
            pivotCols: pivotCols,
            oldRows: oldRows,
            newCols: newCols,
        }
        return params
    }

    // Función para la tabla cruzada generica.
    buildCrossHeaders(labels: any, colsInfo: any) {
        let series = [];
        const numRows = labels.seriesLabels.length + 1 //1 for metrics labels
        let numCols = 1;
        labels.seriesLabels.forEach(label => {
            numCols *= label.length;
        });
        numCols *= labels.axes[0].itemZ.length;
        //Main header props (incuding first label headers row)

        let mains = [];

        labels.axes[0].itemX.forEach((e, j) => {
            mains.push({
                title: labels.axes[0].itemX[j].description,
                column: labels.axes[0].itemX[j].column_name,
                rowspan: numRows, colspan: 1, sortable: true, description: labels.axes[0].itemX[j].description
            })
        });

        series.push({ labels: mains });
        colsInfo.textDescriptions.splice(0, 1);

        //if there is only one metric the metric is the header

        if (labels.axes[0].itemZ.length > 1) {
            for (let i = 0; i < labels.seriesLabels[0].length; i++) {
                series[0].labels.push({
                    title: labels.seriesLabels[0][i], description : labels.axes[0].itemY[0].description,
                    rowspan: 1, colspan: numCols / labels.seriesLabels[0].length, sortable: false
                })
            }
        } else {
            /**The metric is the header */
            series[0].labels.push({ title: labels.axes[0].itemZ[0].description, rowspan: 1, colspan: numCols, description:labels.axes[0].itemZ[0].description});

            let serie = { labels: [] };
            for (let i = 0; i < labels.seriesLabels[0].length; i++) {
                serie.labels.push({
                    title: labels.seriesLabels[0][i], description : labels.axes[0].itemY[0].description,
                    rowspan: 1, colspan: numCols / labels.seriesLabels[0].length, sortable: false, metric:labels.axes[0].itemZ[0].description
                })
            }
            series.push(serie);
        }
        //labels headers props
        let mult = labels.seriesLabels[0].length;
        let colspanDiv = numCols / labels.seriesLabels[0].length;
        for (let i = 1; i < labels.seriesLabels.length; i++) {
            let serie = { labels: [] };
            for (let j = 0; j < labels.seriesLabels[i].length * mult; j++) {
                serie.labels.push({
                    title: labels.seriesLabels[i][j % labels.seriesLabels[i].length], description : labels.axes[0].itemY[i].description,
                    rowspan: 1, colspan: colspanDiv / labels.seriesLabels[i].length, sortable: false, metric:labels.axes[0].itemZ[0].description
                });
            }
            series.push(serie);
            mult *= labels.seriesLabels[i].length;
            colspanDiv = colspanDiv / labels.seriesLabels[i].length;
        }
        //metrics headers props ->  again, if there is only one metric the metric is the header

        if (labels.axes[0].itemZ.length > 1) {
            let serie = { labels: [] }
            for (let i = 0; i < numCols; i++) {
                serie.labels.push({
                    title: labels.axes[0].itemZ[i % labels.axes[0].itemZ.length].description, description : labels.axes[0].itemZ[i % labels.axes[0].itemZ.length].description,
                    rowspan: 1, colspan: 1, sortable: false, metric :labels.axes[0].itemZ[i % labels.axes[0].itemZ.length].description
                })
            }

            series.push(serie)
        }
        this.series = series;

        //set column name for column labels
        this.series[this.series.length - 1].labels.forEach((label, i) => {
            label.column = this.cols[i + (this.cols.length - this.series[this.series.length - 1].labels.length)].field;
            label.sortable = true;
            label.sortState = false;
        });
    }

    /**
     *
     * @param labels labels to set headers
     * @param colsInfo contains userName for main column
     */

    buildHeaders(labels: any, colsInfo: any) {

        let series = [];
        const numRows = labels.seriesLabels.length + 1 //1 for metrics labels
        let numCols = 1;
        labels.seriesLabels.forEach(label => {
            numCols *= label.length;
        });
        numCols *= labels.metricsLabels.length;
        //Main header props (incuding first label headers row)
        let mainColHeader = {
            title: colsInfo.textLabels[0],
            column: labels.mainLabel,
            rowspan: numRows, colspan: 1, sortable: true, description:colsInfo.textDescriptions[0]
        }
        series.push({ labels: [mainColHeader] });
        colsInfo.textDescriptions.splice(0, 1);

        //if there is only one metric the metric is the header
        if (labels.metricsLabels.length > 1) {
            for (let i = 0; i < labels.seriesLabels[0].length; i++) {
                series[0].labels.push({
                    title: labels.seriesLabels[0][i], description : labels.textDescriptions[0],
                    rowspan: 1, colspan: numCols / labels.seriesLabels[0].length, sortable: false
                })
            }
        } else {
            /**The metric is the header */
            series[0].labels.push({ title: labels.metricsLabels[0], rowspan: 1, colspan: numCols, description:labels.metricsDescriptions[0]});

            let serie = { labels: [] };
            for (let i = 0; i < labels.seriesLabels[0].length; i++) {
                serie.labels.push({
                    title: labels.seriesLabels[0][i], description : labels.textDescriptions[0],
                    rowspan: 1, colspan: numCols / labels.seriesLabels[0].length, sortable: false, metric:labels.metricsLabels[0]
                })
            }
            series.push(serie);
        }
        //labels headers props
        let mult = labels.seriesLabels[0].length;
        let colspanDiv = numCols / labels.seriesLabels[0].length;
        for (let i = 1; i < labels.seriesLabels.length; i++) {
            let serie = { labels: [] };
            for (let j = 0; j < labels.seriesLabels[i].length * mult; j++) {
                serie.labels.push({
                    title: labels.seriesLabels[i][j % labels.seriesLabels[i].length], description : labels.textDescriptions[i],
                    rowspan: 1, colspan: colspanDiv / labels.seriesLabels[i].length, sortable: false
                });
            }
            series.push(serie);
            mult *= labels.seriesLabels[i].length;
            colspanDiv = colspanDiv / labels.seriesLabels[i].length;
        }
        //metrics headers props ->  again, if there is only one metric the metric is the header
        if (labels.metricsLabels.length > 1) {
            let serie = { labels: [] }
            for (let i = 0; i < numCols; i++) {
                serie.labels.push({
                    title: labels.metricsLabels[i % labels.metricsLabels.length], description : labels.metricsDescriptions[i % labels.metricsLabels.length],
                    rowspan: 1, colspan: 1, sortable: false, metric :labels.metricsLabels[i % labels.metricsLabels.length]
                })
            }

            series.push(serie)
        }
        this.series = series;

        //set column name for column labels
        this.series[this.series.length - 1].labels.forEach((label, i) => {
            label.column = this.cols[i + 1].field;
            label.sortable = true;
            label.sortState = false;
        });
    }

}
