import { Component, OnInit } from '@angular/core';
import { SettingsService, StyleProviderService } from '@eda/services/service.index';

declare function init_plugins();

@Component({
    selector: 'app-pages',
    templateUrl: './pages.component.html',
    styleUrls: ['./pages.component.css']
})
export class PagesComponent implements OnInit {

    backgroundColor : string 

    constructor(private settingSerive: SettingsService, private styleProviderService : StyleProviderService) {

        this.styleProviderService.pageBackground.subscribe((backgroundColor)=>{
            this.backgroundColor = backgroundColor;
        })

    }

    ngOnInit(): void {
        this.settingSerive.loadingSettings();
        init_plugins();
    }

}
