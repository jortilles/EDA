import { Component, Input, ViewChild, ElementRef, AfterViewInit, DoCheck } from "@angular/core";
import { NgModel } from '@angular/forms';
import { EdaInput } from './eda-input';
import { EdaInputText } from './eda-input-text';

@Component({
    selector: 'eda-input',
    templateUrl: './eda-input.component.html'
})

export class EdaInputComponent implements AfterViewInit, DoCheck {
    @Input() inject: EdaInput;
    @ViewChild('in') in: NgModel;
    @ViewChild('reference') elementRef: ElementRef;

    ngAfterViewInit() {
        this.inject._model = this.in;
        if (this.elementRef) {
            this.inject.elementRef = this.elementRef;
        }

    }

    ngDoCheck() {
        if (this.in) {
            this.inject._model = this.in;
        }
    }

    public _isEdaInputText(inject: EdaInput): boolean {
        return inject instanceof EdaInputText;
    }
}