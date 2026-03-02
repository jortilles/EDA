
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EdaDialog2Component } from '@eda/shared/components/eda-dialogs/eda-dialog2/eda-dialog2.component';

/** Columna numérica del query actual disponible para seleccionar como objetivo de predicción */
export interface QueryColumn {
    column_name: string;
    table_id: string;
    display_name: string;
}

/**
 * Objeto de configuración que se emite al confirmar y que viaja
 * hasta el backend dentro de query.predictionConfig
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
    imports: [CommonModule, FormsModule, EdaDialog2Component]
})
export class PredictionDialogComponent {

    @Input() visible: boolean = false;
    /** Método activo en el panel (viene de chart-dialog para pre-seleccionarlo) */
    @Input() predictionMethod;
    /** Columnas numéricas del query actual para elegir cuál predecir */
    @Input() set queryColumns(cols: QueryColumn[]) {
        this._queryColumns = cols ?? [];
        if (!this._queryColumns.length) { this.targetColumn = null; return; }
        // Solo actualizar si la selección actual ya no está en la nueva lista
        const stillValid = this.targetColumn
            ? this._queryColumns.some(c => c.column_name === this.targetColumn!.column_name && c.table_id === this.targetColumn!.table_id)
            : false;
        if (!stillValid) this.targetColumn = this._queryColumns[0];
    }
    get queryColumns(): QueryColumn[] { return this._queryColumns; }
    private _queryColumns: QueryColumn[] = [];

    @Output() visibleChange = new EventEmitter<boolean>();
    /** Emite el PredictionConfig al confirmar → lo recoge chart-dialog.confirmPrediction() */
    @Output() confirm = new EventEmitter<PredictionConfig>();
    @Output() cancel = new EventEmitter<void>();

    public selectedMethod: string = 'None';
    // Parámetros básicos
    public steps: number = 3;
    public advancedConfig: boolean = false;

    // Parámetros avanzados de cada método (solo se envían si advancedConfig = true)
    public arimaParams = { p: 1, d: 1, q: 1 };
    public tensorflowParams = { epochs: 50, lookback: 10, learningRate: 0.001 };

    /** Columna objetivo para TensorFlow (la que se predice; las demás serán referencias automáticas) */
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
     * Construye el PredictionConfig y lo emite hacia chart-dialog.
     * Solo incluye arimaParams o tensorflowParams si están activos.
     */
    onConfirm() {
        const config: PredictionConfig = {
            method: this.selectedMethod,
            steps: this.steps,
        };

        // Columna objetivo — común a ambos métodos
        if (this.targetColumn) {
            config.targetColumn = { column_name: this.targetColumn.column_name, table_id: this.targetColumn.table_id };
        }

        if (this.selectedMethod === 'Arima') {
            // Parámetros manuales p/d/q solo si el usuario activó la config avanzada
            if (this.advancedConfig) {
                config.arimaParams = { ...this.arimaParams };
            }
        } else if (this.selectedMethod === 'Tensorflow') {
            // Incluir epochs/lookback/learningRate si hay config avanzada
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
