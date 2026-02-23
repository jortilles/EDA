import { Directive, EventEmitter, Input, Output } from "@angular/core";

@Directive()
export abstract class EdaDialog2 {
    @Input() display: boolean = false;
    @Input() header: string;
    @Input() width: string = '50vw';
    @Input() height: string = '60vh';

    @Input() breakpoints: Record<string, string> = {
        lg: '90vw',
        md: '90vw',
        sm: '90vw',
    };

    @Output() apply: EventEmitter<any> = new EventEmitter();
    @Output() close: EventEmitter<any> = new EventEmitter();
    @Output() delete: EventEmitter<any> = new EventEmitter();
    @Output() reset: EventEmitter<any> = new EventEmitter();
    @Output() duplicate: EventEmitter<any> = new EventEmitter();
    @Output() notstyles: EventEmitter<any> = new EventEmitter();
    @Output() nextstep: EventEmitter<any> = new EventEmitter();


    @Input() showApply: boolean = true;
    @Input() showClose: boolean = true;
    @Input() showReset: boolean = false;
    @Input() showDuplicate: boolean = false;
    @Input() showNotStyles: boolean = false;
    @Input() showDelete: boolean = false;
    @Input() disableApply: boolean = false;
    @Input() showNextStep: boolean = false;
    @Input() disableNextStep: boolean = false;

    // Mapa estándar de siglas a píxeles
    protected sizeMap: Record<string, string> = {
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
    public onReset(): void {
        this.reset.emit(true);
    }
    public onDuplicate(): void {
        this.duplicate.emit(true);
    }
    public onDelete(): void {
        this.delete.emit(true);
    }
    public onNotStyles(): void {
        this.notstyles.emit(true);
    }
    public onNextStep(): void {
        this.nextstep.emit(true);
    }
}