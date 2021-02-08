import { TableConfig } from '../panel-charts/chart-configuration-models/table-config';
import { Component, ViewChild } from '@angular/core';
import { EdaDialog, EdaDialogCloseEvent } from '@eda/shared/components/eda-dialogs/eda-dialog/eda-dialog';
import { EdaDialogAbstract } from '@eda/shared/components/eda-dialogs/eda-dialog/eda-dialog-abstract';
import { MenuItem } from 'primeng/api';
import * as _ from 'lodash';
import { PanelChart } from '../panel-charts/panel-chart';
import { PanelChartComponent } from '../panel-charts/panel-chart.component';
import { ChartConfig } from '../panel-charts/chart-configuration-models/chart-config';


@Component({
  selector: 'app-table-dialog',
  templateUrl: './table-dialog.component.html',
  styleUrls: ['../../../../../../assets/sass/eda-styles/components/table-dialog.component.css']
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
  public trend;
  public sortedSerie;
  public sortedColumn;

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
    if (this.panelChartConfig && this.panelChartConfig.config) {
      const config = (<TableConfig>this.panelChartConfig.config.getConfig());
      this.row_totals = config.withRowTotals;
      this.col_totals = config.withColTotals;
      this.col_subtotals = config.withColSubTotals;
      this.resultAsPecentage = config.resultAsPecentage;
      this.onlyPercentages = config.onlyPercentages;
      this.trend = config.withTrend;
      this.sortedSerie = config.sortedSerie;
      this.sortedColumn = config.sortedColumn;
    } else {
      this.panelChartConfig.config = new ChartConfig(
        new TableConfig(false, false, 5, false, false, false, false, null, null)
      )
    }
    this.setItems();

  }


  private rowTotals() {
    this.myPanelChartComponent.currentConfig.withTrend = false;
    this.myPanelChartComponent.currentConfig.withRowTotals = !this.myPanelChartComponent.currentConfig.withRowTotals;
    this.myPanelChartComponent.componentRef.instance.inject.checkTotals(null);
    this.row_totals = this.myPanelChartComponent.currentConfig.withRowTotals;
    this.setItems();
  }

  private rowTrend(){
    this.myPanelChartComponent.currentConfig.withRowTotals = false;
    this.myPanelChartComponent.currentConfig.withTrend = !this.myPanelChartComponent.currentConfig.withTrend;
    this.myPanelChartComponent.componentRef.instance.inject.checkTotals(null);
    this.trend = this.myPanelChartComponent.currentConfig.withTrend;
    this.setItems();
  }

  private colSubTotals() {
  
    if (this.onlyPercentages) return;
    this.myPanelChartComponent.currentConfig.withColSubTotals = !this.myPanelChartComponent.currentConfig.withColSubTotals;
    this.myPanelChartComponent.componentRef.instance.inject.checkTotals(null);
    this.col_subtotals = this.myPanelChartComponent.currentConfig.withColSubTotals;
    this.setItems();
  }
  private colTotals() {
    if (this.onlyPercentages) return;
    this.myPanelChartComponent.currentConfig.withColTotals = !this.myPanelChartComponent.currentConfig.withColTotals;
    this.myPanelChartComponent.componentRef.instance.inject.checkTotals(null);
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


    this.myPanelChartComponent.componentRef.instance.inject.checkTotals(null);
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


    this.myPanelChartComponent.componentRef.instance.inject.checkTotals(null);
    this.resultAsPecentage = this.myPanelChartComponent.currentConfig.resultAsPecentage;
    this.onlyPercentages = this.myPanelChartComponent.currentConfig.onlyPercentages;
    this.setItems();

  }

  onClose(event: EdaDialogCloseEvent, response?: any): void {
    return this.controller.close(event, response);
  }
  saveChartConfig() {
    const config = (<TableConfig>this.panelChartConfig.config.getConfig());
    const rows = config.visibleRows;
    const sortedSerie = config.sortedSerie;
    const sortedColumn = config.sortedColumn

    const properties = new TableConfig(this.onlyPercentages, this.resultAsPecentage, rows, 
      this.col_subtotals, this.col_totals, this.row_totals, this.trend, sortedSerie, sortedColumn);

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
              disabled : this.trend,
              command: () => this.rowTotals()
            },
            {
              label: this.trend === true ? "Quitar Tendencia" : "Tendencia",
              disabled : this.row_totals,
              command: () => this.rowTrend()
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

