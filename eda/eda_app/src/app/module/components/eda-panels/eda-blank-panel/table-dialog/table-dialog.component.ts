import { ChartType } from 'chart.js';

import { Component, ViewChild, OnDestroy } from '@angular/core';
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
  public resultAsPecentage;
  public onlyPercentages;

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
      this.resultAsPecentage = this.panelChartConfig.layout.tableConfig.resultAsPecentage;
      this.onlyPercentages = this.panelChartConfig.layout.tableConfig.onlyPercentages;
    } else {
      this.panelChartConfig.layout = {
        tableConfig: {
          withColTotals: false,
          withColSubTotals: false,
          withRowTotals: false,
          visibleRows: 5,
          resultAsPecentage: false,
          onlyPercentages: false
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
    if (this.onlyPercentages) return;
    this.myPanelChartComponent.currentConfig.withColSubTotals = !this.myPanelChartComponent.currentConfig.withColSubTotals;
    this.myPanelChartComponent.componentRef._component.inject.checkTotals(null);
    this.col_subtotals = this.myPanelChartComponent.currentConfig.withColSubTotals;
    this.setItems();
  }
  private colTotals() {
    if (this.onlyPercentages) return;
    this.myPanelChartComponent.currentConfig.withColTotals = !this.myPanelChartComponent.currentConfig.withColTotals;
    this.myPanelChartComponent.componentRef._component.inject.checkTotals(null);
    this.col_totals = this.myPanelChartComponent.currentConfig.withColTotals;
    this.setItems();
  }

  private percentages() {
    if (this.onlyPercentages === true) {

      this.myPanelChartComponent.currentConfig.resultAsPecentage = true;
      this.myPanelChartComponent.currentConfig.onlyPercentages = false;

    } else {

      this.myPanelChartComponent.currentConfig.resultAsPecentage = !this.myPanelChartComponent.currentConfig.resultAsPecentage;
      this.myPanelChartComponent.currentConfig.onlyPercentages = false;

    }


    this.myPanelChartComponent.componentRef._component.inject.checkTotals(null);
    this.resultAsPecentage = this.myPanelChartComponent.currentConfig.resultAsPecentage;
    this.onlyPercentages = this.myPanelChartComponent.currentConfig.onlyPercentages;
    this.setItems();
  }

  private setOnlyPercentages() {

    this.myPanelChartComponent.currentConfig.resultAsPecentage = !this.myPanelChartComponent.currentConfig.onlyPercentages;
    this.myPanelChartComponent.currentConfig.onlyPercentages = !this.myPanelChartComponent.currentConfig.onlyPercentages;

    //no totals
    this.myPanelChartComponent.currentConfig.withColSubTotals = false;
    this.col_subtotals = this.myPanelChartComponent.currentConfig.withColSubTotals;

    this.myPanelChartComponent.currentConfig.withColTotals = false;
    this.col_totals = this.myPanelChartComponent.currentConfig.withColTotals;


    this.myPanelChartComponent.componentRef._component.inject.checkTotals(null);
    this.resultAsPecentage = this.myPanelChartComponent.currentConfig.resultAsPecentage;
    this.onlyPercentages = this.myPanelChartComponent.currentConfig.onlyPercentages;
    this.setItems();

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
      visibleRows: rows,
      resultAsPecentage: this.resultAsPecentage,
      onlyPercentages: this.onlyPercentages

    }

    this.onClose(EdaDialogCloseEvent.UPDATE, properties);
  }

  closeChartConfig() {
    this.onClose(EdaDialogCloseEvent.NONE);
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
        },
        {
          label: "Porcentajes",
          icon: "pi pi-list",
          items: [
            {
              label: !this.resultAsPecentage || this.onlyPercentages ? "Valores y porcentajes" : "Sólo valores",
              icon: " ",
              command: () => this.percentages()
            },
            {
              label: !this.onlyPercentages ? "Sólo porcentajes" : "Sólo valores",
              icon: " ",
              command: () => this.setOnlyPercentages()
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
        },
        {
          label: "Porcentajes",
          icon: "pi pi-list",
          items: [

            {
              label: !this.resultAsPecentage || this.onlyPercentages ? "Valores y porcentajes" : "Sólo valores",
              icon: " ",
              command: () => this.percentages()
            },
            {
              label: !this.onlyPercentages ? "Sólo porcentajes" : "Sólo valores",
              icon: " ",
              command: () => this.setOnlyPercentages()
            }
          ]
        }

      ];
    }
  }

}

