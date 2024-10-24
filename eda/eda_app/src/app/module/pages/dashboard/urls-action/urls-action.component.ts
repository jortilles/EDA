import { Component, OnInit } from '@angular/core';
import { EdaDialog, EdaDialogAbstract, EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import { AlertService } from '@eda/services/service.index';
import { HttpClient } from '@angular/common/http';


@Component({
  selector: 'urls-action',
  templateUrl: './urls-action.component.html',
  styleUrls: [],
})
export class UrlsActionComponent extends EdaDialogAbstract  implements OnInit {

  public dialog: EdaDialog;
  public urls: any[];
  public clonedUrls: { [s: string]: any; } = {};
  public nameAdd: string;
  public urlAdd: string;
  public descriptionAdd: string;

  constructor(
    private alertService: AlertService,
    private http: HttpClient
  ) { 
    super();
    this.dialog = new EdaDialog({
      show: () => this.onShow(),
      hide: () => this.onClose(EdaDialogCloseEvent.NONE),
      title: $localize`:@@opcionUrls:ACCIÓN PERSONALIZADA`,
    });
    this.dialog.style= { width: '70%', height:'55%' };
  }

  ngOnInit(): void {
    this.urls = this.controller.params.urls;
    // this.urls = JSON.parse(JSON.stringify(this.controller.params.urls)); // Opcional
  }

  onShow(): void {  // funcion que no se borra por el uso de la clase abstracta 
  }

  onClose(event: EdaDialogCloseEvent, response?: any): void {
    return this.controller.close(event, response);
  }

  public urlsConfirmed(): void {
    let response = {urls: this.urls};
    this.onClose(EdaDialogCloseEvent.NEW, response);
  }

  public closeDialog(): void {
    this.onClose(EdaDialogCloseEvent.NONE);
  }

  onRowEditInit(url:any) {
    this.clonedUrls[url.id] = {...url}; // variable de clonacion temporal
  }

  onRowEditSave(url: any){
    if(url.name.length>0 && url.url.length>0 && url.description.length>0) {
        delete this.clonedUrls[url.id];
        this.alertService.addSuccess($localize`:@@urlEditSave:URL EDITADO CORRECTAMENTE`);
    }
    else {
      this.alertService.addError($localize`:@@urlEditSaveError:FORMULARIO INCORRECTO, COMPLETAR LOS CAMPOS`);
    }
  }

  onRowEditCancel(url: any, index: number){
    this.urls[index] = this.clonedUrls[url.id];
    delete this.clonedUrls[url.id];
  }

  onRowEditDelete(index: any) {
    // comparar los ids del arreglo urls y del objeto de objetos clonedUrls
    for (let clave in this.clonedUrls){
      if(this.clonedUrls[clave].id === this.urls[index].id) delete this.clonedUrls[clave];
    }

    this.urls = this.urls.filter( element => this.urls[index]!==element);
  }

  addUrlDashboard(url: string, name: string, description: string) {

    // Confirmar si se debe verificar la URL de manera estandarizada - consultar con Juanjo
    if(url === undefined || name===undefined || description===undefined){
      this.alertService.addError($localize`:@@addUrlDashboardUndefined:VALORES NO DEFINIDOS O FALTA COMPLETAR CAMPOS.`);
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
        this.alertService.addSuccess($localize`:@@urlAddedSuccessfully:URL AGREGADO CORRECTAMENTE`);

        // Reiniciando los valores de los campos de agregar URL
        this.urlAdd=''
        this.nameAdd=''
        this.descriptionAdd=''
      }
  
      else {
        this.alertService.addError($localize`:@@urlAddedIncomplete:FORMULARIO DE AGREGADO URL INCOMPLETO`);
      }
    }
  }

  customAction(url:any){
    this.http.get(`${url.url}`,
      { observe: 'response' }
    )
    .subscribe(response => {
      if(response.status===200) {
        this.alertService.addSuccess($localize`:@@urlSuccessfulConnection:CONEXIÓN EXITOSA`);
      }
      else {
        this.alertService.addError($localize`:@@urlConnectionError:ERROR EN LA CONEXIÓN`);
      }

    }, error => {
      this.alertService.addError($localize`:@@urlConnectionError:ERROR EN LA CONEXIÓN`);
      console.log('Error en la consulta: ', error.status)
    } );
  }

}
