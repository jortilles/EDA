import { Injectable, Output, EventEmitter } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
    providedIn: 'root'
})
export class QueryService extends ApiService {

    private route = '/query';

    executeQuery(body): Observable<any> {
        return this.post(`${this.route}`, body);
    }

    executeSqlQuery(body): Observable<any> {
        return this.post(`${this.route}/sql`, body);
    }

    executeView(body): Observable<any> {
        return this.post(`${this.route}/view`, body);
    }

    executeAnalizedQuery(body): Observable<any> {
        return this.post(`${this.route}/analized`, body);
    }
}