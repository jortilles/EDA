import {Component, Input} from '@angular/core';
import {SelectItem} from 'primeng/api';
import {EdaDialog, EdaDialogCloseEvent, EdaDialogAbstract, EdaDialog2Component} from '@eda/shared/components/shared-components.index';
import {Relation} from '@eda/models/data-source-model/data-source-models';
import {DataSourceService} from '@eda/services/api/datasource.service';
import { UntypedFormGroup, UntypedFormBuilder, Validators, ReactiveFormsModule  } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { AlertService } from '@eda/services/service.index';

@Component({
    standalone: true,
    selector: 'app-table-relations-dialog',
    templateUrl: './table-relations-dialog.component.html',
    styleUrls: ['./table-relations-dialog.component.css'],
    imports: [DropdownModule, ReactiveFormsModule, EdaDialog2Component]
})

export class TableRelationsDialogComponent{
    @Input() controller: any;

    // Drop down vars
    public sourceCols: any[] = [];
    public targetTables: any[] = [];
    public targetCols: any[] = [];

    public sourceCol: any;
    public targetTable: any;
    public targetCol: any;
    public display_name: string;

    public selectedTargetCols : Array<any> = [];
    public selectedSourceCols : Array<any> = [];

    public showTargetTables = false;

    public form: UntypedFormGroup;
    public title = $localize`:@@addRelationTo:Añadir relación a la tabla `;

    public emptyMessageTags: string = $localize`:@@emptyMessageTags:No se encontraron resultados`;

    constructor(
        private dataModelService: DataSourceService,
        private formBuilder: UntypedFormBuilder,
        private alertService: AlertService) {
        
        this.form = this.formBuilder.group({
            sourceCol: [null, Validators.required],
            targetTable: [null, Validators.required],
            targetCol: [null, Validators.required],
            display_name: null,
        }); //, {validators: this.checkOrder('sourceCol', 'targetTable')});
    }

    ngOnInit(): void {
        this.sourceCols = this.controller.params.table.columns;
        this.targetTables = this.dataModelService.getModel().map(t => {
            const item: SelectItem = { label: t.display_name.default, value: t };
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
            return this.alertService.addError($localize`:@@fillRequiredFields:Recuerde llenar los campos obligatorios`);
        } else {
            const rel: Relation = {
                source_table: this.controller.params.table.technical_name,
                source_column: this.selectedSourceCols.map(c => c.column_name),
                target_table: this.form.controls.targetTable.value.value.table_name,
                target_column: this.selectedTargetCols.map(c => c.column_name),
                display_name: { "default": this.display_name, "localized": []},
                visible: true
            };          
            this.onClose(EdaDialogCloseEvent.NEW, rel);
        }
    }

    getColumnsByTable() {
        this.targetCols = [];
        let tmpTable = this.form.controls.targetTable.value;
        tmpTable.value.columns.filter(c => c.column_type === this.form.value.sourceCol.column_type).forEach(col => {
            this.targetCols.push({ label: col.display_name.default, value: col })
        });
    }

    addRelation(){
        this.targetTable = this.form.controls.targetTable.value.label;
        this.form.controls.targetTable.disable();

        this.selectedSourceCols.push(this.form.value.sourceCol);
        this.selectedTargetCols.push(this.form.value.targetCol);
        this.display_name = this.form.value.display_name;

    }

    deleteRelation(index) {
        this.selectedSourceCols.splice(index, 1);
        this.selectedTargetCols.splice(index, 1);
        if(this.selectedSourceCols.length === 0) this.form.controls.targetTable.enable();
      }

    closeDialog() {
        this.sourceCol = '';
        this.targetTable = '';
        this.targetCol = '';
        this.display_name = '';
        this.onClose(EdaDialogCloseEvent.NONE);
    }

    onClose(event: EdaDialogCloseEvent, response?: any): void {
        return this.controller.close(event, response);
    }
}
