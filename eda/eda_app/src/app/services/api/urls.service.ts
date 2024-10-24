import { Injectable } from '@angular/core';
import { ApiService } from "./api.service";


@Injectable({
  providedIn: 'root'
})
export class UrlsService extends ApiService{

  private globalDSRoute = '/funcionalidadUrl';

  checkUrl(url:any){
    return this.post(`${this.globalDSRoute}/check`, url);
  }


}
