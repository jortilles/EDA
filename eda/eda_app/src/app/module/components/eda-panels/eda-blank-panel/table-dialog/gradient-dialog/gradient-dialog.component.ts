import { Component, Input, OnInit } from "@angular/core";
import { EdaDialog, EdaDialogCloseEvent } from "@eda/shared/components/shared-components.index";

import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { EdaDialog2Component } from "@eda/shared/components/shared-components.index";
import { InputSwitchModule } from "primeng/inputswitch";
import { PanelChartComponent } from "../../panel-charts/panel-chart.component";
import { ColorPickerModule } from "primeng/colorpicker";
import { TabViewModule } from 'primeng/tabview';
import { InputNumberModule } from 'primeng/inputnumber';

@Component({
  standalone: true,
  selector: 'eda-table-gradient-dialog',
  templateUrl: './gradient-dialog.component.html',
  imports: [FormsModule, CommonModule, EdaDialog2Component, InputSwitchModule, PanelChartComponent, ColorPickerModule, TabViewModule, InputNumberModule]
})

export class TableGradientDialogComponent implements OnInit{
  @Input () controller: any;

  // Gradient properties
  public activeTabIndex: number = 0;
  public min : string = '#ffffff';
  public max: string = '#e85656';

  // Semaphore properties
  public value1: number = 0;
  public value2: number = 0;
  public color1: string = '#4caf50';
  public color2: string = '#ff9800';
  public color3: string = '#f44336';

  public noStyle : boolean = false;
  public title: string;
  constructor() {}

  closeDialog(){
    this.onClose(EdaDialogCloseEvent.NONE);
  }

  ngOnInit(): void {
    this.title =  `${$localize`:@@gradientTitle:Código de color para la columna: `} ${this.controller.params.col.header}`;
    if(this.controller.params.style){
      const style = this.controller.params.style;
      // Recuperamos los valores del dialog dependiendo del style guardado que tenemos
      if (style.type === 'gradient') {
        this.activeTabIndex = 0;
        this.min = style.min;
        this.max = style.max;
      } else {
        this.activeTabIndex = 1;
        this.value1 = style.value1;
        this.value2 = style.value2;
        this.color1 = style.color1;
        this.color2 = style.color2;
        this.color3 = style.color3;
      }
    }
  }

  onClose(event: EdaDialogCloseEvent, response?: any): void {
    return this.controller.close(event, response);
  }

  saveGradientConfig(){
    // Si no tenemos estilos da igual el tab
    if (this.noStyle) {
      this.onClose(EdaDialogCloseEvent.UPDATE, { col: this.controller.params.col.field, noStyle: true });
      return; //cancelamos la asignación de colores a posterior
    }
    // Asignamos colores
    if (this.activeTabIndex === 0) { 
      // Gradiente tab 
      const properties = { 
        col: this.controller.params.col.field, 
        type: 'gradient', 
        min: this.min, 
        max: this.max ,
      };
      this.onClose(EdaDialogCloseEvent.UPDATE, properties);
    } else {
      // Semaforo tab
      const properties = {
        col: this.controller.params.col.field,
        type: 'semaphore',
        value1: this.value1,
        value2: this.value2,
        color1: this.color1,
        color2: this.color2,
        color3: this.color3
      };
      this.onClose(EdaDialogCloseEvent.UPDATE, properties);
    }
  }
}