import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ArimaService extends ApiService {

  public arimaRoute = '/arima';

  predict(dataset: number[], steps: number = 1): Observable<any> {
    return this.post(`${this.arimaRoute}/predict`, { dataset, steps });
  }

}
