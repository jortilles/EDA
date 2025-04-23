import { CommonModule } from "@angular/common";
import { Component, inject, OnInit } from "@angular/core";
import { Router, RouterModule } from "@angular/router";
import { MainLeftSidebarComponent } from "./components/main-left-sidebar/main-left-sidebar";
import { CreateDashboardService } from "@eda/services/utils/create-dashboard.service";
import { CreateDashboardComponent } from "@eda/shared/components/create-dashboard/create-dashboard.component";

@Component({
    selector: 'app-v2-pages',
    templateUrl: './pages-v2.html',
    standalone: true,
    imports: [CommonModule, RouterModule, MainLeftSidebarComponent, CreateDashboardComponent],
})
export class PagesV2Component implements OnInit {
    private router = inject(Router);
    public createDashboardService = inject(CreateDashboardService);
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

    onCloseCreateDashboard(event: any) {
        if (event) this.router.navigate(['/v2/dashboard', event._id]);
    }
}
