import { Component, OnInit, Input } from '@angular/core';

@Component({
    selector: 'eda-dashboard-panel',
    templateUrl: './eda-dashboard-panel.component.html',
    styleUrls: []
})

export class EdaDashboardPanelComponent implements OnInit {
    @Input() header: string;

    constructor() { }

    ngOnInit() { }

}
