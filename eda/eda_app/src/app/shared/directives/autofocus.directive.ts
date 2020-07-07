import { Directive, ElementRef, OnInit } from '@angular/core';

@Directive({
    selector: '[autofocusOnShow]',
})
export class FocusOnShowDirective implements OnInit {

    constructor(private el: ElementRef) {
        if (!el.nativeElement['focus']) {
            throw new Error('Element does not accept focus.');
        }
    }

    ngOnInit(): void {
        const input: HTMLInputElement = this.el.nativeElement as HTMLInputElement;
        input.focus();
        input.select();
    }
}