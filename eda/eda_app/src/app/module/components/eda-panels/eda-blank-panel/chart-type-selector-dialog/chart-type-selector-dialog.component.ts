import { Component, Input} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { EbpUtils } from '../panel-utils/ebp-utils';
import { EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';

@Component({
    standalone: true,
    selector: 'app-chart-type-selector-dialog',
    templateUrl: './chart-type-selector-dialog.component.html',
    styleUrls: ['./chart-type-selector-dialog.component.css'],
    imports: [CommonModule, DialogModule],
})
export class ChartTypeSelectorDialogComponent {
    @Input() controller: any;

    visible = true;

    get chartTypes() {
        return (this.controller?.params?.chartTypes || []).filter((ct: any) => !ct.ngIf && !ct.tooManyData && ct.subValue !== 'tableanalized');
    }

    getOptionIcon(subValue: string): string {
        return EbpUtils.getOptionIcon(subValue);
    }

    select(ct: any) {
        this.visible = false;
        this.controller.close(EdaDialogCloseEvent.UPDATE, ct);
    }

    onHide() {
        this.controller.close(EdaDialogCloseEvent.NONE);
    }
}
