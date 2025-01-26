import {Component, CUSTOM_ELEMENTS_SCHEMA} from '@angular/core';
import {EdaDialog, EdaDialogCloseEvent, EdaDialogAbstract} from '@eda/shared/components/shared-components.index';
import { CoreModule } from 'app/core/core.module';
import { PrimengModule } from 'app/core/primeng.module';

@Component({
    selector: 'app-conditions',
    templateUrl: './conditions.component.html',
    standalone: true,
    imports: [CoreModule, PrimengModule],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})

export class ConditionsComponent extends EdaDialogAbstract {
    public dialog: EdaDialog;

    constructor() {
        super();
        this.dialog = new EdaDialog({
            show: () => this.onShow(),
            hide: () => this.onClose(EdaDialogCloseEvent.NONE),
            title: 'Términos y Condiciones'
        });
    }

    onShow() {
    }

    closeDialog() {
        this.onClose(EdaDialogCloseEvent.NONE);
    }

    onClose(event: EdaDialogCloseEvent, response?: any) {
        return this.controller.close(event);
    }
}
