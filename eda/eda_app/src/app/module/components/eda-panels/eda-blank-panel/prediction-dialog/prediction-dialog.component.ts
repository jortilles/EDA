
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EdaDialog2Component } from '@eda/shared/components/eda-dialogs/eda-dialog2/eda-dialog2.component';

/** Columna de referencia para predicción multivariante con TensorFlow */
export interface ReferenceColumn {
    table_name: string;
    column_name: string;
    display_name: string;
}

/**
 * Objeto de configuración que se emite al confirmar y que viaja
 * hasta el backend dentro de query.predictionConfig
 */
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
    /** Método activo en el panel (viene de chart-dialog para pre-seleccionarlo) */
    @Input() predictionMethod;
    /** Tablas del modelo de datos, usadas para elegir columnas de referencia (TF multivariante) */
    @Input() modelTables: any[] = [];

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

    // Columnas de referencia para TensorFlow multivariante
    public showReferenceColumns: boolean = false;
    public referenceColumns: ReferenceColumn[] = [];
    public selectedTable: string = '';
    public selectedColumn: string = '';
    /** Columnas numéricas disponibles según la tabla seleccionada */
    public availableColumns: any[] = [];

    /** Al cambiar tabla, recarga las columnas numéricas visibles de esa tabla */
    onTableChange() {
        this.selectedColumn = '';
        const table = this.modelTables.find(t => t.table_name === this.selectedTable);
        this.availableColumns = table
            ? table.columns.filter(c => c.visible !== false && c.column_type === 'numeric'): [];
    }

    /** Añade la columna seleccionada a la lista de referencias (evita duplicados) */
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

    /**
     * Construye el PredictionConfig y lo emite hacia chart-dialog.
     * Solo incluye arimaParams o tensorflowParams si están activos.
     */
    onConfirm() {
        const config: PredictionConfig = {
            method: this.selectedMethod,
            steps: this.steps,
        };

        if (this.selectedMethod === 'Arima') {
            // Parámetros manuales p/d/q solo si el usuario activó la config avanzada
            if (this.advancedConfig) {
                config.arimaParams = { ...this.arimaParams };
            }
        } else if (this.selectedMethod === 'Tensorflow') {
            // Incluir epochs/lookback/learningRate si hay config avanzada
            const tfParams: any = this.advancedConfig
                ? { ...this.tensorflowParams }
                : {};
            // Incluir columnas de referencia si se añadieron (predicción multivariante)
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
