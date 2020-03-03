import {Component} from '@angular/core';
import {EdaDialog, EdaDialogCloseEvent, EdaDialogAbstract} from '@eda/shared/components/shared-components.index';

@Component({
    selector: 'app-conditions',
    templateUrl: './conditions.component.html'
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
