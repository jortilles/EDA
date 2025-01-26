import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { SettingsService, StyleProviderService } from '@eda/services/service.index';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SidebarComponent } from '@eda/shared/components/shared-components.index';

declare function init_plugins();

@Component({
    selector: 'app-pages',
    templateUrl: './pages.component.html',
    styleUrls: ['./pages.component.css'],
    standalone: true,
    imports: [RouterModule, SidebarComponent],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class PagesComponent implements OnInit {

    backgroundColor : string
    panelMode: boolean = false;

    constructor(
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
