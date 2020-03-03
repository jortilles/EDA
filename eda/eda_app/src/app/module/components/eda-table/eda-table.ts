import { Observable } from 'rxjs';
import { EdaColumn } from './eda-columns/eda-column';
import { AlertService } from '@eda/services/service.index';
import * as _ from 'lodash';
import {EdaContextMenu} from '@eda/shared/components/eda-context-menu/eda-context-menu';
import { EdaColumnText } from './eda-columns/eda-column-text';

export class EdaTable {
    private _value: any[] = [];

    cols: EdaColumn[] = [];
    search: boolean = false;
    loading: boolean = false;
    alertService: AlertService;
    filteredValue: any[] | undefined;


    //Input switch
    oldvalue: any[] = [];
    oldcols: EdaColumn[] = [];
    pivot: boolean = false;

    contextMenu: EdaContextMenu = new EdaContextMenu({});
    contextMenuRow: any;

    private lastFunctLoad: Observable<any>;

    public constructor(init: Partial<EdaTable>) {
        Object.assign(this, init);
    }

    get value() {
        return this._value;
    }

    set value(values: any[]) {
        this.clear();
        this._value = values;
        /* Inicialitzar filtres */
        if (!_.isEmpty(this.value)) {
            _.forEach(this.cols, c => {
                if (!_.isNil(c.filter)) {
                    /* Obtenim tots els valors sense repetits d'aquella columna per inicialitzar el filtre */
                    c.filter.init(_.orderBy(_.uniq(_.map(this.value, c.field))));
                }
            });
        }

        if (this.pivot) {
            this.pivotTable();
        }
    }

    clear() {
        this._value = [];
    }

    load(funct: Observable<any>) {
        this.clear();
        this.loading = true;
        this.lastFunctLoad = funct;
        return new Promise((resolve, reject) => {
            funct.subscribe(
                response => {
                    this.value = response;
                    this.loading = false;

                    resolve();
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

    reload() {
        return this.load(this.lastFunctLoad);
    }


    getFilteredValues() {
        const me = this;
        if (!me.filteredValue) {
            return me.value;
        } else {
            return me.filteredValue;
        }
    }

    getValues() {
        return this.value;
    }

    _showContextMenu(row: any) {
        this.contextMenu.showContextMenu();
        this.contextMenuRow = row;
    }

    _hideContexMenu() {
        this.contextMenu.hideContextMenu();
        this.contextMenuRow = undefined;
    }

    getContextMenuRow() {
        return this.contextMenuRow;
    }

    /**
     * Pivota la taula sobre la columna 2, agregant els valors de la columna 3
     *
     */
    pivotTable() {
        let mainColumn = this.cols[0];
        let pivotColumn = this.cols[1];
        let newColumns = _.orderBy(_.uniq(_.map(this.value, pivotColumn.field)));
        let oldRows = this.getValues();
        let newRows = [];
        let pivotMap = new Map();
        let mainCol = Object.keys(oldRows[0])[0];
        let pivot = Object.keys(oldRows[0])[1];
        let value = Object.keys(oldRows[0])[2];

        /**
         * pivotMap is a map with maincolumn values as keys.
         * Each map's value is a map with pivot column values as keys and  column3 aggregated values  as values
         */
        oldRows.forEach(row => {
            if (pivotMap.has(row[mainCol])) {
                const node = pivotMap.get(row[mainCol]);
                node.set(row[pivot], node.get(row[pivot]) + row[value] );
            } else {
                const tmpNode = new Map();
                newColumns.forEach(col => {
                    tmpNode.set(col, 0);
                });
                tmpNode.set(row[pivot], row[value]);
                pivotMap.set(row[mainCol], tmpNode);
            }
        });

        const field = mainColumn.field;
        pivotMap.forEach((value, key) => {
            let row = {};
            row[field] = key;
            value.forEach((value, key) => {
                row[key] = value;
            });

            newRows.push(row);
        });

        const tableColumns = [];
        tableColumns.push(new EdaColumnText({ header: mainColumn.header, field: mainColumn.field }));
        newColumns.forEach(col => {
            tableColumns.push(new EdaColumnText({ header: col, field: col }));
        });

        this.cols = tableColumns;
        this._value = newRows;
    }
}
