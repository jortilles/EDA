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
    @ViewChild('dialog') dialog: Dialog;

    constructor() {
    }

    private allowOutsideClose = false;
    private ignoreNextClick = false;
    
    ngAfterViewInit() {
        this.inject.dialog = this.dialog;
    }

    onOutsideClick(event: MouseEvent, dialog: any) {
        const dialogEl = dialog?.container || dialog?.containerViewChild?.nativeElement;
        if (!dialogEl) return;

        // Si el diálogo aún no está visible, no hacemos nada
        if (!this.inject.display) return;

        // Ignorar mientras no esté permitido
        if (!this.allowOutsideClose) {
            this.allowOutsideClose = true;
            return;
        }

        const isOutside = !dialogEl.contains(event.target as Node);

        if (isOutside && this.allowOutsideClose) {
            this.allowOutsideClose = false;
            this.inject.hideContextMenu();
        }
    }

    showContextMenu() {
        this.inject.display = true;

        // Espera un poco antes de permitir cerrar por clic fuera
        setTimeout(() => {
            this.allowOutsideClose = true;
        }, 1000);
    }

    hideContextMenu() {
        this.inject.display = false;
        this.allowOutsideClose = false; // Resetea al cerrar
    }

}
