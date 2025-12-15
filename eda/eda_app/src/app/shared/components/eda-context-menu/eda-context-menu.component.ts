import {AfterViewInit, Component, CUSTOM_ELEMENTS_SCHEMA, EventEmitter, Input, Output, ViewChild, ViewEncapsulation} from '@angular/core';
import {EdaContextMenu} from '@eda/shared/components/eda-context-menu/eda-context-menu';
import {Dialog} from 'primeng/dialog';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';  // <--- esto es clave
import { PanelMenuModule } from 'primeng/panelmenu'; // <--- IMPORTAR ESTO

@Component({
    standalone: true,
    selector: 'eda-context-menu',
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
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

        // Si no se clicka en el diálogo, salir
        if (!dialogEl) {
            return;
        }

        // Ignorar mientras no esté permitido
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
