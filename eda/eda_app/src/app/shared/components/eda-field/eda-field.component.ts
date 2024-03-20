import { Component, Input, OnInit } from '@angular/core';

@Component({
    selector: 'eda-field',
    templateUrl: './eda-field.component.html',
    styles: [`
        .edaFieldLabel {
           text-align: right;
        }
    `]
})
export class EdaFieldComponent implements OnInit {
    @Input() customClass: any;
    @Input() label: string = '';
    @Input() cols: string = '';
    @Input() labelCols: string = '';
    @Input() viewMode: 'vertical' | 'horizontal' = 'vertical';

    constructor() { }

    ngOnInit(): void {
        if (this.viewMode == 'vertical') {
            this.cols = this.cols || 'col-sm-7 col-md-9 col-lg-12';
            this.labelCols = this.labelCols || 'col-sm-5 col-md-3 col-lg-12';
        } else {
            this.cols = this.cols || 'col-sm-10';
            this.labelCols = this.labelCols || 'col-sm-2';
        }
    }

}
