import { Component, OnInit } from '@angular/core';
import { SettingsService } from '@eda_services/service.index';

declare function init_plugins();

@Component({
    selector: 'app-pages',
    templateUrl: './pages.component.html'
})
export class PagesComponent implements OnInit {

    constructor(private settingSerive: SettingsService) {

    }

    ngOnInit(): void {
        this.settingSerive.loadingSettings();
        init_plugins();
    }

}
