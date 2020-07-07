import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { EdaKpi } from './eda-kpi';
import es from '@angular/common/locales/es';

@Component({
    selector: 'eda-kpi',
    templateUrl: './eda-kpi.component.html'
})

export class EdaKpiComponent implements OnInit {
    @Input() inject: EdaKpi;
    @Output() onNotify: EventEmitter<any> = new EventEmitter();

    sufixClick: boolean = false;

    constructor() { }

    ngOnInit() {
        registerLocaleData( es );
    }

    setSufix(): void {
        this.sufixClick = !this.sufixClick;
        this.onNotify.emit({sufix : this.inject.sufix})
    }

}
