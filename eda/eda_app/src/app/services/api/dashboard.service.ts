import { Injectable, Output, EventEmitter } from '@angular/core';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
    providedIn: 'root'
})
export class DashboardService extends ApiService {

    private route = '/dashboard/';
    private routeDataManager = '/database-manager';

    private _notSaved = new BehaviorSubject<boolean>(false); // [{ display_name: { default: '' }, eda-columns: [] }] --> just in case
    public notSaved = this._notSaved.asObservable();

    public dashboardCreated$ = new Subject<void>();

    private saveHandler?: () => Promise<any>;

    setNotSaved(value: boolean): void {
        this._notSaved.next(value);
    }

    /**
     * The report page registers here how to save itself, so other components (e.g. the side menu)
     * can save the open report before leaving it.
     */
    registerSaveHandler(handler: () => Promise<any>): void {
        this.saveHandler = handler;
    }

    clearSaveHandler(): void {
        this.saveHandler = undefined;
    }

    /** Saves the open report, when there is a report page able to do it. */
    async requestSave(): Promise<void> {
        if (this.saveHandler) {
            await this.saveHandler();
        }
    }

    getDashboards(): Observable<any> {
        return this.get(this.route);
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
        return this.post(this.route, dashboard);
    }

    updateDashboard(id, body): Observable<any> {
        return this.put(`${this.route}${id}`, body);
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

    executeSourceFieldsQuery(body): Observable<any> {
        return this.post(`${this.route}source-fields-query`, body);
    }

    executeGroupedSubtotalsQuery(body): Observable<any> {
        return this.post(`${this.route}grouped-subtotals-query`, body);
    }

    cleanCache(body): Observable<any> {
        return this.post(`${this.route}clean-refresh`, body);
    }

    cloneDashboard(id: string): Observable<any> {
        return this.post(`${this.route}${id}/clone`, {});
    }

    generateDashboardWithAI(body: any): Observable<any> {
        return this.post('/assistant/generate-dashboard', body);
    }

    updateDashboardSpecific(id: string, body: any): Observable<any> {
        return this.put(`${this.route}${id}/updateSpecific`, body);
    }

}
