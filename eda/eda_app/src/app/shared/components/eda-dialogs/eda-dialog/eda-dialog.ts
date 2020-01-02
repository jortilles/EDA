import {Dialog} from 'primeng/dialog';

export enum EdaDialogCloseEvent {
    NONE,
    UPDATE,
    NEW,
    DELETE,
}

export class EdaDialog {
    title: string;
    dialog: Dialog;
    closable: boolean = false;
    show: () => void = () => {};
    hide: () => void = () => {};

    constructor(init: Partial<EdaDialog>) {
        Object.assign(this, init);
        // this.page.dialog = true;
    }

    setTitle(title: string) {
        // this.page.setTitle(title);
    }

    center() {
        this.dialog.center();
    }
}
