import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { RouterModule } from "@angular/router";
import { MainLeftSidebarComponent } from "./components/main-left-sidebar/main-left-sidebar";

@Component({
    selector: 'app-v2-pages',
    templateUrl: './pages-v2.html',
    standalone: true,
    imports: [CommonModule, RouterModule, MainLeftSidebarComponent],
})
export class PagesV2Component implements OnInit {
    backgroundColor: string
    panelMode: boolean = false;

    // private route: ActivatedRoute,
    // private settingSerive: SettingsService,
    // private styleProviderService: StyleProviderService
    constructor() {

        // this.styleProviderService.pageBackground.subscribe((backgroundColor) => {
        //     this.backgroundColor = backgroundColor;
        // })

    }

    ngOnInit(): void {
        // this.settingSerive.loadingSettings();
        // this.getPanelMode();
        // init_plugins();
    }
}
