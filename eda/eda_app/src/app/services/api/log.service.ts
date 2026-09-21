import { Injectable } from '@angular/core';
import { ApiService } from "./api.service";
import { Observable, BehaviorSubject } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class LogService extends ApiService{

    private route = '/admin/log';

    getLogFile(): Observable<any> {
        return this.get(`${this.route}/log-file`);
    }

    getLogErrorFile(): Observable<any> {
        return this.get(`${this.route}/log-error-file`);
    }

    getAppLogs(params: any): Observable<any> {
        return this.getParams(`${this.route}/app-logs`, params);
    }

    getLogTail(file: 'access' | 'error', offset: number): Observable<any> {
        return this.getParams(`${this.route}/log-tail`, { file, offset });
    }

    getLogHistory(params: any): Observable<any> {
        return this.getParams(`${this.route}/log-history`, params);
    }

}
