import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { User } from '@eda/models/model.index';
import { SidebarService, UserService, AlertService } from '@eda/services/service.index';


@Component({
    selector: 'app-sidebar',
    templateUrl: './sidebar.component.html',
    styles: ['']
})
export class SidebarComponent implements OnInit {
    public user: User;
    public isAdmin: boolean;
    public dataSourceMenu: any[] = [];
    public edit_mode: boolean = true;
    public mobileSize: boolean = false;
    public sideBtn: boolean = false;

    constructor(public router: Router,
        public userService: UserService,
        public sidebarService: SidebarService,
        private alertService: AlertService) {


        this.sidebarService.getToggleSideNav().subscribe((value) => {
            this.sideBtn = value;
        });

        this.getMobileSize();
        this.getDataSourcesNames();
    }

    ngOnInit() {
        this.user = this.userService.user;
        this.setEditMode()
        // Ens subscribim a l'observable currentDatasources que ha de tenir el valor actual dels noms dels datasources.
        this.sidebarService.currentDatasources.subscribe(
            data => this.dataSourceMenu = data,
            err => this.alertService.addError(err)
        );
    }

    getMobileSize(event?) {

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

    toggleClassSide() {
        this.sidebarService.setHideSideNav();
    }

    setEditMode() {
        const user = localStorage.getItem('user');
        const userName = JSON.parse(user).name;
        this.edit_mode = userName !== 'edaanonim';
    }


    logout() {
        this.userService.logout();
    }

    getDataSourcesNames() {
        this.sidebarService.getDataSourceNames();
    }


    goToDataSource(datasource) {
        if (datasource) {
            this.router.navigate(['/data-source/', datasource._id]);
        } else {
            this.alertService.addError('Ha ocurrido un error');
        }
    }

}
