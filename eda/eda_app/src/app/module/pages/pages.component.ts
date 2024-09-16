import { Component, OnInit } from '@angular/core';
import { SettingsService, StyleProviderService } from '@eda/services/service.index';
import { ActivatedRoute, Router } from '@angular/router';

declare function init_plugins();

@Component({
    selector: 'app-pages',
    templateUrl: './pages.component.html',
    styleUrls: ['./pages.component.css']
})
export class PagesComponent implements OnInit {

    backgroundColor : string
    panelMode: boolean = false;

    constructor( private router: Router,
        private route: ActivatedRoute,
        private settingSerive: SettingsService,
        private styleProviderService : StyleProviderService) {

        this.styleProviderService.pageBackground.subscribe((backgroundColor)=>{
            this.backgroundColor = backgroundColor;
        })

    }

    ngOnInit(): void {
        this.settingSerive.loadingSettings();
        this.getPanelMode();
        init_plugins();
    }


    private getPanelMode(): void {

        this.route.queryParams.subscribe(params => {
            try{
                    if(params['panelMode'] == 'true'){
                        this.panelMode =true; // en mode panel es mostra nomel els panells
                    }
            }catch(e){
            }
        });
    }

}
