import { DashboardService } from './../../../services/api/dashboard.service';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { User } from '@eda/models/model.index';
import { SidebarService, UserService, AlertService } from '@eda/services/service.index';
import { LogoSidebar } from '@eda/configs/index';
import Swal, { SweetAlertOptions } from 'sweetalert2';


@Component({
    selector: 'app-sidebar',
    templateUrl: './sidebar.component.html'
})
export class SidebarComponent implements OnInit {
    user: User;
    isAdmin: boolean;
    dataSourceMenu: any[] = [];
    edit_mode: boolean = true;
    mobileSize: boolean = false;
    sideBtn: boolean = false;
    logoSidebar: string;
    homeLink = '/home'

    constructor(
        public router: Router,
        public userService: UserService,
        public sidebarService: SidebarService,
        private alertService: AlertService,
        private dashboardService: DashboardService
    ) {
        this.logoSidebar = LogoSidebar;

        this.sidebarService.getToggleSideNav().subscribe((value) => {
            this.sideBtn = value;
        });

        this.getMobileSize();
        this.getDataSourcesNames();
    }

    ngOnInit(): void {
        this.user = this.userService.user;
        this.setEditMode()
        // Ens subscribim a l'observable currentDatasources que ha de tenir el valor actual dels noms dels datasources.
        this.sidebarService.currentDatasources.subscribe(
            data => this.dataSourceMenu = data,
            err => this.alertService.addError(err)
        );
    }

    getMobileSize(event?): void {
        if (!event) {
            if (window.innerWidth <= 767) {
                this.mobileSize = true;
                this.sideBtn = true;
                this.sidebarService.toggleSideNav = true;
            } else if (window.innerWidth > 767) {
                this.mobileSize = false;
                this.sidebarService.setManualHideSideNav(false);
            }
        } else {
            if (event.target.innerWidth <= 767) {
                this.mobileSize = true;
                this.sideBtn = true;
                this.sidebarService.toggleSideNav = true;
            } else if (event.target.innerWidth > 767) {
                this.mobileSize = false;
                this.sidebarService.toggleSideNav = false;
                this.sidebarService.setManualHideSideNav(false);
            }
        }
    }

    toggleClassSide(): void {
        this.sidebarService.setHideSideNav();
    }

    setEditMode(): void {
        const user = localStorage.getItem('user');
        const userName = JSON.parse(user).name;
        this.edit_mode = (userName !== 'edaanonim');
    }

    logout(): void {
        this.userService.logout();
    }

    getDataSourcesNames(): void {
        this.sidebarService.getDataSourceNames();
    }

    goToDataSource(datasource): void {
        if (datasource) {

            if (this.dashboardService._notSaved.value === false) {
                this.router.navigate(['/data-source/', datasource._id]);
            } else {
                this.dashboardService._notSaved.next(false);
                Swal.fire(
                    {
                        text: $localize`:@@NotSavedWarning:Hay cambios sin guardar. ¿Seguro que quieres salir?`,
                        icon: 'warning',
                        showDenyButton: true,
                        denyButtonText: $localize`:@@cancelarButton:Cancelar`,
                    }
                ).then((result) => {
                    if (result.isConfirmed) {
                        this.router.navigate(['/data-source/', datasource._id]);
                    }
                })
            }

        } else {
            this.alertService.addError('Ha ocurrido un error');
        }
    }

    ignoreNotSaved(){
        this.dashboardService._notSaved.next(false);
    }


    public redirectLocale(lan: string) {
        let baseUrl = window.location.href.split('#')[0];
        if (baseUrl.substr(-4) == '/es/' ||
            baseUrl.substr(-4) == '/ca/' ||
            baseUrl.substr(-4) == '/en/') {
            baseUrl = baseUrl.substr(0, baseUrl.length - 3)
        }
        switch (lan) {
            case 'EN': window.location.href = baseUrl + 'en/#/home'; break;
            case 'CAT': window.location.href = baseUrl + 'ca/#/home'; break;
            case 'ES': window.location.href = baseUrl + 'es/#/home'; break;
        }
    }

    public checkNotSavedHome() {

        const options =
            {
                text: $localize`:@@NotSavedWarning:Hay cambios sin guardar. ¿Seguro que quieres salir?`,
                icon: 'warning',
                showDenyButton: true,
                denyButtonText: $localize`:@@cancelarButton:Cancelar`,
            } as SweetAlertOptions

        if (this.dashboardService._notSaved.value === false) {
            this.router.navigate(['/home/']);
        } else {
            this.dashboardService._notSaved.next(false);
            Swal.fire(options).then((result) => {
                if (result.isConfirmed) {
                    this.router.navigate(['/home/']);
                }
            })
        }
    }

}
