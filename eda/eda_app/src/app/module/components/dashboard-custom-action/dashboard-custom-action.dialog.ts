import { Component, EventEmitter, Input, Output } from "@angular/core";
import { FormsModule, ReactiveFormsModule, UntypedFormGroup } from "@angular/forms";
import { AlertService, DashboardService } from "@eda/services/service.index";
import { UrlsService } from '@eda/services/api/urls.service';
import { SharedModule } from "@eda/shared/shared.module";
import { MultiSelectModule } from "primeng/multiselect";
import { FloatLabelModule } from 'primeng/floatlabel';
import { SelectButtonModule } from "primeng/selectbutton";
import * as _ from 'lodash';
import { IconComponent } from "../../../shared/components/icon/icon.component";
import { DashboardPage } from "../../pages/dashboard/dashboard.page";
import { EdaDialog2Component } from "@eda/shared/components/shared-components.index";

@Component({
  selector: 'app-dashboard-custom-action',
  standalone: true,
  templateUrl: './dashboard-custom-action.dialog.html',
  styleUrls: ['./dashboard-custom-action.dialog.css'],
imports: [SharedModule, ReactiveFormsModule, FormsModule, SelectButtonModule, MultiSelectModule, FloatLabelModule, IconComponent, EdaDialog2Component],
})
export class DashboardCustomActionDialog{
  @Output() close: EventEmitter<any> = new EventEmitter<any>();
  @Output() apply: EventEmitter<any> = new EventEmitter<any>();
  @Input() dashboard: DashboardPage;
  @Input() embedded: boolean = false;
  public form: UntypedFormGroup;
  public display: boolean = false;
  public urls: any[] = [];
  public clonedUrls: { [s: string]: any; } = {};
  public urlAdd: string;
  public nameAdd: string;
  public descriptionAdd: string;
  public editing: boolean = false;
  public editingRow: number;

  constructor(private alertService: AlertService, public dashboardService: DashboardService, private urlsService: UrlsService) { }

  ngOnInit(): void {
    this.urls = this.dashboard.dashboard.config.urls !== undefined ? this.dashboard.dashboard.config.urls: [];    
  }
  
  onRowEditInit(url: any, index: number, urls: any) {
    this.clonedUrls[url.id] = { ...url }; // temporary clone variable

    // Enter edit mode
    this.editingRow = index;
    this.editing = true;
  }

  onRowEditSave(url: any, index:any){
    if(url.name.length>0 && url.url.length>0 && url.description.length>0) {
        delete this.clonedUrls[url.id];
        this.alertService.addSuccess($localize`:@@urlEditSave:URL editado correctamente`);
    }
    else {
      this.alertService.addError($localize`:@@urlEditSaveError:Formulario incompleto, rellene todos los campos`);
    }
    
    this.dashboard.dashboard.config.urls[index] = url;
    this.editing = false;
  }

  onRowEditCancel(url: any, index: number){
    this.urls[index] = this.clonedUrls[url.id];
    delete this.clonedUrls[url.id];
    this.editing = false;
  }

  onRowEditDelete(index: any) {
    // compare the ids from the urls array and the clonedUrls object
    for (let clave in this.clonedUrls){
      if(this.clonedUrls[clave].id === this.urls[index].id) delete this.clonedUrls[clave];
    }
    this.urls = this.urls.filter(element => this.urls[index] !== element);
    this.dashboard.dashboard.config.urls = this.urls;
    this.editing = false;
  }
  
  addUrlDashboard(url: string, name: string, description: string) {

    // Confirm whether the URL should be validated in a standardized way - consult with Juanjo
    if(url === undefined || name===undefined || description===undefined){
      this.alertService.addError($localize`:@@addUrlDashboardUndefined:Faltan rellenar algunos campos`);
    }
    else {
      // Find the highest id value in the urls array to add a new element with a higher id.
      let mayor = 0;
      for (var i = 0; i < this.urls.length; i++) {
        if(this.urls[i].id>mayor) mayor = this.urls[i].id
      }

      if(url.length>0 && name.length>0 && description.length>0){
        this.urls.push({
          id: mayor + 1,
          url: url,
          name: name,
          description: description,
        });

        this.alertService.addSuccess($localize`:@@urlAddedSuccessfully:URL agregado correctamente`);
        // not saved alert message
        this.dashboardService.setNotSaved(true);

        // Reset the add URL field values
        this.urlAdd=''
        this.nameAdd=''
        this.descriptionAdd=''
      }
  
      else {
        this.alertService.addError($localize`:@@urlAddedIncomplete:Formulario incompleto`);
      }
    }
  }

  customAction(url:any){
    this.urlsService.checkUrl(url).subscribe(
      res => {
        if(res['ok']){
          this.alertService.addSuccess($localize`:@@urlSuccessfulConnection:Llamada EXITOSA`);
        } else {
          this.alertService.addError($localize`:@@urlConnectionError:ERROR en la llamada`);
        }
      }, 
      err => {
        this.alertService.addError($localize`:@@urlConnectionError:ERROR en la llamada`);
        console.log('Error en el envio o url incorrecta', err);
      }
    )
  }

  public onApply() {
    this.display = false;
    this.apply.emit(this.urls);
  }

  public disableApply(): boolean {
    return false;
  }

  public onClose(): void {
    this.display = false;
    this.close.emit();
  }
}