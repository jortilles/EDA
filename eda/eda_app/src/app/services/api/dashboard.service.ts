import {Injectable, Output, EventEmitter} from '@angular/core';
import {Observable, BehaviorSubject} from 'rxjs';
import {ApiService} from './api.service';

@Injectable({
    providedIn: 'root'
})
export class DashboardService extends ApiService {

    private route = '/dashboard/';
    private routeDataManager = '/database-manager';

    public _notSaved = new BehaviorSubject<boolean>(false); // [{ display_name: { default: '' }, eda-columns: [] }] --> just in case
    public notSaved = this._notSaved.asObservable();

    getDashboards(): Observable<any> {
        return this.get( this.route );
    }

    getDashboard( id ): Observable<any> {
        return this.get( `${this.route}${id}` );
    }

    addNewDashboard( dashboard ): Observable<any> {
        return this.post( this.route,  dashboard);
    }

    updateDashboard( id, body ): Observable<any> {
        return this.put( `${this.route}${id}`, body );
    }

    deleteDashboard( id ): Observable<any> {
        return this.delete( `${this.route}${id}` );
    }

    executeQuery(body): Observable<any> {
        return this.post( `${this.route}query`,  body );
    }

    executeSqlQuery(body): Observable<any> {
        return this.post( `${this.route}sql-query`,  body );
    }
    executeView(body) : Observable<any>{
        return this.post(`${this.route}view-query`, body);
    }

    getBuildedQuery(body) : Observable<any>{
        return this.post(`${this.route}getQuery`, body);
    }

    cleanCache(body):Observable<any>{
        return this.post(`${this.route}clean-refresh`, body);
    }

    cloneDashboard(id: string): Observable<any> {
        return this.post(`${this.route}${id}/clone`, {});
    }

    updateDashboardSpecific(id: string, body: any): Observable<any> {
        return this.put(`${this.route}${id}/updateSpecific`, body);
    }

}
