import {Component} from '@angular/core';
import {SelectItem} from 'primeng/api';
import {EdaDialog, EdaDialogCloseEvent, EdaDialogAbstract} from '@eda/shared/components/shared-components.index';
import {Relation} from '@eda/models/data-source-model/data-source-models';
import {DataSourceService} from '@eda/services/api/datasource.service';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { AlertService } from '@eda/services/service.index';

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

    public showTargetTables = false;

    public form: FormGroup;

    constructor(
        private dataModelService: DataSourceService,
        private formBuilder: FormBuilder,
        private alertService: AlertService) {
        super();

        this.dialog = new EdaDialog({
            show: () => this.onShow(),
            hide: () => this.onClose(EdaDialogCloseEvent.NONE),
            title: ''
        });

        this.form = this.formBuilder.group({
            sourceCol: [null, Validators.required],
            targetTable: [{value: '', disabled: true}, Validators.required],
            targetCol: [null, Validators.required]
        }); //, {validators: this.checkOrder('sourceCol', 'targetTable')});
    }

    onShow(): void {
        this.dialog.title = `Añadir relación a la tabla ${this.controller.params.table.name}}`;
        this.sourceCols = this.controller.params.table.columns;
        this.targetTables = this.dataModelService.getModel().map(t => {
            const item: SelectItem = { label: t.table_name, value: t };
            return item;
        });
    }

    disableDrop(){
        return this.showTargetTables === false;
    }
    enableTargetTables(){
        this.form.controls.targetTable.enable();
    }

    saveRelation() {
        if (this.form.invalid) {
            return this.alertService.addError('Recuerde llenar los campos obligatorios');
        } else {

            const rel: Relation = {
                source_table: this.controller.params.table.technical_name,
                source_column: this.form.value.sourceCol.column_name,
                target_table: this.form.value.targetTable.label,
                target_column: this.form.value.targetCol.column_name,
                visible: true
            };
            this.onClose(EdaDialogCloseEvent.NEW, rel);
        }
    }

    getColumnsByTable() {
        this.targetCols = [];
        let tmpTable = this.form.value.targetTable;
        tmpTable.value.columns.filter(c => c.column_type === this.form.value.sourceCol.column_type).forEach(col => {
            this.targetCols.push({ label: col.column_name, value: col })
        });

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
