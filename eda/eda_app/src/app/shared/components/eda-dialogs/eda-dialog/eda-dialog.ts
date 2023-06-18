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
    draggable: boolean = true;
    style: any = {width: '80%', height: '70%', top: '93px', left: '205px'};
    show: () => void = () => {};
    hide: () => void = () => {};

    constructor(init: Partial<EdaDialog>) {
        Object.assign(this, init);
        // this.page.dialog = true;
    }

    setTitle(title: string) {
        this.title = title;
    }

    center() {
        this.dialog.center();
    }
}
