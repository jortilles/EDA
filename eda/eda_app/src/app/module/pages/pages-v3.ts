import { CommonModule } from "@angular/common";
import { Component, inject, OnInit } from "@angular/core";
import { Router, RouterModule } from "@angular/router";
import { MainLeftSidebarComponent } from "@eda/components/main-left-sidebar/main-left-sidebar";
import { CreateDashboardService } from "@eda/services/utils/create-dashboard.service";
import { CreateDashboardComponent } from "@eda/shared/components/create-dashboard/create-dashboard.component";
import { StyleProviderService} from '@eda/services/service.index';
import { Subscription } from "rxjs";

@Component({
    selector: 'app-v3-pages',
    templateUrl: './pages-v3.html',
    standalone: true,
    imports: [CommonModule, RouterModule, MainLeftSidebarComponent, CreateDashboardComponent],
})
export class PagesV3Component implements OnInit {
    private router = inject(Router);
    public createDashboardService = inject(CreateDashboardService);
    public styleProviderService = inject(StyleProviderService);
    backgroundColor: string
    panelMode: boolean = false;
    bgColor: string = '';
    private bgSub?: Subscription;

    constructor(router: Router) {
        // Disabling route reuse so the page reloads even when only a URL parameter changes
        router.routeReuseStrategy.shouldReuseRoute = () => false;
    }


    ngOnInit(): void {
        this.bgSub = this.styleProviderService.pageBackground.subscribe(value => {
          this.bgColor = value;
        });
    }

    ngOnDestroy() {
        this.bgSub?.unsubscribe();
    }

    onCloseCreateDashboard(event: any) {
        if (event) this.router.navigate(['/dashboard', event._id]);
    }
}
