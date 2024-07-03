import { Component, AfterViewInit, OnInit } from '@angular/core';
import { EdaDialog, EdaDialogAbstract, EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import { AlertService } from '@eda/services/service.index';

@Component({
  selector: 'urls-action',
  templateUrl: './urls-action.component.html',
  styleUrls: [],
})
export class UrlsActionComponent extends EdaDialogAbstract  implements AfterViewInit, OnInit {

  public dialog: EdaDialog;

  public urls: any[];
  public clonedUrls: { [s: string]: any; } = {};

  public urlAdd: string;
  public nameAdd: string;

  constructor(
    private alertService: AlertService,
  ) { 
    super();

    this.dialog = new EdaDialog({
      show: () => this.onShow(),
      hide: () => this.onClose(EdaDialogCloseEvent.NONE),
      title: $localize`:@@opcionUrls:CONFIGURAR ACCIÓN PERSONALIZADA`,
    });
    this.dialog.style= { width: '70%', height:'55%' };
  }

  ngOnInit(): void {
    this.urls = [
      { id: 0, url: 'https://www.web1.com', name: 'Web1' },
      { id: 1, url: 'https://www.web2.com', name: 'Web2' },
      { id: 2, url: 'https://www.web3.com', name: 'Web3' },
    ]
  }

  ngAfterViewInit() {
    console.log('controlador recibido en el componente: ',this.controller.params);
  }

  onShow(): void {  
  }

  onClose(event: EdaDialogCloseEvent, response?: any): void {
    return this.controller.close(event, response);
  }

  public urlsConfirmed(): void {
    let response = {urls: 'Arreglo de urls'};
    this.onClose(EdaDialogCloseEvent.NEW, response);
  }

  public closeDialog(): void {
    this.onClose(EdaDialogCloseEvent.NONE);
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


  onRowEditInit(url:any) {
    this.clonedUrls[url.id] = {...url};
    console.log(this.clonedUrls)
    console.log('Arreglo urls -->', this.urls)
  }

  onRowEditSave(url: any){
    if(url.name.length>0 && url.url.length>0) {
        delete this.clonedUrls[url.id];
        this.alertService.addSuccess($localize`:@@urlEditSave:URL EDITADO CORRECTAMENTE`);
    }
    else {
      this.alertService.addError($localize`:@@urlEditSaveError:FORMULARIO INCORRECTO, COMPLETAR LOS CAMPOS`);
    }

    console.log('Arreglo urls -->', this.urls)

  }

  onRowEditCancel(url: any, index: number){
    this.urls[index] = this.clonedUrls[url.id];
    delete this.clonedUrls[url.id];

    console.log('index: ', index)
    console.log('Arreglo urls -->', this.urls)
  }

  onRowEditDelete(index: any) {
    this.urls = this.urls.filter( e => this.urls[index]!==e);
    console.log('Arreglo urls -->', this.urls)
  }

  addUrlDashboard(url: string, name: string) {

    // Quizas se deba verificar si es una URL de manera estandarizada - consultar con Juanjo

    if(url === undefined || name===undefined){
      this.alertService.addError($localize`:@@addUrlDashboardUndefined:VALORES NO DEFINIDOS O FALTA COMPLETAR CAMPOS.`); // Agregar el texto correcto
    }
    else {
      // Hallando el mayor valor de todos los id del arreglo urls para agregar un nuevo elemento con un id de mayor valor.
      let mayor = 0;
      for (var i = 0; i < this.urls.length; i++) {
        if(this.urls[i].id>mayor) mayor = this.urls[i].id
      }

      if(url.length>0 && name.length>0){
        this.urls.push({
          id: mayor + 1,
          url: url,
          name: name,
        });
        console.log('Arreglo urls -->', this.urls)
        this.alertService.addSuccess($localize`:@@urlAddedSuccessfully:URL AGREGADO CORRECTAMENTE`); // Agregar el texto correcto
      }
  
      else {
        this.alertService.addError($localize`:@@urlAddedIncomplete:FORMULARIO DE AGREGADO URL INCOMPLETO`); // Agregar el texto correcto
      }
    }


  }

}
