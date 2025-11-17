import {AfterViewInit, Component, EventEmitter, Input, Output, ViewChild, ViewEncapsulation} from '@angular/core';
import {EdaContextMenu} from '@eda/shared/components/eda-context-menu/eda-context-menu';
import {Dialog} from 'primeng/dialog';

@Component({
    selector: 'eda-context-menu',
    templateUrl: './eda-context-menu.component.html',
    encapsulation: ViewEncapsulation.None
})
export class EdaContextMenuComponent implements AfterViewInit {
    @Input() inject: EdaContextMenu;
    @Output() close = new EventEmitter<void>();
    
    @ViewChild('dialog') dialog: Dialog;

    private allowOutsideClose = false;

    ngAfterViewInit() {
        this.inject.dialog = this.dialog;
    }

    onOutsideClick(event: MouseEvent, dialog: any) {
        const dialogEl = dialog?.container || dialog?.containerViewChild?.nativeElement;

        if (!dialogEl) {
            return;
        }

        // Ignorar mientras no esté permitido
        if (!this.allowOutsideClose) {
            this.allowOutsideClose = true;
            return;
        }

        const isOutside = !dialogEl.contains(event.target as Node);

        if (isOutside && this.allowOutsideClose) {
            this.allowOutsideClose = false;
            this.close.emit();
        }
    }
}
