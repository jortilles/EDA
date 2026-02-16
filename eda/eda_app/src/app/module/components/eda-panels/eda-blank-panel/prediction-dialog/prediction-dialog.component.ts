
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';

@Component({
    standalone: true,
    selector: 'app-prediction-dialog',
    templateUrl: './prediction-dialog.component.html',
    imports: [CommonModule, FormsModule, DialogModule]
})
export class PredictionDialogComponent implements OnInit {

    @Input() visible: boolean = false;
    @Input() predictionMethod: string = 'Arima';

    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() confirm = new EventEmitter<string>();
    @Output() cancel = new EventEmitter<void>();

    public selectedMethod: string = 'Arima';

    ngOnInit(): void {
        this.selectedMethod = this.predictionMethod;
    }

    onConfirm() {
        this.confirm.emit(this.selectedMethod);
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
