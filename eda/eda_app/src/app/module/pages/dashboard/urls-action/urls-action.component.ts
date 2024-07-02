import { Component, AfterViewInit, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { AlertService } from '@eda/services/service.index';
import { EdaDialog, EdaDialogAbstract, EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';

@Component({
  selector: 'urls-action',
  templateUrl: './urls-action.component.html',
  styleUrls: [],
})
export class UrlsActionComponent extends EdaDialogAbstract  implements AfterViewInit, OnInit {

  public dialog: EdaDialog;
  public form: UntypedFormGroup;

  public urls: any[];
  public clonedUrls: { [s: string]: any; } = {};

  constructor(
    private alertService: AlertService,
    private formBuilder: UntypedFormBuilder

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
      { id: 1, url: 'https://www.web1.com', name: 'Web1' },
      { id: 2, url: 'https://www.web2.com', name: 'Web2' },
      { id: 3, url: 'https://www.web3.com', name: 'Web3' },
      { id: 4, url: 'https://www.web4.com', name: 'Web4' },
      { id: 5, url: 'https://www.web5.com', name: 'Web5' },
      { id: 6, url: 'https://www.web6.com', name: 'Web6' },
      { id: 7, url: 'https://www.web7.com', name: 'Web7' },
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

  /////////////////////////////////////////////

  onRowEditInit(url:any) {
    this.clonedUrls[url.id] = {...url};
    console.log(this.clonedUrls)
    console.log('Arreglo urls -->', this.urls)
  }

  onRowEditSave(url: any){
    if(url.name.length>0 && url.url.length>0) {
        delete this.clonedUrls[url.id];
        this.alertService.addSuccess($localize`:@@dahsboardSaved:Inforsadsardado correctamente`); // Agregar el texto correcto
    }
    else {
      this.alertService.addError($localize`:@@IncorrectForm:Formulario incorrecto. Revise los campos obligatorios.`); // Agregar el texto correcto
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
    delete this.urls[index];
    console.log('Arreglo urls -->', this.urls)
  }

}
