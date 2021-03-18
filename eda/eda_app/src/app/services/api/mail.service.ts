import { Injectable } from "@angular/core";
import { ApiService } from "./api.service";

@Injectable()
export class MailService extends ApiService{

  private globalDSRoute = '/mail';
  
  checkConfiguration(config:any){
    return this.post(`${this.globalDSRoute}/check`, config);
  }

  saveConfiguration(config:any){
    return this.post(`${this.globalDSRoute}/save`, config);
  }

  getConfiguration(){
    return this.get(`${this.globalDSRoute}/credentials`);
  }

}