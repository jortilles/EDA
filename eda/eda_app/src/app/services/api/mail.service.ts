import { Injectable } from "@angular/core";
import { ApiService } from "./api.service";
import { Observable } from "rxjs";

@Injectable()
export class MailService extends ApiService{

  private globalDSRoute = '/mail';
  
  checkConfiguration(config:any): Observable<any> {
    return this.post(`${this.globalDSRoute}/check`, config);
  }

  saveConfiguration(config:any): Observable<any> {
    return this.post(`${this.globalDSRoute}/save`, config);
  }

  getConfiguration(): Observable<any> {
    return this.get(`${this.globalDSRoute}/credentials`);
  }

}