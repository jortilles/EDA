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

    constructor(public router: Router,
                public userService: UserService,
                private sidebarService: SidebarService,
                private alertService: AlertService ) {
        this.getDataSourcesNames();
    }

    ngOnInit() {
        this.user = this.userService.user;

        // Ens subscribim a l'observable currentDatasources que ha de tenir el valor actual dels noms dels datasources.
        this.sidebarService.currentDatasources.subscribe(
            data => this.dataSourceMenu = data,
            err => this.alertService.addError(err)
        );
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
