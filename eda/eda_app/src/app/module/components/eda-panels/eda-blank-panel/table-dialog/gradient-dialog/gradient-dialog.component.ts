import { Component, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import { EdaDialog, EdaDialogAbstract, EdaDialogCloseEvent } from "@eda/shared/components/shared-components.index";

import { FormsModule } from '@angular/forms'; 
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'eda-table-gradient-dialog',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './gradient-dialog.component.html',
  imports: [FormsModule, CommonModule]
  // styleUrls: ['../../../../../../assets/sass/eda-styles/components/table-dialog.component.css']
})

export class TableGradientDialogComponent extends EdaDialogAbstract{

  public dialog: EdaDialog;
  public min : string = '#ffffff';
  public max: string = '#e85656';
  public noStyle : boolean = false;

  constructor() {
    super();

    this.dialog = new EdaDialog({
      show: () => this.onShow(),
      hide: () => this.onClose(EdaDialogCloseEvent.NONE),
    });

    this.dialog.style = { width: '40%', height: '35%', 'top': '-4em', 'left': '1em' };
  }

  closeDialog(){
    this.onClose(EdaDialogCloseEvent.NONE);
  }

  onShow(): void {
    let title = $localize`:@@gradientTitle:Código de color para la columna: `;
    this.dialog.title =  `${title} ${this.controller.params.col.header}`;
    if(this.controller.params.style){
      this.min = this.controller.params.style.min;
      this.max = this.controller.params.style.max;
    }
  }
  onClose(event: EdaDialogCloseEvent, response?: any): void {
    return this.controller.close(event, response);
  }
  saveGradientConfig(){
    const properties = this.noStyle ? {col:this.controller.params.col.field, noStyle:true} : {col: this.controller.params.col.field, min:this.min, max :this.max}
    this.onClose(EdaDialogCloseEvent.UPDATE, properties);
  }

}