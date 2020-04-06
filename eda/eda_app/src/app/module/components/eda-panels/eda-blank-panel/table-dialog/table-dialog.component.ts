import { ChartType } from 'chart.js';

import { Component, ViewChild } from '@angular/core';
import { EdaDialog, EdaDialogCloseEvent } from '@eda/shared/components/eda-dialogs/eda-dialog/eda-dialog';
import { EdaDialogAbstract } from '@eda/shared/components/eda-dialogs/eda-dialog/eda-dialog-abstract';
import { MenubarModule } from 'primeng/menubar';
import { MenuItem } from 'primeng/api';
import * as _ from 'lodash';
import { PanelChart } from '../panel-charts/panel-chart';
import { PanelChartComponent } from '../panel-charts/panel-chart.component';


@Component({
  selector: 'app-table-dialog',
  templateUrl: './table-dialog.component.html',
  styleUrls: ['../../../../../../assets/eda-styles/components/table-dialog.component.css']
})

export class TableDialogComponent extends EdaDialogAbstract {

  @ViewChild('PanelChartComponent', { static: false }) myPanelChartComponent: PanelChartComponent;

  public dialog: EdaDialog;
  public panelChartConfig: PanelChart = new PanelChart();
  public items: MenuItem[];


  public row_totals;
  public col_totals;
  public col_subtotals;

  constructor() {
    super();

    this.dialog = new EdaDialog({
      show: () => this.onShow(),
      hide: () => this.onClose(EdaDialogCloseEvent.NONE),
      title: 'PROPIEDADES DE LA TABLA'
    });
  }

  setChartProperties() {

  }
  onShow(): void {
    this.panelChartConfig = this.controller.params.panelChart;
   
    if (this.panelChartConfig.layout && this.panelChartConfig.layout.tableConfig) {
      this.panelChartConfig.layout.tableConfig.visibleRows = 5;
      this.row_totals = this.panelChartConfig.layout.tableConfig.withRowTotals;
      this.col_totals = this.panelChartConfig.layout.tableConfig.withColTotals;
      this.col_subtotals = this.panelChartConfig.layout.tableConfig.withColSubTotals;
    }else{
      this.panelChartConfig.layout = {
        tableConfig:{
          withColTotals: false,
          withColSubTotals: false,
          withRowTotals: false,
          visibleRows: 5,
        }
      }
    }

    this.setItems();

  }
  private rowTotals() {
    this.myPanelChartComponent.currentConfig.withRowTotals = !this.myPanelChartComponent.currentConfig.withRowTotals;
    this.myPanelChartComponent.componentRef._component.inject.checkTotals(null);
    this.row_totals = this.myPanelChartComponent.currentConfig.withRowTotals;
    this.setItems();
  }
  private colSubTotals() {
    this.myPanelChartComponent.currentConfig.withColSubTotals = !this.myPanelChartComponent.currentConfig.withColSubTotals;
    this.myPanelChartComponent.componentRef._component.inject.checkTotals(null);
    this.col_subtotals = this.myPanelChartComponent.currentConfig.withColSubTotals;
    this.setItems();
  }
  private colTotals() {
    this.myPanelChartComponent.currentConfig.withColTotals = !this.myPanelChartComponent.currentConfig.withColTotals;
    this.myPanelChartComponent.componentRef._component.inject.checkTotals(null);
    this.col_totals = this.myPanelChartComponent.currentConfig.withColTotals;
    this.setItems();
  }



  private setItems() {

    if (this.controller.params.panelChart.chartType === 'table') {
      this.items = [
        {
          label: "Totales",
          icon: "pi pi-list",
          items: [
            {
              label: this.col_totals === true ? "Quitar totales de columna" : "Totales de columna",
              command: () => this.colTotals()
            },
            {
              label: this.col_subtotals === true ? "Quitar Subtotales de columna" : "Subtotales de columna",
              command: () => this.colSubTotals()
            }
          ]
        }
      ]
    } else {
      this.items = [

        {
          label: "Totales",
          icon: "pi pi-list",
          items: [
            {
              label: this.row_totals === true ? "Quitar totales de fila" : "Totales de fila",
              command: () => this.rowTotals()
            },
            {
              label: this.col_totals === true ? "Quitar totales de columna" : "Totales de columna",
              command: () => this.colTotals()
            },
            {
              label: this.col_subtotals === true ? "Quitar Subtotales de columna" : "Subtotales de columna",
              command: () => this.colSubTotals()
            }
          ]
        }

      ];
    }
  }
  onClose(event: EdaDialogCloseEvent, response?: any): void {
    return this.controller.close(event, response);
  }
  saveChartConfig() {
    const rows = this.controller.params.panelChart.layout &&
      this.controller.params.panelChart.layout.tableConfig ?
      this.controller.params.panelChart.layout.tableConfig.visibleRows : 10

    const properties =
    {
      withColTotals: this.col_totals,
      withColSubTotals: this.col_subtotals,
      withRowTotals: this.row_totals,
      visibleRows: rows
    }
    this.onClose(EdaDialogCloseEvent.UPDATE, properties);
  }

  closeChartConfig() {
    this.onClose(EdaDialogCloseEvent.NONE);
  }

}

