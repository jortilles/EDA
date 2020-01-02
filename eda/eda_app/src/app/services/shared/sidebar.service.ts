import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { ApiService } from '../api/api.service';
import { map } from 'rxjs/operators';

@Injectable()
export class SidebarService extends ApiService {
    private globalDSRoute = '/data-source';

    menu: any[] = [{ title: 'Fuentes principales', icon: 'mdi mdi-database', submenu: [] }];

    private _datasources = new BehaviorSubject<any>([]);
    currentDatasources = this._datasources.asObservable();

    // getDataSourceNames(): Observable<any> {
    //     return this.get( this.globalDSRoute + '/names' );
    // }

    getDataSourceNames(): void {
        this.get(this.globalDSRoute + '/names')
            .subscribe((names: any) => {
                this._datasources.next(names.ds);
            });
    }


    getDataSources(): Observable<any> {
        return this.get(this.globalDSRoute);
        // return this.get( this.globalDSRoute ).pipe(
        //     map(( ds: any ) => {
        //         console.log(ds.ds);
        //         return this.menu = [
        //             {
        //                 title: 'Principales',
        //                 icon: 'mdi mdi-database',
        //                 submenu: ds.ds.ds
        //             },
        //             {
        //                 title: 'ADMIN',
        //                 icon: 'mdi mdi-folder-lock-open',
        //                 submenu: [
        //                     { name: 'Usuarios', url: '/users' }
        //                 ]
        //             }
        //         ]
        //     })
        // );
    }


}