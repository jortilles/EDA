import { Component, inject, OnInit } from '@angular/core';
import { AsyncPipe, DatePipe, NgClass, NgTemplateOutlet } from '@angular/common';
import { IconComponent } from '@eda/shared/components/icon/icon.component';
import { ReportService } from '@eda/services/api/report.service';

@Component({
    selector: 'app-v2-home-page',
    standalone: true,
    imports: [DatePipe, AsyncPipe, NgTemplateOutlet, IconComponent],
    templateUrl: './home.page.html'
})
export class HomePageV2 implements OnInit {
    private reportService = inject(ReportService);

    publicReports$ = this.reportService.getPublicReports();
    privateReports$ = this.reportService.getPrivateReports();
    roleReports$ = this.reportService.getRoleReports();
    sharedReports$ = this.reportService.getSharedReports();

    activeFilters: string[] = ['Veure tots', 'Ajuntament'];

    constructor() { }

    ngOnInit(): void {}

    private async loadReports() {

        // const res = await lastValueFrom(this.dashboardService.getDashboards())
    }
}