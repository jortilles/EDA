import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { User } from '@eda/models/model.index';
import { SidebarService, UserService, AlertService } from '@eda/services/service.index';
import { LogoSidebar } from '@eda/configs/index';


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

    constructor(
        public router: Router,
        public userService: UserService,
        public sidebarService: SidebarService,
        private alertService: AlertService
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
        this.edit_mode = userName !== 'edaanonim';
    }

    logout(): void {
        this.userService.logout();
    }

    getDataSourcesNames(): void {
        this.sidebarService.getDataSourceNames();
    }

    goToDataSource(datasource): void {
        if (datasource) {
            this.router.navigate(['/data-source/', datasource._id]);
        } else {
            this.alertService.addError('Ha ocurrido un error');
        }
    }

}
