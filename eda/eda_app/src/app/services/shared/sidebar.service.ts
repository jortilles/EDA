import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../api/api.service';

@Injectable()
export class SidebarService extends ApiService {
    private globalDSRoute = '/datasource';
    private _datasources = new BehaviorSubject<any>([]);
    currentDatasources = this._datasources.asObservable();

    public toggleSideNav: boolean = false;
    public hideSideNavSubj: BehaviorSubject<boolean>;

    public menu: any[] = [{ title: 'Fuentes principales', icon: 'mdi mdi-database', submenu: [] }];

    constructor(protected http: HttpClient) {
        super(http);
        this.hideSideNavSubj = new BehaviorSubject<boolean>(false);
    }

    getDataSourceNames(): void {
        this.get(this.globalDSRoute + '/names')
            .subscribe((names: any) => {
                this._datasources.next(names.ds);
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

}
