import { Observable } from 'rxjs';
import { EdaColumn } from './eda-columns/eda-column';
import { AlertService } from '@eda_services/service.index';
import * as _ from 'lodash';
import {EdaContextMenu} from '@eda_shared/components/eda-context-menu/eda-context-menu';

export class EdaTable {
    private _value: any[] = [];

    cols: EdaColumn[] = [];
    search: boolean = true;
    loading: boolean = false;
    alertService: AlertService;
    filteredValue: any[] | undefined;

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
}
