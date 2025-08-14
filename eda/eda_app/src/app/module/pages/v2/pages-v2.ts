import { CommonModule } from "@angular/common";
import { Component, inject, OnInit } from "@angular/core";
import { Router, RouterModule } from "@angular/router";
import { MainLeftSidebarComponent } from "./components/main-left-sidebar/main-left-sidebar";
import { CreateDashboardService } from "@eda/services/utils/create-dashboard.service";
import { CreateDashboardComponent } from "@eda/shared/components/create-dashboard/create-dashboard.component";
import { StyleProviderService} from '@eda/services/service.index';
import { Subscription } from "rxjs";

@Component({
    selector: 'app-v2-pages',
    templateUrl: './pages-v2.html',
    standalone: true,
    imports: [CommonModule, RouterModule, MainLeftSidebarComponent, CreateDashboardComponent],
})
export class PagesV2Component implements OnInit {
    private router = inject(Router);
    public createDashboardService = inject(CreateDashboardService);
    public styleProviderService = inject(StyleProviderService);
    backgroundColor: string
    panelMode: boolean = false;
    bgColor: string = '';
    private bgSub?: Subscription;
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
        this.bgSub = this.styleProviderService.pageBackground.subscribe(value => {
          this.bgColor = value;
        });
    }

    ngOnDestroy() {
        this.bgSub?.unsubscribe();
    }

    onCloseCreateDashboard(event: any) {
        if (event) this.router.navigate(['/v2/dashboard', event._id]);
    }
}
