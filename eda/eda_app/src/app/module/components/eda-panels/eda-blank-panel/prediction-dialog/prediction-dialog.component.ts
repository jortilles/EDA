import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { EdaDialog2Component } from '@eda/shared/components/eda-dialogs/eda-dialog2/eda-dialog2.component';

/** Numeric column from the current query available to select as prediction target */
export interface QueryColumn {
    column_name: string;
    table_id: string;
    display_name: string;
}

/**
 * Configuration object emitted on confirm and sent to backend within query.predictionConfig
 */
export interface PredictionConfig {
    method: string;
    steps: number;
    targetColumn?: { column_name: string; table_id: string };
    arimaParams?: { p: number; d: number; q: number };
    tensorflowParams?: { epochs: number; lookback: number; learningRate: number };
}

@Component({
    standalone: true,
    selector: 'app-prediction-dialog',
    templateUrl: './prediction-dialog.component.html',
    imports: [CommonModule, FormsModule, DropdownModule, EdaDialog2Component]
})
export class PredictionDialogComponent {

    @Input() visible: boolean = false;
    /** Active method in the panel (comes from chart-dialog to pre-select it) */
    @Input() predictionMethod;
    /** Numeric columns from the current query to choose which one to predict */
    @Input() set queryColumns(cols: QueryColumn[]) {
        this._queryColumns = cols ?? [];
        if (!this._queryColumns.length) { this.targetColumn = null; return; }
        // Only update if the current selection is no longer in the new list
        const stillValid = this.targetColumn
            ? this._queryColumns.some(c => c.column_name === this.targetColumn!.column_name && c.table_id === this.targetColumn!.table_id)
            : false;
        if (!stillValid) this.targetColumn = this._queryColumns[0];
    }
    get queryColumns(): QueryColumn[] { return this._queryColumns; }
    private _queryColumns: QueryColumn[] = [];

    @Output() visibleChange = new EventEmitter<boolean>();
    /** Emits the PredictionConfig on confirm → picked up by chart-dialog.confirmPrediction() */
    @Output() confirm = new EventEmitter<PredictionConfig>();
    @Output() cancel = new EventEmitter<void>();

    public methodOptions = [
        { label: 'ARIMA', value: 'Arima' },
        { label: 'TensorFlow', value: 'Tensorflow' }
    ];

    public selectedMethod: string = 'None';
    // Basic parameters
    public steps: number = 3;
    public advancedConfig: boolean = false;

    // Advanced parameters for each method (only sent if advancedConfig = true)
    public arimaParams = { p: 1, d: 1, q: 1 };
    public tensorflowParams = { epochs: 50, lookback: 10, learningRate: 0.001 };

    /** Target column for TensorFlow (the one being predicted; the others will be automatic reference variables) */
    public targetColumn: QueryColumn | null = null;

    get isValid(): boolean {
        if (!this.selectedMethod || this.selectedMethod === 'None') return false;
        if (!this.steps || this.steps < 1) return false;
        if (!this.targetColumn) return false;
        if (this.advancedConfig) {
            if (this.selectedMethod === 'Arima') {
                if (this.arimaParams.p < 0 || this.arimaParams.d < 0 || this.arimaParams.q < 0) return false;
            } else if (this.selectedMethod === 'Tensorflow') {
                if (!this.tensorflowParams.epochs || this.tensorflowParams.epochs < 1) return false;
                if (!this.tensorflowParams.lookback || this.tensorflowParams.lookback < 1) return false;
                if (!this.tensorflowParams.learningRate || this.tensorflowParams.learningRate <= 0) return false;
            }
        }
        return true;
    }

    /**
     * Builds the PredictionConfig and emits it to chart-dialog.
     * Includes arimaParams or tensorflowParams only if they are active.
     */
    onConfirm() {
        const config: PredictionConfig = {
            method: this.selectedMethod,
            steps: this.steps,
        };

        // Target column — common to both methods
        if (this.targetColumn) {
            config.targetColumn = { column_name: this.targetColumn.column_name, table_id: this.targetColumn.table_id };
        }

        if (this.selectedMethod === 'Arima') {
            // Manual p/d/q parameters only if the user enabled advanced config
            if (this.advancedConfig) {
                config.arimaParams = { ...this.arimaParams };
            }
        } else if (this.selectedMethod === 'Tensorflow') {
            // Include epochs/lookback/learningRate if advanced config is enabled
            if (this.advancedConfig) {
                config.tensorflowParams = { ...this.tensorflowParams };
            }
        }

        this.confirm.emit(config);
        this.closeDialog();
    }

    compareColumns(a: QueryColumn | null, b: QueryColumn | null): boolean {
        if (!a || !b) return a === b;
        return a.column_name === b.column_name && a.table_id === b.table_id;
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