import { EdaDialogController } from './../../../../../shared/components/eda-dialogs/eda-dialog/eda-dialog-controller';
import { TableConfig } from '../panel-charts/chart-configuration-models/table-config';
import { Component, ViewChild, Input } from '@angular/core';
import { EdaDialog, EdaDialogCloseEvent } from '@eda/shared/components/eda-dialogs/eda-dialog/eda-dialog';
import { MenuItem } from 'primeng/api';
import * as _ from 'lodash';
import { PanelChart } from '../panel-charts/panel-chart';
import { PanelChartComponent } from '../panel-charts/panel-chart.component';
import { ChartConfig } from '../panel-charts/chart-configuration-models/chart-config';
import { StyleProviderService, SpinnerService } from '@eda/services/service.index';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EdaDialog2Component } from '@eda/shared/components/shared-components.index';
import { MenubarModule } from 'primeng/menubar';
import { TableGradientDialogComponent } from './gradient-dialog/gradient-dialog.component';
import { PredictionDialogComponent, PredictionConfig, QueryColumn } from '../prediction-dialog/prediction-dialog.component';
import { QueryUtils } from '../panel-utils/query-utils';

@Component({
  standalone: true,
  selector: 'app-table-dialog',
  templateUrl: './table-dialog.component.html',
  styleUrls: ['../../../../../../assets/sass/eda-styles/components/table-dialog.component.css'],
  imports: [CommonModule, FormsModule, EdaDialog2Component, MenubarModule, TableGradientDialogComponent, PanelChartComponent, PredictionDialogComponent]
})

export class TableDialogComponent{
  @Input() controller: any;
  @Input() dashboard: any;
  @ViewChild('PanelChartComponent', { static: false }) myPanelChartComponent: PanelChartComponent;

  public dialog: EdaDialog;
  public panelChartConfig: PanelChart = new PanelChart();
  public items: MenuItem[];

  public gradientMenuController: EdaDialogController;
  // TODO REVISAR EL CONTROLADOR CUANDO SE INICIA

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
  public negativeNumbers : boolean = false;
  public ordering: Array<any> = [];

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
  public seeRepetitions: string = $localize`:@@seeHideRepetitions: ver/ocultar valores repetidos`;
  public withRepetitions: string = $localize`:@@seeRepetitions: ver valores repetidos`;
  public withNoRepetitions: string = $localize`:@@hideRepetitions: ocultar valores repetidos`;
  public withNegativeNumbers: string = $localize`:@@withNegativeNumbers: Con números negativos`;
  public withoutNegativeNumbers: string = $localize`:@@withoutNegativeNumbers: Sin números negativos`;
  public seeNegativeNumbers: string = $localize`:@@seeNegativeNumbers: Números negativos`;

  public tableTitleDialog = $localize`:@@tableTitleDialog:Propiedades de la tabla`;
  public display: boolean = false;
  public title: string = this.tableTitleDialog;

  public showPredictionDialog: boolean = false;
  public showPredictionCol: boolean = false;
  public predictionMethod: string = 'Arima';

  private originalPrediction: string;
  private pendingPrediction: PredictionConfig | null = null;

  public addPrediction: string = $localize`:@@showLinesPrediction:Mostrar Predicción`;
  public removePrediction: string = $localize`:@@removePrediction:Quitar Predicción`;

  constructor(private styleProviderService: StyleProviderService, private spinnerService: SpinnerService) {}

  setChartProperties() {
    this.setCols();
    this.styles = this.myPanelChartComponent.componentRef.instance.inject.styles || []; // si es null regresa vacio
  }
  ngOnInit(): void {
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
      this.ordering = config.ordering;
      this.negativeNumbers = config.negativeNumbers;
    } else {
      this.panelChartConfig.config = new ChartConfig(
        new TableConfig(false, false, 5, false, false, false, false, null, null, null, false, false, [])
      )
    }
    // Leer el estado actual de predicción del panel
    const panelID = this.controller?.params?.panelId;
    const dashboardPanel = this.dashboard?.edaPanels?.toArray().find((cmp: any) => cmp.panel.id === panelID);
    const existingPrediction = dashboardPanel?.panel?.content?.query?.query?.prediction;
    this.showPredictionCol = !!(existingPrediction && existingPrediction !== 'None');
    if (this.showPredictionCol) {
      this.predictionMethod = existingPrediction;
    }
    this.originalPrediction = dashboardPanel?.panel?.content?.query?.query?.prediction;
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

    // this.negativeNumbers = !this.negativeNumbers;
    // currentConfig.noRepetitions = !currentConfig.negativeNumbers;

    this.setItems();
  }

  private noNegativeNumbers() {

    const currentConfig = this.myPanelChartComponent.currentConfig;

    currentConfig.negativeNumbers = !currentConfig.negativeNumbers;
    this.myPanelChartComponent.componentRef.instance.inject.checkTotals(null);
    this.negativeNumbers = currentConfig.negativeNumbers;


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
    this.setItems(); // Aqui se busca la modificación de colores
  }

  get queryNumericColumns(): QueryColumn[] {
    const panelID = this.controller?.params?.panelId;
    if (!panelID || !this.dashboard) return [];
    const dashboardPanel = this.dashboard.edaPanels?.toArray().find((cmp: any) => cmp.panel.id === panelID);
    const fields: any[] = dashboardPanel?.panel?.content?.query?.query?.fields;
    if (!fields) return [];
    return fields
      .filter((f: any) => f.column_type === 'numeric')
      .map((f: any) => ({
        column_name: f.column_name,
        table_id: f.table_id,
        display_name: f.display_name?.default || f.column_name
      }));
  }

  setPredictionCol() {
    if (this.showPredictionCol) {
      this.showPredictionDialog = true;
    } else {
      this.pendingPrediction = null;
      // Si había predicción activa, recargar la preview sin predicción
      if (this.originalPrediction && this.originalPrediction !== 'None') {
        this.runPreviewQuery(null);
      }
      this.setItems();
    }
  }

  async confirmPrediction(predictionConfig: PredictionConfig) {
    this.showPredictionDialog = false;
    this.predictionMethod = predictionConfig.method;
    this.pendingPrediction = predictionConfig;
    await this.runPreviewQuery(predictionConfig);
    this.setItems();
  }

  private async runPreviewQuery(pred: PredictionConfig | null) {
    const panelID = this.controller?.params?.panelId;
    const dashboardPanel = this.dashboard?.edaPanels?.toArray().find((cmp: any) => cmp.panel.id === panelID);
    if (!dashboardPanel) return;

    this.spinnerService.on();
    try {
      // Setear temporalmente la predicción para construir la query
      const origPred = dashboardPanel.panel.content.query.query.prediction;
      const origPredConfig = dashboardPanel.panel.content.query.query.predictionConfig;

      dashboardPanel.panel.content.query.query.prediction = pred ? pred.method : 'None';
      dashboardPanel.panel.content.query.query.predictionConfig = pred ? {
        steps: pred.steps,
        targetColumn: pred.targetColumn,
        arimaParams: pred.arimaParams,
        tensorflowParams: pred.tensorflowParams,
      } : null;

      const query = QueryUtils.switchAndBuildQuery(dashboardPanel);

      // Revertir inmediatamente (sincrónico, antes del await)
      dashboardPanel.panel.content.query.query.prediction = origPred;
      dashboardPanel.panel.content.query.query.predictionConfig = origPredConfig;

      // Ejecutar la query directamente sin pasar por runQueryFromDashboard
      const response = await dashboardPanel.dashboardService.executeQuery(query).toPromise();
      const chartLabels = dashboardPanel.chartUtils.uniqueLabels(response[0]);
      const chartData = response[1];

      // Actualizar solo la preview del dialog
      this.panelChartConfig = new PanelChart({
        ...this.panelChartConfig,
        data: { labels: chartLabels, values: chartData },
      });
    } finally {
      this.spinnerService.off();
    }
  }

  cancelPrediction() {
    this.showPredictionDialog = false;
    this.showPredictionCol = false;
  }

  onClose(event: EdaDialogCloseEvent, response?: any): void {
    return this.controller.close(event, response);
  }

  async saveChartConfig() {
    const config = (<TableConfig>this.panelChartConfig.config.getConfig());
    const rows = config.visibleRows;
    const sortedSerie = config.sortedSerie;
    const sortedColumn = config.sortedColumn;
    const styles = this.styles;

    const properties = new TableConfig(this.onlyPercentages, this.resultAsPecentage, rows,
      this.col_subtotals, this.col_totals, this.row_totals, this.trend, sortedSerie, sortedColumn, styles,
      this.noRepetitions, this.negativeNumbers, this.ordering);

    // Aplicar cambios de predicción al dashboard solo al confirmar
    const panelID = this.controller?.params?.panelId;
    const dashboardPanel = this.dashboard?.edaPanels?.toArray().find((cmp: any) => cmp.panel.id === panelID);
    const hadPrediction = !!(this.originalPrediction && this.originalPrediction !== 'None');
    const predictionChanged = (this.showPredictionCol && this.pendingPrediction !== null) ||
                              (!this.showPredictionCol && hadPrediction);

    if (dashboardPanel && predictionChanged) {
      if (this.showPredictionCol && this.pendingPrediction) {
        dashboardPanel.panel.content.query.query.prediction = this.pendingPrediction.method;
        dashboardPanel.panel.content.query.query.predictionConfig = {
          steps: this.pendingPrediction.steps,
          targetColumn: this.pendingPrediction.targetColumn,
          arimaParams: this.pendingPrediction.arimaParams,
          tensorflowParams: this.pendingPrediction.tensorflowParams,
        };
      } else {
        dashboardPanel.panel.content.query.query.prediction = 'None';
        dashboardPanel.panel.content.query.query.predictionConfig = null;
      }
      this.spinnerService.on();
      try {
        await dashboardPanel.runQueryFromDashboard(true);
      } finally {
        this.spinnerService.off();
      }
    }

    this.onClose(EdaDialogCloseEvent.UPDATE, properties);
  }

  closeChartConfig() {
    this.onClose(EdaDialogCloseEvent.NONE);
  }

  private onCloseGradientController(event, response, col?) {
    try {
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
    } finally {
      this.gradientMenuController = undefined;
    }
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
          }),
          disabled: this.onlyPercentages
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
        },
        {
          label: this.seeNegativeNumbers,
          icon: "pi pi-list",
          items: [
            {
              label: this.negativeNumbers !== true ? this.withoutNegativeNumbers : this.withNegativeNumbers,
              command: () => this.noNegativeNumbers()
            }
          ]
        },
        {
          label: this.showPredictionCol ? this.removePrediction : this.addPrediction,
          icon: "pi pi-chart-line",
          command: () => {
            this.showPredictionCol = !this.showPredictionCol;
            this.setPredictionCol();
          }
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
          }),
          disabled: this.onlyPercentages
        }

      ];
    }
  }

}

