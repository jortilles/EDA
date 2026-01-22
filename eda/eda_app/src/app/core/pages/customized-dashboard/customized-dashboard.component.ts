import { ChangeDetectorRef, Component, inject, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { CommonModule, NgTemplateOutlet } from '@angular/common';
import { IconComponent } from '@eda/shared/components/icon/icon.component';
import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { UserService } from '@eda/services/api/user.service';
import { AlertService, DashboardService, FileUtiles, GlobalFiltersService, StyleProviderService, IGroup, DashboardStyles, ChartUtilsService } from '@eda/services/service.index';
import { CreateDashboardService } from '@eda/services/utils/create-dashboard.service';
import Swal from 'sweetalert2';
import * as _ from 'lodash';


@Component({
  selector: 'app-customized-dashboard',
  standalone: true,
  imports: [CommonModule,IconComponent],
  templateUrl: './customized-dashboard.component.html',
})
export class CustomizedDashboardComponent implements OnInit {
  public leftItems: {name:string, href:string, isStarting: boolean, icon?: any}[];
  public : string = "https://demo.edalitics.com/es/#/public/6801ea526c2a8f2c431e9b28"; 
  ngOnInit(): void {
    // Inicialización
    this.leftItems = [
      {name: 'Despeses', href: 'https://demo.edalitics.com/es/#/public/6801ea2d2574871d49753812', isStarting: true, icon: 'grafico' },
      {name: 'Actuacions Policials ', href: 'https://demo.edalitics.com/es/#/public/6801ea78baeb472cb1127d31' ,isStarting: true, icon: 'coche'},
      {name: 'Desplaçaments ', href: 'https://demo.edalitics.com/es/#/public/6801ea526c2a8f2c431e9b28' ,isStarting: false},
      {name: 'Parc de vehicles ', href: 'https://demo.edalitics.com/es/#/public/6801ea526c2a8f2c431e9b28' ,isStarting: false},
      {name: 'Pressupost ', href: 'https://demo.edalitics.com/es/#/public/6801ea526c2a8f2c431e9b28' ,isStarting: true, icon: 'hoja'},
      {name: 'Energia i consum ', href: 'https://demo.edalitics.com/es/#/public/6801ea526c2a8f2c431e9b28' ,isStarting: false},
      {name: 'Externalitats ', href: 'https://demo.edalitics.com/es/#/public/6801ea526c2a8f2c431e9b28' ,isStarting: false},
      {name: 'Seguretat ', href: 'https://demo.edalitics.com/es/#/public/6801ea526c2a8f2c431e9b28' ,isStarting: true, icon: 'cuidado'},
      {name: 'Delinqüència ', href: 'https://demo.edalitics.com/es/#/public/6801ea526c2a8f2c431e9b28' ,isStarting: false},
      {name: 'Viari ', href: 'https://demo.edalitics.com/es/#/public/6801ea526c2a8f2c431e9b28' ,isStarting: false},
      {name: 'Turisme ', href: 'https://demo.edalitics.com/es/#/public/6801ea526c2a8f2c431e9b28' ,isStarting: true, icon: 'sombrilla'},
      {name: 'Visitants ', href: 'https://demo.edalitics.com/es/#/public/6801ea526c2a8f2c431e9b28' ,isStarting: false},
      {name: 'Hosteleria ', href: 'https://demo.edalitics.com/es/#/public/6801ea526c2a8f2c431e9b28' ,isStarting: false},
      {name: 'Configuració ', href: 'https://demo.edalitics.com/es/#/public/6801ea526c2a8f2c431e9b28' ,isStarting: true, icon: 'engranaje'},
    ]
  }


changeSrc(href: string) {
  console.log(href)
  const iframe = document.getElementById('showDashboard') as HTMLIFrameElement;
  if (iframe) {
    const baseUrl = href + '?panelMode=true'
    iframe.src = baseUrl + '&refresh=' + Date.now();
  }
}




}
