import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { ApiService } from './api.service';



@Injectable()
export class AddTableService extends ApiService {

  private globalDSRoute = '/addTable';

  createTable(body: any): Observable<any> {
    return this.post(`${this.globalDSRoute}/create`, body);
  }

  insertData(body:any):Observable<any>{
    return this.post(`${this.globalDSRoute}/insert`, body);
  }

}