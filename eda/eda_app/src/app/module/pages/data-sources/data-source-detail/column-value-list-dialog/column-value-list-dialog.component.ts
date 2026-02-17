import {Component, Input} from '@angular/core';
import {SelectItem} from 'primeng/api';
import {EdaDialogCloseEvent} from '@eda/shared/components/shared-components.index';
import { DataSourceService, QueryBuilderService } from "@eda/services/service.index";
import {ValueListSource} from '@eda/models/data-source-model/data-source-models';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { EdaDialog2Component } from '@eda/shared/components/shared-components.index';

@Component({
    standalone: true,
    selector: 'app-column-value-list-dialog',
    templateUrl: './column-value-list-dialog.component.html',
    styleUrls: ['./column-value-list-dialog.component.css'],
    imports: [FormsModule, ReactiveFormsModule, DropdownModule, EdaDialog2Component]
})

export class ColumnValueListDialogComponent{
    @Input() controller: any;
    /* filterProps */
    private table: any;
    private column: any;


    // Drop down vars
    public targetTables: any[] = [];
    public targetCols: any[] = [];

    public sourceCols: any[] = [];


    public targetTable: any;
    public targetIdCol: any;
    public targetDescCol: any;


    public selectedTargetCols : Array<any> = [];
    public selectedSourceCols : Array<any> = [];

    public showTargetTables = false;
    public title = $localize`:@@AddValueListOptions:Definir un listado de valores posibles`;


    constructor(private dataSourceService: DataSourceService,
        private queryBuilderService: QueryBuilderService, ) {
    }

    ngOnInit(): void {
        this.table =  this.controller.params.table;
        this.column = this.table.columns.filter(c => c.column_name === this.controller.params.column.technical_name)[0];
  
        this.targetTables = this.dataSourceService.getModel().map(t => {
            const item: SelectItem = { label: t.display_name.default, value: t };
            return item;
        }).sort((a, b) => a.label.localeCompare(b.label));
    }

    getColumnsByTable() {
        this.targetCols = [];
        let tmpTable = this.targetTable.value;
        tmpTable.columns.forEach(col => {
            this.targetCols.push({ label: col.display_name.default, value: col })
        });

    }

    saveValueListSource() {
            const vls: ValueListSource = {
                source_table: this.table.table_name,
                source_column: this.column.column_name,
                target_table: this.targetTable.value.table_name,
                target_id_column: this.targetIdCol.column_name,
                target_description_column: this.targetDescCol.column_name
            };
            this.onClose(EdaDialogCloseEvent.NEW, vls);
    }

    closeDialog() {
        this.table = '';
        this.column = '';
        this.targetTable = '';
        this.targetIdCol= ''; 
        this.targetDescCol= '';
        this.onClose(EdaDialogCloseEvent.NONE);
    }

    onClose(event: EdaDialogCloseEvent, response?: any): void {
        return this.controller.close(event, response);
    }
}
