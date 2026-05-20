import { Component, Input} from '@angular/core';
import { CommonModule } from '@angular/common';
import { EbpUtils } from '../panel-utils/ebp-utils';
import { EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import { EdaDialog2Component } from '@eda/shared/components/eda-dialogs/eda-dialog2/eda-dialog2.component';

@Component({
    standalone: true,
    selector: 'app-chart-type-selector-dialog',
    templateUrl: './chart-type-selector-dialog.component.html',
    styleUrls: ['./chart-type-selector-dialog.component.css'],
    imports: [CommonModule, EdaDialog2Component],
})
export class ChartTypeSelectorDialogComponent {
    @Input() controller: any;

    visible = true;

    get chartTypes() {
        return (this.controller?.params?.chartTypes || []).filter((ct: any) => !ct.ngIf && !ct.tooManyData &&  !(['tableanalized', 'treetable'].includes(ct.subValue)));
    }

    getOptionIcon(subValue: string): string {
        return EbpUtils.getOptionIcon(subValue);
    }

    select(ct: any) {
        this.controller.close(EdaDialogCloseEvent.UPDATE, ct);
    }

    onHide() {
        this.controller.close(EdaDialogCloseEvent.NONE);
    }
}
