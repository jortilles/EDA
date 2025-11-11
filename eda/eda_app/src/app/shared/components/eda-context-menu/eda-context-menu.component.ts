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
        console.log('---------------------------------------');
        console.log('DEBUG: onOutsideClick triggered');

        const dialogEl = dialog?.container || dialog?.containerViewChild?.nativeElement;
        console.log('DEBUG: dialogEl =', dialogEl);

        if (!dialogEl) {
            console.log('DEBUG: dialog element not found, exiting');
            return;
        }

        // Si el diálogo aún no está visible, no hacemos nada
        console.log('DEBUG: inject.display =', this.inject.display);
        if (!this.inject.display) {
            console.log('DEBUG: dialog not visible, exiting');
            return;
        }

        // Ignorar mientras no esté permitido
        console.log('DEBUG: allowOutsideClose =', this.allowOutsideClose);
        if (!this.allowOutsideClose) {
            console.log('DEBUG: first click ignored, setting allowOutsideClose = true');
            this.allowOutsideClose = true;
            return;
        }

        const isOutside = !dialogEl.contains(event.target as Node);
        console.log('DEBUG: isOutside =', isOutside);
        console.log('DEBUG: event.target =', event.target);

        if (isOutside && this.allowOutsideClose) {
            console.log('DEBUG: clicked outside, closing context menu');
            this.allowOutsideClose = false;
            this.inject.hideContextMenu();
        } else {
            console.log('DEBUG: click ignored (inside dialog or flag false)');
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
