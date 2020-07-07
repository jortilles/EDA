import { NgModel } from '@angular/forms';
import { ElementRef } from '@angular/core';

export abstract class EdaInput {
    id: string;
    icon: string;
    label: string;
    name: string;
    type: string;
    required: boolean;
    ngModel: string;
    divClass: string = '';
    inputClass: string = '';
    disabled: boolean = false;
    readonly: boolean = false;
    showLabel: boolean = true;
    _model: NgModel;
    public elementRef: ElementRef;
    onChange: (event: any) => void = () => {};
    onKeyUp: (event: any) => void = () => {};
    onFocusOut: (event?: any) => void = () => {};

    protected constructor(ngModel: any) {
        this.ngModel = ngModel;
    }

    abstract reset(): void; 
}