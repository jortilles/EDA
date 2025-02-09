import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, tap, map } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
    providedIn: 'root'
})
export class ReportService extends ApiService {
    private route = '/dashboard/';

    private reportsSubject = new BehaviorSubject<any[]>([]);
    reports$ = this.reportsSubject.asObservable();

    // findReports() {
    //     this.get(this.route).subscribe((reports: any) => {
    //         console.log('find', reports);
    //         this.reportsSubject.next(reports);
    //     });
    // }

    // Método para obtener la respuesta completa de la API
    findReports(): Observable<any> {
        return this.get(this.route);
    }

    getPublicReports(): Observable<any[]> {
        return this.findReports().pipe(
            map(response => response.publics),
            map(reports => reports.sort((a, b) => (a.config.title > b.config.title) ? 1 : ((b.config.title > a.config.title) ? -1 : 0)))
        );
    }

    getPrivateReports(): Observable<any[]> {
        return this.findReports().pipe(
            map(response => response.dashboards),
            map(reports => reports.sort((a, b) => (a.config.title > b.config.title) ? 1 : ((b.config.title > a.config.title) ? -1 : 0)))
        );
    }

    getRoleReports(): Observable<any[]> {
        return this.findReports().pipe(
            map(response => response.group),
            map(reports => reports.sort((a, b) => (a.config.title > b.config.title) ? 1 : ((b.config.title > a.config.title) ? -1 : 0)))
        );
    }

    getSharedReports(): Observable<any[]> {
        return this.findReports().pipe(
            map(response => response.shared),
            map(reports => reports.sort((a, b) => (a.config.title > b.config.title) ? 1 : ((b.config.title > a.config.title) ? -1 : 0)))
        );
    }

    addReport(newReport: any) {
        this.post(this.route, newReport).pipe(
            tap((createdReport: any) => {
                const currentReports = this.reportsSubject.getValue();
                this.reportsSubject.next([...currentReports, createdReport]);
            })
        );
    }
}