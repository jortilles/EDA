import { Component, ViewChild } from '@angular/core';
import { EdaDialog, EdaDialogAbstract, EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';



@Component({
  selector: 'app-title-dialog',
  templateUrl: './quill-editor.component.html',
  // styleUrls: ['./kpi-dialog.component.css']
})

export class TitleDialogComponent extends EdaDialogAbstract {

  // @ViewChild('Editor') editor: any;

  public dialog : EdaDialog;
  public title : string;

  constructor() {

    super();

    this.dialog = new EdaDialog({
      show: () => this.onShow(),
      hide: () => this.onClose(EdaDialogCloseEvent.NONE),
      title: $localize`:@@ChartProps:PROPIEDADES DEL GRAFICO`
    });
  }

  onShow(): void {
    this.title = this.controller.params.title;
  }
  onClose(event: EdaDialogCloseEvent, response?: any): void {
    return this.controller.close(event, response);
  }

  saveChartConfig() {
    this.onClose(EdaDialogCloseEvent.UPDATE,
      {
        title:this.title
      });
  }
  closeChartConfig() {
    this.onClose(EdaDialogCloseEvent.NONE);
  }

}