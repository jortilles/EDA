import { DashboardService } from './../../../services/api/dashboard.service';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { User } from '@eda/models/model.index';
import { SidebarService, UserService, AlertService, DataSourceService, StyleProviderService } from '@eda/services/service.index';
import { LogoSidebar } from '@eda/configs/index';
import Swal, { SweetAlertOptions } from 'sweetalert2';


@Component({
    selector: 'app-sidebar',
    templateUrl: './sidebar.component.html',
    styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
    public user: User;
    public isAdmin: boolean;
    public dataSourceMenu: any[] = [];
    public edit_mode: boolean = true;
    public panelMode: boolean = false; // en mode panel es mostra nomel el panell
    public mobileSize: boolean = false;
    public sideBtn: boolean = false;
    public logoSidebar: string;
    public homeLink = '/home'
    public createDashboard: boolean = false;
    /* SDA CUSTOM*/ public isObserver: boolean = false;

    constructor(
        public router: Router,
        private route: ActivatedRoute,
        public userService: UserService,
        public sidebarService: SidebarService,
        private alertService: AlertService,
        private dashboardService: DashboardService,
        public dataSourceService : DataSourceService,
        public styleProviderService : StyleProviderService
    ) {
        this.logoSidebar = LogoSidebar;

        this.sidebarService.getToggleSideNav().subscribe((value) => {
            this.sideBtn = value;
        });

        this.getMobileSize();
        this.getDataSourcesNames();
    }

    ngOnInit(): void {
        this.user = this.userService.getUserObject();
        this.setEditMode();
        this.getPanelMode();
        // Ens subscribim a l'observable currentDatasources que ha de tenir el valor actual dels noms dels datasources.
        this.sidebarService.currentDatasources.subscribe(
            data => this.dataSourceMenu = data,
            err => this.alertService.addError(err)
        );
        /* SDA CUSTOM*/ this.sidebarService.isObserver$.subscribe(value => {
        /* SDA CUSTOM*/     this.isObserver = value;
        /* SDA CUSTOM*/  });

        
    }

    
    private getPanelMode(): void {
        
        this.route.queryParams.subscribe(params => {
            try{
                    if(params['panelMode'] == 'true'){
                        this.panelMode =true; // en mode panel es mostra nomel els panells
                        this.sidebarService.toggleSideNav = true;
                
                    }
            }catch(e){
            }
        });
    }

    getMobileSize(event?): void {
        if(!this.panelMode){
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
    }

    toggleClassSide(): void {
        this.sidebarService.setHideSideNav();
    }

    setEditMode(): void {
        const user = sessionStorage.getItem('user');
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
            this.styleProviderService.setDefaultBackgroundColor();
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
        this.styleProviderService.setDefaultBackgroundColor();
        this.dashboardService._notSaved.next(false);
    }


    public redirectLocale(lan: string) {
        let baseUrl = window.location.href.split('#')[0];

        if (baseUrl.slice(-4) == '/es/' ||
            baseUrl.slice(-4) == '/ca/' ||
            baseUrl.slice(-4) == '/pl/' ||
            baseUrl.slice(-4) == '/en/' ||
/* SDA CUSTOM */baseUrl.slice(-4) == '/gl/' ) 
            {
            baseUrl = baseUrl.slice(0, baseUrl.length - 3)
        }
        switch (lan) {
            case 'EN': window.location.href = baseUrl + 'en/#/home'; break;
            case 'CAT': window.location.href = baseUrl + 'ca/#/home'; break;
            case 'ES': window.location.href = baseUrl + 'es/#/home'; break;
            case 'PL'  : window.location.href = baseUrl + 'pl/#/home'; break;
/* SDA CUSTOM */case 'GL'  : window.location.href = baseUrl + 'gl/#/home'; break;
        }
    }
    public checkNotSaved(){

        this.styleProviderService.setDefaultBackgroundColor();
        let url = window.location.href;

        if(url.includes('data-source')) {
            this.checkNotSavedDatasource(); 
        } else if(url.includes('dashboard')) {
            this.checkNotSavedHome()
        } else {
            this.router.navigate(['/home/']);
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
            
            Swal.fire(options).then((result) => {
                if (result.isConfirmed) {
                    this.dashboardService._notSaved.next(false);
                    this.router.navigate(['/home/']);
                }
            })
        }
    }

    public checkNotSavedDatasource() {

        const options =
            {
                text: $localize`:@@NotSavedWarning:Hay cambios sin guardar. ¿Seguro que quieres salir?`,
                icon: 'warning',
                showDenyButton: true,
                denyButtonText: $localize`:@@cancelarButton:Cancelar`,
            } as SweetAlertOptions

        if (this.dataSourceService._unsaved.value === false) {
            this.router.navigate(['/home/']);
        } else {
            
            Swal.fire(options).then((result) => {
                if (result.isConfirmed) {
                    this.dataSourceService._unsaved.next(false);
                    this.router.navigate(['/home/']);
                }
            })
        }
    }

    public onCloseCreateDashboard(event?: any): void {
        this.createDashboard = false;
        if (event) this.router.navigate(['/dashboard', event._id]).then(() => window.location.reload());
    }

}
