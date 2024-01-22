import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import * as _ from 'lodash';
import { ConfirmationService } from "primeng/api";

@Component({
    selector: 'app-whatif-dialog',
    templateUrl: './whatif-dialog.component.html',
    styleUrls: ['./whatif-dialog.component.css']
})
export class WhatIfDialogComponent implements OnInit {
    @Input() currentQuery: any[] = [];
    @Output() currentQueryChange: EventEmitter<any> = new EventEmitter<any>();
    @Output() close: EventEmitter<any> = new EventEmitter<any>();

    public display: boolean = false;

    public whatIf: any = {};

    public columnOptions: any[] = [];
    public ifOptions: any[] = [
        { label: 'Sumar', value: '+' },
        { label: 'Restar', value: '-' },
        { label: 'Multiplicar', value: '*' },
        { label: 'Dividir', value: '/' }
    ];

    constructor(private confirmationService: ConfirmationService) { }

    public ngOnInit(): void {
        this.display = true;
        this.setColumnOptions();
    }

    private setColumnOptions(): void {
        const columns = this.currentQuery.filter((query: any) => query.column_type == 'numeric' && !query.whatif_column);
        this.columnOptions = columns.map((column: any) => ({ label: column.display_name.default, value: column}))
    }

    public addWhatIfColumn(): void {
        if (this.whatIf.column && this.whatIf.operator && this.whatIf.value && this.whatIf.display_name) {
            const whatIfColumn = _.cloneDeep(this.whatIf.column);
            whatIfColumn.whatif_column = true;
            whatIfColumn.display_name.default = this.whatIf.display_name;
            whatIfColumn.whatif = { operator: this.whatIf.operator, value: this.whatIf.value };
            this.currentQuery.push(whatIfColumn);
            this.whatIf = {};
        }
    }

    public generateAlias(): void {
        if (this.whatIf.column && this.whatIf.operator && this.whatIf.value) {
            this.whatIf.display_name = `${this.whatIf.column.display_name.default} (${this.whatIf.operator}${this.whatIf.value})`;
        }
    }

    public removeWhatIfColumn(whatIfColumn: any): void {
        //this.currentQuery = this.currentQuery.filter((query: any) => whatIfColumn.table_id != query.table_id && whatIfColumn.display_name.default != query.display_name.default);
        const inx = this.currentQuery.indexOf(whatIfColumn);

        if (inx >= 0) {
            this.currentQuery.splice(inx, 1);
        }
    }

    public disableApply(): boolean {
        return !this.whatIf.column || !this.whatIf.operator || !this.whatIf.value || !this.whatIf.display_name;
    }

    public onApplyWhatIfDialog(): void {
        if (this.whatIf.column && this.whatIf.operator && this.whatIf.value && this.whatIf.display_name) {
            const whatIfColumn = _.cloneDeep(this.whatIf.column);
            whatIfColumn.whatif_column = true;
            whatIfColumn.whatif = {
                operator: this.whatIf.operator,
                value: this.whatIf.value,
                origin: this.whatIf.column
            };

            whatIfColumn.display_name.default = this.whatIf.display_name;


            this.currentQuery.push(whatIfColumn);
            this.whatIf = {};
            this.display = false;
            this.close.emit();
        }
    }

    public onCloseWhatIfDialog(): void {
        this.whatIf = {};
        this.display = false;
        this.close.emit();
    }

}