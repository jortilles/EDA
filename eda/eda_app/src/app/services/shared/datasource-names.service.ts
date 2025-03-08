import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, map } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../api/api.service';

@Injectable({
  providedIn: 'root'
})
export class DataSourceNamesService extends ApiService {
  private globalDSRoute = '/datasource';
  private _datasources = new BehaviorSubject<any>([]);
  currentDatasources = this._datasources.asObservable();

  private _datasourcesDB = new BehaviorSubject<any>([]);
  currentDatasourcesDB = this._datasourcesDB.asObservable();

  constructor(protected http: HttpClient) {
    super(http);
  }

  getModelsNames(): Observable<any> {
    return this.get(this.globalDSRoute + '/namesForEdit');
  }

  getDataSourceNames(): void {
    this.get(this.globalDSRoute + '/namesForEdit')
      .pipe(
        map((names: any) => this._datasources.next(names.ds))
      );
  }

  getDataSourceNamesForDashboard(): void {
    this.get(this.globalDSRoute + '/namesForDashboard')
      .pipe(
        map((names: any) => this._datasourcesDB.next(names.ds))
      );
  }

  getDataSources(): Observable<any> {
    return this.get(this.globalDSRoute);
  }

}