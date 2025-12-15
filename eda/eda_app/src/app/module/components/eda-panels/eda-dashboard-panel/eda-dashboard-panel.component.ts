import { Component, OnInit, Input, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms'; 
import { CommonModule } from '@angular/common';


@Component({
    standalone: true,
    selector: 'eda-dashboard-panel',
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    templateUrl: './eda-dashboard-panel.component.html',
    styleUrls: [],
    imports: [FormsModule, CommonModule]
})

export class EdaDashboardPanelComponent implements OnInit {
    @Input() header: string;

    constructor() { }

    ngOnInit() { }

}
