import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { EdaDialog2 } from './eda-dialog2';

@Component({
    selector: 'eda-dialog2',
    templateUrl: './eda-dialog2.component.html'
})
export class EdaDialog2Component extends EdaDialog2 implements OnInit, OnDestroy {
    public ifShowApply: boolean;
    public ifShowClose: boolean;
    constructor() {
        super();
    }

    public ngOnInit(): void {
        this.display = true;

        this.ifShowApply = this.apply.observers.length > 0 && this.showApply;
        this.ifShowClose = this.close.observers.length > 0 && this.showClose;
    }

    public ngOnDestroy(): void {
        this.display = false;
    }

}