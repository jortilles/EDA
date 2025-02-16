import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, ReplaySubject } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { ApiService } from './api.service';

@Injectable({
    providedIn: 'root'
})
export class ReportService extends ApiService {
    private route = '/dashboard/';

    /**
     * Método para obtener todos los reports.
     */
    getAllReports(): Observable<any> {
        return this.get(this.route);
    }
}
