import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../api/api.service';

@Injectable()
export class SidebarService extends ApiService {
    private globalDSRoute = '/datasource';
    private _datasources = new BehaviorSubject<any>([]);
    currentDatasources = this._datasources.asObservable();

    private _datasourcesDB = new BehaviorSubject<any>([]);
    currentDatasourcesDB = this._datasourcesDB.asObservable();

    public toggleSideNav: boolean = false;
    public hideSideNavSubj: BehaviorSubject<boolean>;

    public menu: any[] = [{ title: 'Fuentes principales', icon: 'mdi mdi-database', submenu: [] }];

    constructor(protected http: HttpClient) {
        super(http);
        this.hideSideNavSubj = new BehaviorSubject<boolean>(false);
    }

    getDataSourceNames(): void {
       /* this.get(this.globalDSRoute + '/names') Comentado por Juanjo para poder poner el datasource publico*/
        this.get(this.globalDSRoute + '/namesForEdit')
            .subscribe((names: any) => {
                this._datasources.next(names.ds);
            }, err => console.log(err));
    }

    getDataSourceNamesForDashboard(): void {
        this.get(this.globalDSRoute + '/namesForDashboard')
            .subscribe((names: any) => {
                this._datasourcesDB.next(names.ds);
            }, err => console.log(err));
    }

    getDataSources(): Observable<any> {
        return this.get(this.globalDSRoute);
    }

    setHideSideNav() {
        this.toggleSideNav = !this.toggleSideNav;
        this.hideSideNavSubj.next(this.toggleSideNav);
    }

    setManualHideSideNav(value: boolean) {
        this.hideSideNavSubj.next(value);
    }

    getToggleSideNav(): Observable<boolean> {
        return this.hideSideNavSubj.asObservable();
    }
    /* SDA CUSTOM*/ private isObserverSubject = new BehaviorSubject<boolean>(false);
    /* SDA CUSTOM*/ isObserver$ = this.isObserverSubject.asObservable();
  
    /* SDA CUSTOM*/ setIsObserver(value: boolean) {
    /* SDA CUSTOM*/    this.isObserverSubject.next(value);
    /* SDA CUSTOM*/ }
}
