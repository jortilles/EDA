import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertService, DashboardService, SidebarService } from '@eda_services/service.index';
import { EdaDialogController, EdaDialogCloseEvent } from '@eda_shared/components/shared-components.index';
import Swal from 'sweetalert2';
import * as _ from 'lodash';
@Component({
    selector: 'app-home',
    templateUrl: './home.component.html'
})
export class HomeComponent implements OnInit {
    public dashController: EdaDialogController;
    public dashboards: any[];
    public dss: any[];

    constructor(private dashboardService: DashboardService,
                private sidebarService: SidebarService,
                private router: Router,
                private alertService: AlertService) {
        this.sidebarService.getDataSourceNames();
    }

    ngOnInit() {
        this.realoadDashboards();
        this.sidebarService.currentDatasources.subscribe(
            data =>  this.dss = data,
            err => this.alertService.addError(err)
        );
    }

    initDialog() {
        this.dashController = new EdaDialogController({
            params: {data_sources: this.dss},
            close: (event, response) => {

                if ( !_.isEqual(event, EdaDialogCloseEvent.NONE) ) {
                    this.realoadDashboards();
                    this.goToDashboard(response);
                }
                this.dashController = undefined;
            }
        });
    }

    deleteDashboard(dashboard) {
        Swal.fire({
            title: '¿Estas seguro?',
            text: `Estas a punto de borrar el dashboard ${dashboard.config.title}`,
            type: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Si, Eliminalo!'
        }).then(borrado => {
            if ( borrado.value ) {
                this.dashboardService.deleteDashboard(dashboard._id).subscribe(
                    () => {
                        Swal.fire('Eliminado!', 'Dashboard eliminado correctamente.', 'success');
                        this.realoadDashboards();
                    }, err => this.alertService.addError(err)
                );
            }
        });

    }

    realoadDashboards() {
        this.dashboardService.getDashboards().subscribe(
            res => this.dashboards = res.dashboard,
            err => this.alertService.addError(err)
        );
    }

    goToDashboard(dashboard) {
        if (dashboard) {
            this.router.navigate(['/dashboard', dashboard._id]);
        } else {
            this.alertService.addError('Ha ocurrido un error');
        }
    }

}
