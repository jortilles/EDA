import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, NgTemplateOutlet } from '@angular/common';
import { IconComponent } from '@eda/shared/components/icon/icon.component';
import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { UserService } from '@eda/services/api/user.service';
import { AlertService, DashboardService } from '@eda/services/service.index';
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
  private createDashboardService = inject(CreateDashboardService);
  private dashboardService = inject(DashboardService);
  private alertService = inject(AlertService);
  private router = inject(Router);

  public leftItems: {name:string, href:string, isStarting: boolean, icon?: any}[];
  public srcDashboard: string = "https://free.edalitics.com/es/#/dashboard/67f8ef208a7621c66552d111?panelMode=true"; 
  ngOnInit(): void {
    // Inicialización
    this.leftItems = [
      { name: 'Portada', href: 'custom-dashboard', isStarting: true, icon: 'grafico' },
      {name: 'Mobilitat ', href: 'custom-dashboard' ,isStarting: true, icon: 'coche'},
      {name: 'Desplaçaments ', href: 'custom-dashboard' ,isStarting: false},
      {name: 'Parc de vehicles ', href: 'custom-dashboard' ,isStarting: false},
      {name: 'Medi ambient ', href: 'custom-dashboard' ,isStarting: true, icon: 'hoja'},
      {name: 'Energia i consum ', href: 'custom-dashboard' ,isStarting: false},
      {name: 'Externalitats ', href: 'custom-dashboard' ,isStarting: false},
      {name: 'Seguretat ', href: 'custom-dashboard' ,isStarting: true, icon: 'cuidado'},
      {name: 'Delinqüència ', href: 'custom-dashboard' ,isStarting: false},
      {name: 'Viari ', href: 'custom-dashboard' ,isStarting: false},
      {name: 'Turisme ', href: 'custom-dashboard' ,isStarting: true, icon: 'sombrilla'},
      {name: 'Visitants ', href: 'custom-dashboard' ,isStarting: false},
      {name: 'Hosteleria ', href: 'custom-dashboard' ,isStarting: false},
      {name: 'Configuració ', href: 'custom-dashboard' ,isStarting: true, icon: 'engranaje'},
    ]
  }


  changeSrc() {
    //document.getElementById('showDashboard')['src'] = 'http://localhost:4200/#/custom-dashboard';
  }




}
