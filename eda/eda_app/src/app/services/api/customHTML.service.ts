import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class CustomHTMLService extends ApiService {

    private route = '/customHTML';

    getByKey(key: string): Observable<any> {
        return this.get(`${this.route}/${key}`);
    }

    upsert(key: string, value: string): Observable<any> {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        return this.put(`${this.route}/${key}`, { value, updatedBy: user?.name });
    }
}
