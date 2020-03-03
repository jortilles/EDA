import {AfterViewInit, Component, Input, ViewChild, ViewEncapsulation} from '@angular/core';
import {EdaContextMenu} from '@eda/shared/components/eda-context-menu/eda-context-menu';
import {Dialog} from 'primeng/dialog';

@Component({
    selector: 'eda-context-menu',
    templateUrl: './eda-context-menu.component.html',
    encapsulation: ViewEncapsulation.None
})

export class EdaContextMenuComponent implements AfterViewInit {
    @Input() inject: EdaContextMenu;
    @ViewChild('dialog', {static: false}) dialog: Dialog;

    constructor() {
    }

    ngAfterViewInit() {
        this.inject.dialog = this.dialog;
    }

}
