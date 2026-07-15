import { Injectable, Output, EventEmitter } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiService } from './api.service';

@Injectable({
    providedIn: 'root'
})
export class DashboardService extends ApiService {

    private route = '/dashboard/';
    private routeDataManager = '/database-manager';

    private _notSaved = new BehaviorSubject<boolean>(false); // [{ display_name: { default: '' }, eda-columns: [] }] --> just in case
    public notSaved = this._notSaved.asObservable();

    setNotSaved(value: boolean): void {
        this._notSaved.next(value);
    }

    getDashboards(): Observable<any> {
        console.log('[DASH-TRACE][frontend][dashboard.service] GET /dashboard -> request sent');
        return this.get(this.route).pipe(
            tap({
                next: (res) => console.log('[DASH-TRACE][frontend][dashboard.service] GET /dashboard response ->', {
                    isAdmin: res?.isAdmin,
                    publics: res?.publics?.length,
                    shared: res?.shared?.length,
                    group: res?.group?.length,
                    dashboards: res?.dashboards?.length,
                    raw: res
                }),
                error: (err) => console.log('[DASH-TRACE][frontend][dashboard.service] GET /dashboard ERROR ->', err)
            })
        );
    }

    getDashboard(id): Observable<any> {
        return this.get(`${this.route}${id}`);
    }

    getDataSource(id): Observable<any> {
        return this.get(`${this.route}datasource/${id}`);
    }

    getDashboardVisibility( id ): Observable<any> {
        return this.get( `${this.route}${id}/visibility` );
    }

    addNewDashboard(dashboard): Observable<any> {
        console.log('[DASH-TRACE][frontend][dashboard.service] POST /dashboard (create) body ->', dashboard);
        return this.post(this.route, dashboard).pipe(
            tap({
                next: (res) => console.log('[DASH-TRACE][frontend][dashboard.service] POST /dashboard response ->', res),
                error: (err) => console.log('[DASH-TRACE][frontend][dashboard.service] POST /dashboard ERROR ->', err)
            })
        );
    }

    updateDashboard(id, body): Observable<any> {
        console.log(`[DASH-TRACE][frontend][dashboard.service] PUT /dashboard/${id} body ->`, body);
        return this.put(`${this.route}${id}`, body).pipe(
            tap({
                next: (res) => console.log(`[DASH-TRACE][frontend][dashboard.service] PUT /dashboard/${id} response ->`, res),
                error: (err) => console.log(`[DASH-TRACE][frontend][dashboard.service] PUT /dashboard/${id} ERROR ->`, err)
            })
        );
    }

    deleteDashboard(id): Observable<any> {
        return this.delete(`${this.route}${id}`);
    }

    executeQuery(body): Observable<any> {
        return this.post(`${this.route}query`, body);
    }

    executeSqlQuery(body): Observable<any> {
        return this.post(`${this.route}sql-query`, body);
    }
    executeView(body): Observable<any> {
        return this.post(`${this.route}view-query`, body);
    }

    getBuildedQuery(body): Observable<any> {
        return this.post(`${this.route}getQuery`, body);
    }

    cleanCache(body): Observable<any> {
        return this.post(`${this.route}clean-refresh`, body);
    }

    cloneDashboard(id: string): Observable<any> {
        return this.post(`${this.route}${id}/clone`, {});
    }

    updateDashboardSpecific(id: string, body: any): Observable<any> {
        return this.put(`${this.route}${id}/updateSpecific`, body);
    }

}
