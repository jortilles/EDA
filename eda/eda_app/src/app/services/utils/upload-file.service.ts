import { Injectable } from '@angular/core';
import {
  HttpClient, HttpRequest, HttpEventType, HttpResponse
} from '@angular/common/http';

import { Router } from '@angular/router';
import { ApiService } from '../api/api.service';
import { GlobalService } from '../api/global.service';
import { AlertService } from '../alerts/alert.service';
import { Observable, Subject } from 'rxjs';
import { URL_SERVICES } from '@eda/configs/config';


@Injectable()
export class UploadFileService extends ApiService {
  constructor(protected http: HttpClient,
    private router: Router,
    private globalService: GlobalService,
    private alertService: AlertService) {
    super(http);
  }

  private route = '/global/upload/addFile';
  public API = URL_SERVICES;
  
  progress: Observable<number> 

  upload(file:File){
    return this.post(this.route, file);
  }
}

