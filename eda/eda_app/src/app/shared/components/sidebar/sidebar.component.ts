import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SidebarService, UserService } from '@eda_services/service.index';
import { User } from '@eda_models/model.index';
import { AlertService } from '@eda_services/alerts/alert.service';


@Component({
    selector: 'app-sidebar',
    templateUrl: './sidebar.component.html',
    styles: []
})
export class SidebarComponent implements OnInit {
    public user: User;
    public dataSourceMenu: any[] = [];

    constructor(public router: Router,
                private sidebarService: SidebarService,
                public userService: UserService,
                private alertService: AlertService ) {
        // Obtenir noms dels datasources
        this.getDataSourcesNames();
    }

    ngOnInit() {
        this.user = this.userService.user;

        // Ens subscribim a l'observable currentDatasources que ha de tenir el valor actual dels noms dels datasources.
        this.sidebarService.currentDatasources.subscribe(data => this.dataSourceMenu = data);
    }

    openDialog() {
        this.router.navigate(['/data-source']);
    }

    // getDataSourcesNames() {
    //   this._sidebarService.getDataSourceNames()
    //     .subscribe(resp => {
    //       this.dataSourceMenu = resp.ds;
    //     }, err => this.alertService.addError(err)
    //     );
    // }

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
