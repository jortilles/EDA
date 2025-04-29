import { Component, EventEmitter, Output } from "@angular/core";
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, } from "@angular/forms";
import { AlertService, DashboardService } from "@eda/services/service.index";
import { UrlsService } from '@eda/services/api/urls.service';
import { SharedModule } from "@eda/shared/shared.module";
import { MultiSelectModule } from "primeng/multiselect";
import { FloatLabelModule } from 'primeng/floatlabel';
import { SelectButtonModule } from "primeng/selectbutton";
import * as _ from 'lodash';
import { IconComponent } from "../../../../../shared/components/icon/icon.component";



@Component({
  selector: 'app-dashboard-custom-action',
  standalone: true,
  templateUrl: './dashboard-custom-action.dialog.html',
imports: [SharedModule, ReactiveFormsModule, FormsModule, SelectButtonModule, MultiSelectModule, FloatLabelModule, IconComponent],
})
export class DashboardCustomActionDialog{
  @Output() close: EventEmitter<any> = new EventEmitter<any>();
  public display: boolean = false;
  public urls: any[];
  public clonedUrls: { [s: string]: any; } = {};
  public urlAdd: string;
  public nameAdd: string;
  public descriptionAdd: string;
  public editing: boolean = false;
  public editingRow: number;

  constructor(private alertService: AlertService,public dashboardService: DashboardService, private urlsService: UrlsService) { }

  ngOnInit(): void {
    console.log(this)
    const urls = JSON.parse(sessionStorage.getItem('urls')) || [];
    console.log(urls)
    this.urls = _.uniqBy(urls, 'value');
  }

  onRowEditInit(url: any, index: number, urls: any) {
    this.clonedUrls[url.id] = { ...url }; // variable de clonacion temporal

    //Entrar en edición
    this.editingRow = index;
    this.editing = true;
  }

  onRowEditSave(url: any){
    if(url.name.length>0 && url.url.length>0 && url.description.length>0) {
        delete this.clonedUrls[url.id];
        this.alertService.addSuccess($localize`:@@urlEditSave:URL editado correctamente`);
    }
    else {
      this.alertService.addError($localize`:@@urlEditSaveError:Formulario incompleto, rellene todos los campos`);
    }
    this.editing = false;
  }

  onRowEditCancel(url: any, index: number){
    this.urls[index] = this.clonedUrls[url.id];
    delete this.clonedUrls[url.id];
    this.editing = false;
  }

  onRowEditDelete(index: any) {
    // comparar los ids del arreglo urls y del objeto de objetos clonedUrls
    for (let clave in this.clonedUrls){
      if(this.clonedUrls[clave].id === this.urls[index].id) delete this.clonedUrls[clave];
    }

    this.urls = this.urls.filter(element => this.urls[index] !== element);
    this.editing = false;
  }
  
  addUrlDashboard(url: string, name: string, description: string) {

    // Confirmar si se debe verificar la URL de manera estandarizada - consultar con Juanjo
    if(url === undefined || name===undefined || description===undefined){
      this.alertService.addError($localize`:@@addUrlDashboardUndefined:Faltan rellenar algunos campos`);
    }
    else {
      // Hallando el mayor valor de todos los id del arreglo urls para agregar un nuevo elemento con un id de mayor valor.
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
        //not saved alert message
        this.dashboardService._notSaved.next(true);


        // Reiniciando los valores de los campos de agregar URL
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
    sessionStorage.setItem('urls', JSON.stringify(this.urls));
    this.close.emit(this.urls);
  }

  public disableApply(): boolean {
    return false;
  }

  public onClose(): void {
    this.display = false;
    this.close.emit();
  }
}



