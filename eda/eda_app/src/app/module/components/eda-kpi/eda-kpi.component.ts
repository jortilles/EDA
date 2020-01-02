import { Component, OnInit, Input } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import es from '@angular/common/locales/es';
import { EdaKpi } from './eda-kpi';

@Component({
    selector: 'eda-kpi',
    templateUrl: './eda-kpi.component.html'
})

export class EdaKpiComponent implements OnInit {
    @Input() inject: EdaKpi;

    constructor() { }

    ngOnInit() {
        registerLocaleData( es );
    }
}
