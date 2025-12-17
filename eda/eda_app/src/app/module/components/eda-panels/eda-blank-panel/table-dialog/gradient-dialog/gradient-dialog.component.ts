import { Component, Input, OnInit } from "@angular/core";
import { EdaDialog, EdaDialogCloseEvent } from "@eda/shared/components/shared-components.index";

import { FormsModule } from '@angular/forms'; 
import { CommonModule } from '@angular/common';
import { EdaDialog2Component } from "@eda/shared/components/shared-components.index";
import { InputSwitchModule } from "primeng/inputswitch";
import { PanelChartComponent } from "../../panel-charts/panel-chart.component";
@Component({
  standalone: true,
  selector: 'eda-table-gradient-dialog',
  templateUrl: './gradient-dialog.component.html',
  imports: [FormsModule, CommonModule, EdaDialog2Component, InputSwitchModule, PanelChartComponent]
})

export class TableGradientDialogComponent implements OnInit{
  @Input () controller: any;
  public dialog: EdaDialog;
  public min : string = '#ffffff';
  public max: string = '#e85656';
  public noStyle : boolean = false;
  public title: string;
  constructor() {}

  closeDialog(){
    this.onClose(EdaDialogCloseEvent.NONE);
  }

  ngOnInit(): void {
    console.log('hola')
    this.dialog.title =  `${$localize`:@@gradientTitle:Código de color para la columna: `} ${this.controller.params.col.header}`;
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