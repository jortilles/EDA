import {AfterViewInit, Component, EventEmitter, Input, Output, ViewChild, ViewEncapsulation} from '@angular/core';
import {EdaContextMenu} from '@eda/shared/components/eda-context-menu/eda-context-menu';
import {Dialog} from 'primeng/dialog';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog'; 
import { PanelMenuModule } from 'primeng/panelmenu';
@Component({
    standalone: true,
    selector: 'eda-context-menu',
    templateUrl: './eda-context-menu.component.html',
    encapsulation: ViewEncapsulation.None,
    imports: [CommonModule, DialogModule, PanelMenuModule],
})
export class EdaContextMenuComponent implements AfterViewInit {
    @Input() inject: EdaContextMenu;
    @Output() close = new EventEmitter<void>();
    
    @ViewChild('dialog') dialog: Dialog;

    public allowOutsideClose;

    ngAfterViewInit() {
        this.inject.dialog = this.dialog;
    }

    onOutsideClick(event: MouseEvent, dialog: any) {
        const dialogEl = dialog?.container || dialog?.containerViewChild?.nativeElement;

        // Exit if the dialog is not clicked
        if (!dialogEl) {
            return;
        }

        // Ignore while not allowed
        if (!this.allowOutsideClose) {
            this.allowOutsideClose = true;
            return;
        }

        const isOutside = !dialogEl.contains(event.target as Node);

        if (isOutside) {
            this.close.emit();
        }
    }
}
