import { EdaDialogController } from './../../../../../shared/components/eda-dialogs/eda-dialog/eda-dialog-controller';
import { TableConfig } from '../panel-charts/chart-configuration-models/table-config';
import { Component, ViewChild, AfterViewInit, Inject } from '@angular/core';
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

export class TableDialogComponent extends EdaDialogAbstract implements AfterViewInit {

  @ViewChild('PanelChartComponent', { static: false }) myPanelChartComponent: PanelChartComponent;

  public dialog: EdaDialog;
  public panelChartConfig: PanelChart = new PanelChart();
  public items: MenuItem[];

  public gradientMenuController: EdaDialogController;


  public row_totals;
  public col_totals;
  public col_subtotals;
  public resultAsPecentage;
  public onlyPercentages;
  public trend;
  public sortedSerie;
  public sortedColumn;
  public cols: Array<any> = [];
  public styles = [];
  public noRepetitions : boolean = false;

  /**Strings */
  public addTotals: string = $localize`:@@addTotals:Totales`;
  public addPercentages: string = $localize`:@@addPercentages:Porcentajes`;
  public addStyles: string = $localize`:@@addStyles:Código de color`;
  public removeRowTotals: string = $localize`:@@removeRowTotals:Quitar totales de fila`
  public removeColSubtotals: string = $localize`:@@removeColSubtotals:Quitar subtotales de columna`
  public addRowTotals: string = $localize`:@@addRowTotals:Totales de fila`
  public addColSubtotals: string = $localize`:@@addColSubtotals:Subtotales de columna`
  public addColTotals: string = $localize`:@@addColTotals:Totales de columna`;
  public removeColTotals: string = $localize`:@@removeColTotals:Quitar totales de columna`;
  public addOnlyPercentages: string = $localize`:@@addOnlyPercentages:Sólo Porcentajes`;
  public addOnlyValues: string = $localize`:@@addOnlyValues:Sólo valores`;
  public addValuesPercentages: string = $localize`:@@addValuesPercentages:Valores y Porcentajes`;
  public addTrend: string = $localize`:@@addtrend:Tendencia`;
  public removeTrend: string = $localize`:@@removetrend:Quitar tendencia`;
  public seeRepetitions: string = $localize`:@@seeRepetitions: ver/ocultar valores repetidos`;
  public withRepetitions: string = $localize`:@@seeRepetitions: ver valores repetidos`;
  public withNoRepetitions: string = $localize`:@@seeRepetitions: ocultar valores repetidos`;

  public tableTitleDialog = $localize`:@@tableTitleDialog:Propiedades de la tabla`;

  constructor() {
    super();

    this.dialog = new EdaDialog({
      show: () => this.onShow(),
      hide: () => this.onClose(EdaDialogCloseEvent.NONE),
      title: this.tableTitleDialog
    });
    this.dialog.style = { width: '80%', height: '70%', top:"-4em", left:'1em'};
  }
  ngAfterViewInit(): void {

  }

  setChartProperties() {
    this.setCols();
    this.styles = this.myPanelChartComponent.componentRef.instance.inject.styles || [];
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
      this.noRepetitions = config.noRepetitions;
    } else {
      this.panelChartConfig.config = new ChartConfig(
        new TableConfig(false, false, 5, false, false, false, false, null, null, null, false)
      )
    }

    this.setItems();

  }


  private rowTotals() {
    const currentConfig = this.myPanelChartComponent.currentConfig;
    currentConfig.withTrend = false;
    currentConfig.withRowTotals = !currentConfig.withRowTotals;
    this.myPanelChartComponent.componentRef.instance.inject.checkTotals(null);
    this.row_totals = currentConfig.withRowTotals;
    this.setItems();
  }

  private rowTrend() {
    const currentConfig = this.myPanelChartComponent.currentConfig;
    currentConfig.withRowTotals = false;
    currentConfig.withTrend = !currentConfig.withTrend;
    this.myPanelChartComponent.componentRef.instance.inject.checkTotals(null);
    this.trend = currentConfig.withTrend;
    this.setItems();
  }

  private colSubTotals() {

    const currentConfig = this.myPanelChartComponent.currentConfig;

    if (this.onlyPercentages) return;
    currentConfig.withColSubTotals = !currentConfig.withColSubTotals;
    this.myPanelChartComponent.componentRef.instance.inject.checkTotals(null);
    this.col_subtotals = currentConfig.withColSubTotals;
    this.setItems();
  }

  private colTotals() {

    const currentConfig = this.myPanelChartComponent.currentConfig;

    if (this.onlyPercentages) return;

    currentConfig.withColTotals = !currentConfig.withColTotals;
    this.myPanelChartComponent.componentRef.instance.inject.checkTotals(null);
    this.col_totals = currentConfig.withColTotals;

    this.setItems();
  }

  private noRepeat() {

    const currentConfig = this.myPanelChartComponent.currentConfig;
    currentConfig.noRepetitions = !currentConfig.noRepetitions;
    this.myPanelChartComponent.componentRef.instance.inject.checkTotals(null);
    this.noRepetitions = currentConfig.noRepetitions;

    
    this.setItems();
  }

  private percentages() {

    const currentConfig = this.myPanelChartComponent.currentConfig;
    if (this.onlyPercentages === true) {

      currentConfig.resultAsPecentage = true;
      currentConfig.onlyPercentages = false;

    } else {

      currentConfig.resultAsPecentage = !currentConfig.resultAsPecentage;
      currentConfig.onlyPercentages = false;

    }

    this.myPanelChartComponent.componentRef.instance.inject.checkTotals(null);
    this.resultAsPecentage = currentConfig.resultAsPecentage;
    this.onlyPercentages = currentConfig.onlyPercentages;
    this.setCols();
    this.setItems();
  }

  private setOnlyPercentages() {

    const currentConfig = this.myPanelChartComponent.currentConfig;

    currentConfig.resultAsPecentage = !currentConfig.onlyPercentages;
    currentConfig.onlyPercentages = !currentConfig.onlyPercentages;

    //no totals
    currentConfig.withColSubTotals = false;
    this.col_subtotals = currentConfig.withColSubTotals;

    currentConfig.withColTotals = false;
    this.col_totals = currentConfig.withColTotals;


    this.myPanelChartComponent.componentRef.instance.inject.checkTotals(null);
    this.resultAsPecentage = currentConfig.resultAsPecentage;
    this.onlyPercentages = currentConfig.onlyPercentages;
    this.setCols();
    //this.setItems();

  }

  private setStyle(col) {
    if (this.controller.params.panelChart.chartType === 'table') {
      this.gradientMenuController = new EdaDialogController({
        params: {
          col: col,
          style: this.styles.filter(style => style.col === col.field)[0]
        },
        close: (event, response) => this.onCloseGradientController(event, response)
      })
    } else {
      this.gradientMenuController = new EdaDialogController({
        params: {
          col: col,
          style: this.styles.filter(style => style.col === col.header)[0]
        },
        close: (event, response) => this.onCloseGradientController(event, response, col)
      })
    }
  }

  private setCols() {

    if (this.controller.params.panelChart.chartType === 'table') {

      if (this.onlyPercentages) {
        this.cols = this.myPanelChartComponent.componentRef.instance.inject.cols.filter(col => col.type === "EdaColumnPercentage");
      }
      else {
        this.cols = this.myPanelChartComponent.componentRef.instance.inject.cols.filter(col => col.type === "EdaColumnNumber" || col.type === "EdaColumnPercentage");
      }
    } else {
      // El codigo de color solo aplica a un nivel de crosstab
      this.cols = [];

      let series = this.myPanelChartComponent.componentRef.instance.inject.series;

      let cols = new Map();

      series[series.length - 1].labels.forEach(serie => {
        if (!cols.has(serie.metric)) {
          cols.set(serie.metric, [serie.column])
        }
        else {
          let col = cols.get(serie.metric);
          col.push(serie.column);
          cols.set(serie.metric, col);
        }
      });

      cols.forEach((value, key) => {
        this.cols.push({ header: key, col: value, field: key })
      });

      /**Remove trend col */
      this.cols = this.cols.filter(col => col.header !== undefined);

      if (this.onlyPercentages) this.cols = [];
    }
    this.setItems();
  }

  onClose(event: EdaDialogCloseEvent, response?: any): void {
    return this.controller.close(event, response);
  }
  
  saveChartConfig() {

    const config = (<TableConfig>this.panelChartConfig.config.getConfig());
    const rows = config.visibleRows;
    const sortedSerie = config.sortedSerie;
    const sortedColumn = config.sortedColumn;
    const styles = this.styles;

    const properties = new TableConfig(this.onlyPercentages, this.resultAsPecentage, rows,
      this.col_subtotals, this.col_totals, this.row_totals, this.trend, sortedSerie, sortedColumn, styles, this.noRepetitions);

    this.onClose(EdaDialogCloseEvent.UPDATE, properties);
  }

  closeChartConfig() {
    this.onClose(EdaDialogCloseEvent.NONE);
  }

  private onCloseGradientController(event, response, col?) {

    if (!_.isEqual(event, EdaDialogCloseEvent.NONE)) {

      this.styles = this.styles.filter(style => style.col !== response.col);

      if (!response.noStyle) {
        if (this.controller.params.panelChart.chartType === 'table') {
          this.styles.push(response);
        } else {
          response.col = col.header;
          response.cols = col.col
          this.styles.push(response);
        }
      }
    }
    if (!this.myPanelChartComponent.componentRef.instance.inject.pivot) {

      this.myPanelChartComponent.componentRef.instance.applyStyles(this.styles);

    } else {

      this.myPanelChartComponent.componentRef.instance.applyPivotSyles(this.styles);

    }
    this.gradientMenuController = undefined;
  }

  private setItems() {

    if (this.controller.params.panelChart.chartType === 'table') {
      this.items = [
        {
          label: this.addTotals,
          icon: "pi pi-list",
          items: [
            {
              label: this.col_totals === true ? this.removeColTotals : this.addColTotals,
              command: () => this.colTotals()
            },
            {
              label: this.col_subtotals === true ? this.removeColSubtotals : this.addColSubtotals,
              command: () => this.colSubTotals()
            }
          ]
        },
        {
          label: this.addPercentages,
          icon: "pi pi-list",
          items: [
            {
              label: !this.resultAsPecentage || this.onlyPercentages ? this.addValuesPercentages : this.addOnlyValues,
              icon: " ",
              command: () => this.percentages()
            },
            {
              label: !this.onlyPercentages ? this.addOnlyPercentages : this.addOnlyValues,
              icon: " ",
              command: () => this.setOnlyPercentages()
            }
          ]
        },
        {
          label: this.addStyles,
          icon: "pi pi-list",
          items: this.cols.map(col => {
            return {
              label: col.header,
              icon: " ",
              command: () => this.setStyle(col)
            }
          })
        },
        {
          label: this.seeRepetitions,
          icon: "pi pi-list",
          items: [
            {
              label: this.noRepetitions !== true ? this.withNoRepetitions : this.withRepetitions,
              command: () => this.noRepeat()
            }
          ]
        }
      ]
    } else {
      this.items = [
        {
          label: this.addTotals,
          icon: "pi pi-list",
          items: [
            {
              label: this.row_totals === true ? this.removeRowTotals : this.addRowTotals,
              disabled: this.trend,
              command: () => this.rowTotals()
            },
            {
              label: this.trend === true ? this.removeTrend : this.addTrend,
              disabled: this.row_totals,
              command: () => this.rowTrend()
            },
            {
              label: this.col_totals === true ? this.removeColTotals : this.addColTotals,
              command: () => this.colTotals()
            },
            {
              label: this.col_subtotals === true ? this.removeColSubtotals : this.addColSubtotals,
              command: () => this.colSubTotals()
            }
          ]
        },
        {
          label: this.addPercentages,
          icon: "pi pi-list",
          items: [

            {
              label: !this.resultAsPecentage || this.onlyPercentages ? this.addValuesPercentages : this.addOnlyValues,
              icon: " ",
              command: () => this.percentages()
            },
            {
              label: !this.onlyPercentages ? this.addOnlyPercentages : this.addOnlyValues,
              icon: " ",
              command: () => this.setOnlyPercentages()
            }
          ]
        },
        {
          label: this.addStyles,
          icon: "pi pi-list",
          items: this.cols.map(col => {
            return {
              label: col.header,
              icon: " ",
              command: () => this.setStyle(col)
            }
          })
        }

      ];
    }
  }

}

