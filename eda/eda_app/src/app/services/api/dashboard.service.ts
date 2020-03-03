import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {ApiService} from './api.service';

@Injectable()
export class DashboardService extends ApiService {
    private route = '/dashboard/';
    private routeDataManager = '/database-manager';

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

}
