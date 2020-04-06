import { Directive, HostListener } from '@angular/core';
import { AlertService } from '@eda/services/service.index';

@Directive({
    selector: '[blockCopyPaste]'
})
export class BlockCopyPaste {

    constructor(private alertService: AlertService) { }

    @HostListener('copy', ['$event']) blockCopy(e: KeyboardEvent) {
        this.alertService.addWarning(`Esta contraseña no se puede copiar`);
        // e.preventDefault();
    }

    @HostListener('cut', ['$event']) blockCut(e: KeyboardEvent) {
        // e.preventDefault();
    }

}