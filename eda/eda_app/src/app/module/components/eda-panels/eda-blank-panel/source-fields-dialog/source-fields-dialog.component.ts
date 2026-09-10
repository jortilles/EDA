import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import { EdaDialog2Component } from '@eda/shared/components/eda-dialogs/eda-dialog2/eda-dialog2.component';

@Component({
    standalone: true,
    selector: 'app-source-fields-dialog',
    templateUrl: './source-fields-dialog.component.html',
    styleUrls: ['./source-fields-dialog.component.css'],
    imports: [CommonModule, TableModule, EdaDialog2Component],
})
export class SourceFieldsDialogComponent {
    @Input() controller: any;

    visible = true;

    get header(): string {
        const panelTitle = this.controller?.params?.panelTitle || '';
        return $localize`:@@sourceFieldsDialogHeader:Campos de origen para ${panelTitle}`;
    }

    get headers(): string[] {
        return this.controller?.params?.headers || [];
    }

    get rows(): any[][] {
        return this.controller?.params?.rows || [];
    }

    onHide() {
        this.controller.close(EdaDialogCloseEvent.NONE);
    }
}
