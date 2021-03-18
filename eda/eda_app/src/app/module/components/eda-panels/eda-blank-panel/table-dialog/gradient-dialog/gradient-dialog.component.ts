import { Component } from "@angular/core";
import { EdaDialog, EdaDialogAbstract, EdaDialogCloseEvent } from "@eda/shared/components/shared-components.index";

@Component({
  selector: 'eda-table-gradient-dialog',
  templateUrl: './gradient-dialog.component.html',
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

    this.dialog.style = { width: '40%', height: '35%', 'top': '-184px', 'left': '-20px' };
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