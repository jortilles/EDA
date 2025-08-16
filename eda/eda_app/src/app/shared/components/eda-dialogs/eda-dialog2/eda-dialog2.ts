import { Directive, EventEmitter, Input, Output } from "@angular/core";


@Directive()
export abstract class EdaDialog2 {
    @Input() display: boolean = false;
    @Input() header: string;
    @Input() width: string = '50vw';
    @Input() height: string = '60vh';

    @Input() breakpoints: Record<string, string> = {
        xl: '60vw',
        lg: '70vw',
        md: '80vw',
        sm: '90vw',
    };

    @Output() apply: EventEmitter<any> = new EventEmitter();
    @Output() close: EventEmitter<any> = new EventEmitter();


    @Input() showApply: boolean = true;
    @Input() showClose: boolean = true;
    @Input() disableApply: boolean = false;

    // Mapa estándar de siglas a píxeles
    protected sizeMap: Record<string, string> = {
        xl: '1280px',
        lg: '1024px',
        md: '768px',
        sm: '480px',
    };

    constructor() { }

    public onApply(): void {
        this.apply.emit(true);
    }

    public onClose(): void {
        this.close.emit(false);
    }

}