import {Component} from '@angular/core';
import {EdaDialogAbstract} from '@eda_shared/components/eda-dialogs/eda-dialog/eda-dialog-abstract';
import {EdaDialog, EdaDialogCloseEvent} from '@eda_shared/components/eda-dialogs/eda-dialog/eda-dialog';
import {Relation} from '@eda_models/data-source-model/data-source-models';
import {SelectItem} from 'primeng/api';
import {DataSourceService} from '@eda_services/api/datasource.service';

@Component({
    selector: 'app-table-relations-dialog',
    templateUrl: './table-relations-dialog.component.html'
})

export class TableRelationsDialogComponent extends EdaDialogAbstract {
    public dialog: EdaDialog;
    // Drop down vars
    public sourceCols: any[] = [];
    public targetTables: any[] = [];
    public targetCols: any[] = [];

    public sourceCol: any;
    public targetTable: any;
    public targetCol: any;

    constructor( private dataModelService: DataSourceService) {
        super();

        this.dialog = new EdaDialog({
            show: () => this.onShow(),
            hide: () => this.onClose(EdaDialogCloseEvent.NONE),
            title: ''
        });
    }

    onShow(): void {
        this.dialog.title = `Añadir relación a la tabla ${this.controller.params.table.name}}`;
        this.sourceCols = this.controller.params.table.columns;
        this.targetTables = this.dataModelService.getModel().map(t => {
            const item: SelectItem = { label: t.table_name, value: t };
            return item;
        });
    }

    saveRelation() {
        const rel: Relation = {
            source_table: this.controller.params.table.technical_name,
            source_column: this.sourceCol.column_name,
            target_table: this.targetTable.label,
            target_column: this.targetCol.column_name,
            visible: true
        };

        this.onClose(EdaDialogCloseEvent.NEW, rel);
    }

    getColumnsByTable() {
        this.targetCols = this.targetTable.value.columns.filter(c => c.column_type === this.sourceCol.column_type);
    }

    closeDialog() {
        this.sourceCol = '';
        this.targetTable = '';
        this.targetCol = '';
        this.onClose(EdaDialogCloseEvent.NONE);
    }

    onClose(event: EdaDialogCloseEvent, response?: any): void {
        return this.controller.close(event, response);
    }
}
