import { Component, OnInit } from '@angular/core';
import { SettingsService } from '@eda/services/service.index';

declare function init_plugins();

@Component({
    selector: 'app-pages',
    templateUrl: './pages.component.html',
    styleUrls: ['./pages.component.css']
})
export class PagesComponent implements OnInit {

    constructor(private settingSerive: SettingsService) {

    }

    ngOnInit(): void {
        this.settingSerive.loadingSettings();
        init_plugins();
    }

}
