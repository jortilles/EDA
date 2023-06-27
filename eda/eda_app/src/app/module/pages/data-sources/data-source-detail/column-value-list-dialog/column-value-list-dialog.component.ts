import {Component} from '@angular/core';
import {SelectItem} from 'primeng/api';
import {EdaDialog, EdaDialogCloseEvent, EdaDialogAbstract} from '@eda/shared/components/shared-components.index';
import { DataSourceService, QueryBuilderService, UserService, GroupService, QueryParams } from "@eda/services/service.index";
import {ValueListSource} from '@eda/models/data-source-model/data-source-models';
import { AlertService } from '@eda/services/service.index';

@Component({
    selector: 'app-column-value-list-dialog',
    templateUrl: './column-value-list-dialog.component.html',
    styleUrls: ['./column-value-list-dialog.component.css']
})

export class ColumnValueListDialogComponent extends EdaDialogAbstract {
    public dialog: EdaDialog;

    
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


    constructor(private dataSourceService: DataSourceService,
        private queryBuilderService: QueryBuilderService, ) {
        super();


        this.dialog = new EdaDialog({
            show: () => this.onShow(),
            hide: () => this.onClose(EdaDialogCloseEvent.NONE),
            title: $localize`:@@AddValueListOptions:Definir un listado de valores posibles`
        });
        this.dialog.style = { width: '40%', height: '50%', top:"-4em", left:'1em' };

/*

        this.form = this.formBuilder.group({
            sourceCol: [null, Validators.required],
            targetTable: [null, Validators.required],
            targetCol: [null, Validators.required]
        }); //, {validators: this.checkOrder('sourceCol', 'targetTable')});
        */
    }

    onShow(): void {
        this.table =  this.controller.params.table;
        this.column = this.table.columns.filter(c => c.column_name === this.controller.params.column.technical_name)[0];
  
        const title = this.dialog.title;
        this.dialog.title = `${title} :  ${this.table.table_name} - ${this.column.column_name} `;

        this.targetTables = this.dataSourceService.getModel().map(t => {
            const item: SelectItem = { label: t.display_name.default, value: t };
            return item;
        });
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
        this.onClose(EdaDialogCloseEvent.NONE );
    }

    onClose(event: EdaDialogCloseEvent, response?: any): void {
        return this.controller.close(event, response);
    }
}
