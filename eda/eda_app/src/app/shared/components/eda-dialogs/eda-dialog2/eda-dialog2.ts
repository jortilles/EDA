import { Directive, EventEmitter, Input, Output } from "@angular/core";


@Directive()
export abstract class EdaDialog2 {
    @Input() display: boolean = false;
    @Input() header: string;
    @Input() width: string = '50vw';
    @Input() height: string = '60vh';

    @Output() apply: EventEmitter<any> = new EventEmitter();
    @Output() close: EventEmitter<any> = new EventEmitter();


    @Input() showApply: boolean = true;
    @Input() showClose: boolean = true;
    @Input() disableApply: boolean = false;

    constructor() { }

    public onApply(): void {
        this.apply.emit(true);
    }

    public onClose(): void {
        this.close.emit(false);
    }
    
}