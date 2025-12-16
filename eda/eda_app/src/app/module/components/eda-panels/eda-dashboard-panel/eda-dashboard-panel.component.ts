import { Component, OnInit, Input} from '@angular/core';
import { FormsModule } from '@angular/forms'; 
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';

@Component({
    standalone: true,
    selector: 'eda-dashboard-panel',
    templateUrl: './eda-dashboard-panel.component.html',
    styleUrls: [],
    imports: [FormsModule, CommonModule, CardModule]
})

export class EdaDashboardPanelComponent implements OnInit {
    @Input() header: string;

    constructor() { }

    ngOnInit() { }

}
