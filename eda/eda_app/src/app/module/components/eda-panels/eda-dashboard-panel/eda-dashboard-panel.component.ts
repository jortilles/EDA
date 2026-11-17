import { Component, OnInit, Input} from '@angular/core';
import { FormsModule } from '@angular/forms'; 

import { CardModule } from 'primeng/card';

@Component({
    standalone: true,
    selector: 'eda-dashboard-panel',
    templateUrl: './eda-dashboard-panel.component.html',
    styleUrls: [],
    imports: [FormsModule, CardModule]
})

export class EdaDashboardPanelComponent implements OnInit {
    @Input() header: string;

    constructor() { }

    ngOnInit() { }

}
