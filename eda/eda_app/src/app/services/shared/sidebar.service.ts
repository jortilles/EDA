import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { ApiService } from '../api/api.service';

@Injectable()
export class SidebarService extends ApiService {
    private globalDSRoute = '/datasource';

    menu: any[] = [{ title: 'Fuentes principales', icon: 'mdi mdi-database', submenu: [] }];

    private _datasources = new BehaviorSubject<any>([]);
    currentDatasources = this._datasources.asObservable();

    getDataSourceNames(): void {
        this.get(this.globalDSRoute + '/names')
            .subscribe((names: any) => {
                this._datasources.next(names.ds);
            }, err => console.log(err));
    }


    getDataSources(): Observable<any> {
        return this.get(this.globalDSRoute);
    }


}
