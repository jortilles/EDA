
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EdaDialog2Component } from '@eda/shared/components/eda-dialogs/eda-dialog2/eda-dialog2.component';

export interface ReferenceColumn {
    table_name: string;
    column_name: string;
    display_name: string;
}

export interface PredictionConfig {
    method: string;
    steps: number;
    arimaParams?: { p: number; d: number; q: number };
    tensorflowParams?: { epochs: number; lookback: number; learningRate: number; referenceColumns?: ReferenceColumn[] };
}

@Component({
    standalone: true,
    selector: 'app-prediction-dialog',
    templateUrl: './prediction-dialog.component.html',
    imports: [CommonModule, FormsModule, EdaDialog2Component]
})
export class PredictionDialogComponent {

    @Input() visible: boolean = false;
    @Input() predictionMethod;
    @Input() modelTables: any[] = [];

    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() confirm = new EventEmitter<PredictionConfig>();
    @Output() cancel = new EventEmitter<void>();

    public selectedMethod: string;

    // setup de configuración inicial
    public steps: number = 3;
    public advancedConfig: boolean = false;

    public arimaParams = { p: 1, d: 1, q: 1 };
    public tensorflowParams = { epochs: 50, lookback: 10, learningRate: 0.001 };

    // Reference columns - add pattern
    public showReferenceColumns: boolean = false;
    public referenceColumns: ReferenceColumn[] = [];
    public selectedTable: string = '';
    public selectedColumn: string = '';
    public availableColumns: any[] = [];

    onTableChange() {
        this.selectedColumn = '';
        const table = this.modelTables.find(t => t.table_name === this.selectedTable);
        this.availableColumns = table
            ? table.columns.filter(c => c.visible !== false && c.column_type === 'numeric'): [];
    }

    addReferenceColumn() {
        if (!this.selectedTable || !this.selectedColumn) return;

        // Evitar duplicados
        const exists = this.referenceColumns.some(
            rc => rc.table_name === this.selectedTable && rc.column_name === this.selectedColumn
        );
        if (exists) return;

        const col = this.availableColumns.find(c => c.column_name === this.selectedColumn);
        this.referenceColumns.push({
            table_name: this.selectedTable,
            column_name: this.selectedColumn,
            display_name: col?.display_name?.default || this.selectedColumn,
        });

        // Reset selección
        this.selectedColumn = '';
    }

    removeReferenceColumn(index: number) {
        this.referenceColumns.splice(index, 1);
    }

    getTableDisplayName(tableName: string): string {
        const table = this.modelTables.find(t => t.table_name === tableName);
        return table?.display_name?.default || tableName;
    }

    onConfirm() {
        const config: PredictionConfig = {
            method: this.selectedMethod,
            steps: this.steps,
        };
        if (this.selectedMethod === 'Arima') {
            if (this.advancedConfig) {
                config.arimaParams = { ...this.arimaParams };
            }
        } else if (this.selectedMethod === 'Tensorflow') {
            const tfParams: any = this.advancedConfig
                ? { ...this.tensorflowParams }
                : {};
            if (this.referenceColumns.length > 0) {
                tfParams.referenceColumns = [...this.referenceColumns];
            }
            if (Object.keys(tfParams).length > 0) {
                config.tensorflowParams = tfParams;
            }
        }
        this.confirm.emit(config);
        this.closeDialog();
    }

    onCancel() {
        this.cancel.emit();
        this.closeDialog();
    }

    private closeDialog() {
        this.visible = false;
        this.visibleChange.emit(false);
    }
}
