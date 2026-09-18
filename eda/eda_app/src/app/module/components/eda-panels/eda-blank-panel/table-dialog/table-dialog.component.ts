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
import { DEFAULT_TABLE_HEADER_COLOR, DEFAULT_TABLE_BANDING_COLOR } from '@eda/configs/customizable/customizable_default';
import { ColorPickerModule } from 'primeng/colorpicker';
import { MultiSelectModule } from 'primeng/multiselect';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@Component({
  standalone: true,
  selector: 'app-table-dialog',
  templateUrl: './table-dialog.component.html',
  styleUrls: ['../../../../../../assets/sass/eda-styles/components/table-dialog.component.css'],
  imports: [CommonModule, FormsModule, EdaDialog2Component, MenubarModule, TableGradientDialogComponent, PanelChartComponent, PredictionDialogComponent, ColorPickerModule, MultiSelectModule, ProgressSpinnerModule]
})

export class TableDialogComponent{
  @Input() controller: any;
  @Input() dashboard: any;
  @ViewChild('PanelChartComponent', { static: false }) myPanelChartComponent: PanelChartComponent;

  public dialog: EdaDialog;
  public panelChartConfig: PanelChart = new PanelChart();
  public items: MenuItem[];

  public gradientMenuController: EdaDialogController;
  // TODO REVIEW THE CONTROLLER WHEN IT STARTS

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
  public crossSortOrder: string = 'alphabetical';

  public headerColor: string = '';
  public bandingColor: string = '';
  public colorEnabled: boolean = true;

  /** Ordered column names to nest grouped subtotals by (e.g. [pais, ciudad]) — see
   *  TableConfig.groupBySubtotalColumns. Purely a UI/config concern here: this only builds
   *  and persists the selection, the actual subtotal rows aren't rendered yet. */
  public groupBySubtotalColumns: string[] = [];
  /** Whether the picker section is expanded — independent of whether any column is chosen
   *  yet, so turning it on doesn't need a column selected first. */
  public groupedSubtotalsOpen: boolean = false;
  public groupedSubtotalsLoading: boolean = false;

  public groupedSubtotalsTitle: string = $localize`:@@groupedSubtotalsTitle:Subtotales agrupados`;
  public groupedSubtotalsGroupByLabel: string = $localize`:@@groupedSubtotalsGroupByLabel:Agrupar por (en orden)`;

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
  public addCrossSorting: string = $localize`:@@addCrossSorting:Ordenación`;
  public sortByValueLabel: string = $localize`:@@sortByValue:Por valor descendente`;
  public sortByValueAscLabel: string = $localize`:@@sortByValueAsc:Por valor ascendente`;
  public sortAlphabeticalLabel: string = $localize`:@@sortAlphabetical:Alfabética`;

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
    const inject = this.myPanelChartComponent.componentRef.instance.inject;
    this.styles = inject.styles || [];
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
      this.crossSortOrder = config.crossSortOrder || 'alphabetical';
      this.headerColor = config.headerColor || DEFAULT_TABLE_HEADER_COLOR;
      this.bandingColor = config.bandingColor || DEFAULT_TABLE_BANDING_COLOR;
      this.colorEnabled = config.colorEnabled !== false;
      this.groupBySubtotalColumns = config.groupBySubtotalColumns || [];
      this.groupedSubtotalsOpen = this.groupBySubtotalColumns.length > 0;
    } else {
      this.panelChartConfig.config = new ChartConfig(
        new TableConfig(false, false, 5, false, false, false, false, null, null, null, false, false, [])
      )
      this.headerColor = DEFAULT_TABLE_HEADER_COLOR;
      this.bandingColor = DEFAULT_TABLE_BANDING_COLOR;
      this.colorEnabled = true;
    }
    // Read the current prediction state of the panel
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


  get chartType(): string {
    return this.controller?.params?.panelChart?.chartType || 'table';
  }

  get percentageMode(): 'none' | 'both' | 'only' {
    if (this.onlyPercentages) return 'only';
    if (this.resultAsPecentage) return 'both';
    return 'none';
  }

  setPercentageMode(mode: 'none' | 'both' | 'only') {
    const currentConfig = this.myPanelChartComponent.currentConfig;
    if (mode === 'none') {
      currentConfig.resultAsPecentage = false;
      currentConfig.onlyPercentages = false;
    } else if (mode === 'both') {
      currentConfig.resultAsPecentage = true;
      currentConfig.onlyPercentages = false;
    } else {
      currentConfig.resultAsPecentage = true;
      currentConfig.onlyPercentages = true;
      currentConfig.withColSubTotals = false;
      this.col_subtotals = false;
      currentConfig.withColTotals = false;
      this.col_totals = false;
    }
    this.myPanelChartComponent.componentRef.instance.inject.checkTotals(null);
    this.resultAsPecentage = currentConfig.resultAsPecentage;
    this.onlyPercentages = currentConfig.onlyPercentages;
    this.setCols();
    this.setItems();
  }

  get sortOptions() {
    return [
      { label: this.sortAlphabeticalLabel, value: 'alphabetical' },
      { label: this.sortByValueLabel, value: 'value' },
      { label: this.sortByValueAscLabel, value: 'valueAsc' },
    ];
  }

  public togglePrediction() {
    this.showPredictionCol = !this.showPredictionCol;
    this.setPredictionCol();
  }

  public rowTotals() {
    const currentConfig = this.myPanelChartComponent.currentConfig;
    currentConfig.withTrend = false;
    currentConfig.withRowTotals = !currentConfig.withRowTotals;
    this.myPanelChartComponent.componentRef.instance.inject.checkTotals(null);
    this.row_totals = currentConfig.withRowTotals;
    this.setItems();
  }

  public rowTrend() {
    const currentConfig = this.myPanelChartComponent.currentConfig;
    currentConfig.withRowTotals = false;
    currentConfig.withTrend = !currentConfig.withTrend;
    this.myPanelChartComponent.componentRef.instance.inject.checkTotals(null);
    this.trend = currentConfig.withTrend;
    this.setItems();
  }

  public colSubTotals() {

    const currentConfig = this.myPanelChartComponent.currentConfig;

    if (this.onlyPercentages) return;
    currentConfig.withColSubTotals = !currentConfig.withColSubTotals;
    this.myPanelChartComponent.componentRef.instance.inject.checkTotals(null);
    this.col_subtotals = currentConfig.withColSubTotals;
    this.setItems();
  }

  public colTotals() {

    const currentConfig = this.myPanelChartComponent.currentConfig;

    if (this.onlyPercentages) return;

    currentConfig.withColTotals = !currentConfig.withColTotals;
    this.myPanelChartComponent.componentRef.instance.inject.checkTotals(null);
    this.col_totals = currentConfig.withColTotals;

    this.setItems();
  }

  public noRepeat() {

    const currentConfig = this.myPanelChartComponent.currentConfig;
    currentConfig.noRepetitions = !currentConfig.noRepetitions;
    this.myPanelChartComponent.componentRef.instance.inject.checkTotals(null);
    this.noRepetitions = currentConfig.noRepetitions;

    // this.negativeNumbers = !this.negativeNumbers;
    // currentConfig.noRepetitions = !currentConfig.negativeNumbers;

    this.setItems();
  }

  public noNegativeNumbers() {

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

    // no totals
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

  public setStyle(col) {
    if (this.controller.params.panelChart.chartType === 'table') {
      const queryCol = this.queryNumericColumns.find(q => q.display_name === col.header || q.column_name === col.field);
      this.gradientMenuController = new EdaDialogController({
        params: {
          col: col,
          tableOrigin: queryCol?.table_id,
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
      // The color code only applies to one crosstab level
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
    this.setItems(); // This is where color modification is requested
  }

  /** display_name shows up as either a plain string or the {default, localized} i18n object
   *  depending on the source — this panel's SAVED content (read below) has it flattened to a
   *  string in practice, so a naive `.default` access silently falls through to column_name
   *  (which breaks grouping when the same column is added twice at different date
   *  granularities, e.g. "Order date" / "Order date mes"). Handling both shapes here avoids
   *  that regardless of which shape this particular field happens to be in. */
  private static resolveDisplayName(f: any): string {
    return (typeof f.display_name === 'string' ? f.display_name : f.display_name?.default) || f.column_name;
  }

  /** aggregation_type shows up as either an already-flattened plain string or the full
   *  [{value, selected}, ...] options array, same split as display_name — the panel's SAVED
   *  content (below) has it flattened in practice, but this handles both regardless. */
  private static resolveAggregation(f: any): string {
    if (typeof f.aggregation_type === 'string') return f.aggregation_type;
    return f.aggregation_type?.find((a: any) => a.selected)?.value || 'none';
  }

  private get panelQueryFields(): any[] {
    const panelID = this.controller?.params?.panelId;
    if (!panelID || !this.dashboard) return [];
    const dashboardPanel = this.dashboard.edaPanels?.toArray().find((cmp: any) => cmp.panel.id === panelID);
    return dashboardPanel?.panel?.content?.query?.query?.fields || [];
  }

  get queryNumericColumns(): QueryColumn[] {
    return this.panelQueryFields
      .filter((f: any) => f.column_type === 'numeric')
      .map((f: any) => ({
        column_name: f.column_name,
        table_id: f.table_id,
        display_name: TableDialogComponent.resolveDisplayName(f)
      }));
  }

  /** Text and date columns alike — the app already handles date granularity (year/month/day)
   *  as separate columns via col.format, so there's no special casing needed here: whichever
   *  granularity the user added to the table, they group by it the same way as any text column. */
  get queryGroupableColumns(): QueryColumn[] {
    return this.panelQueryFields
      .filter((f: any) => f.column_type !== 'numeric')
      .map((f: any) => ({
        column_name: f.column_name,
        table_id: f.table_id,
        display_name: TableDialogComponent.resolveDisplayName(f)
      }));
  }

  /**
   * Both derived automatically from the table's own query — not user-picked. Every numeric
   * column already has an aggregation configured (that's how its own cells currently total),
   * and subtotal rows reuse those same aggregations instead of picking different ones.
   */
  get groupBySubtotalNumericColumns(): string[] {
    return this.panelQueryFields
      .filter((f: any) => f.column_type === 'numeric')
      .map((f: any) => TableDialogComponent.resolveDisplayName(f));
  }

  get groupBySubtotalAggregations(): string[] {
    return this.panelQueryFields
      .filter((f: any) => f.column_type === 'numeric')
      .map((f: any) => {
        const agg = TableDialogComponent.resolveAggregation(f);
        return agg === 'none' ? 'sum' : agg;
      });
  }

  toggleGroupedSubtotals(): void {
    this.groupedSubtotalsOpen = !this.groupedSubtotalsOpen;
    if (!this.groupedSubtotalsOpen) {
      this.groupBySubtotalColumns = [];
    }
    this.refreshGroupedSubtotals();
  }

  /**
   * Live preview: panel-chart's applyGroupedSubtotals() takes a TableConfig-shaped object and
   * reads only these 3 fields from it — it doesn't need the persisted TableConfig instance
   * (that one is only rebuilt at Confirm, in saveChartConfig(); col_totals/etc. only land in
   * `currentConfig` — the live inject model — on interaction, not in the saved config, and
   * this follows the same split).
   */
  refreshGroupedSubtotals(): void {
    this.groupedSubtotalsLoading = true;
    this.myPanelChartComponent.applyGroupedSubtotals({
      groupBySubtotalColumns: this.groupBySubtotalColumns,
      groupBySubtotalNumericColumns: this.groupBySubtotalNumericColumns,
      groupBySubtotalAggregations: this.groupBySubtotalAggregations,
    } as TableConfig).finally(() => this.groupedSubtotalsLoading = false);
  }

  setPredictionCol() {
    if (this.showPredictionCol) {
      this.showPredictionDialog = true;
    } else {
      this.pendingPrediction = null;
      // If there was an active prediction, reload the preview without prediction
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
      // Temporarily set the prediction to build the query
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

      // Revert immediately (synchronously, before the await)
      dashboardPanel.panel.content.query.query.prediction = origPred;
      dashboardPanel.panel.content.query.query.predictionConfig = origPredConfig;

      // Execute the query directly without going through runQueryFromDashboard
      const response = await dashboardPanel.dashboardService.executeQuery(query).toPromise();
      const chartLabels = dashboardPanel.chartUtils.uniqueLabels(response[0]);
      const chartData = response[1];

      // Update only the dialog preview
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

  public toggleColorEnabled() {
    this.colorEnabled = !this.colorEnabled;
    this.applyBandingPreview();
  }

  public applyBandingPreview() {
    const tableComponent = this.myPanelChartComponent?.componentRef?.instance;
    if (tableComponent && typeof tableComponent.applyBandingColors === 'function') {
      tableComponent.applyBandingColors(
        this.colorEnabled ? (this.headerColor || '') : undefined,
        this.colorEnabled ? (this.bandingColor || '') : undefined,
        this.colorEnabled
      );
    }
  }

  onClose(event: EdaDialogCloseEvent, response?: any, extra?: any): void {
    this.myPanelChartComponent.componentRef.instance.inject.styles = this.styles;
    return this.controller.close(event, response, extra);
  }

  async saveChartConfig() {
    const config = (<TableConfig>this.panelChartConfig.config.getConfig());
    const rows = config.visibleRows;
    const sortedSerie = config.sortedSerie;
    const sortedColumn = config.sortedColumn;
    const styles = this.styles;

    const properties = new TableConfig(this.onlyPercentages, this.resultAsPecentage, rows,
      this.col_subtotals, this.col_totals, this.row_totals, this.trend, sortedSerie, sortedColumn, styles,
      this.noRepetitions, this.negativeNumbers, this.ordering, this.crossSortOrder,
      this.headerColor, this.bandingColor, this.colorEnabled,
      this.groupBySubtotalColumns, this.groupBySubtotalNumericColumns, this.groupBySubtotalAggregations);

    // Apply prediction changes to the dashboard only on confirm
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

    // Hand off the live preview's already-merged rows so Confirm skips a re-fetch.
    const previewInject: any = this.myPanelChartComponent.componentRef?.instance?.inject;
    const groupedSubtotalsPreview = (this.groupBySubtotalColumns.length && previewInject?.__groupedSubtotalsCleanRows)
      ? { cleanRows: previewInject.__groupedSubtotalsCleanRows, mergedRows: previewInject.value }
      : undefined;

    this.onClose(EdaDialogCloseEvent.UPDATE, properties, groupedSubtotalsPreview);
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
      this.myPanelChartComponent.componentRef.instance.applyStyles(this.styles);
    } finally {
      this.gradientMenuController = undefined;
    }
  }

  /**
   * Applies a new sort mode to the cross table preview without closing the dialog.
   * EdaCrosstableModel keeps the raw pre-pivot rows in origValues. Clearing origValues
   * and re-assigning the data forces the value setter to rebuild the cross table from
   * scratch (via buildCrossTable()) using the updated crossSortOrder.
   */
  public setCrossSortOrder(value: string) {
    this.crossSortOrder = value;
    const inject = this.myPanelChartComponent.componentRef.instance.inject;
    inject.crossSortOrder = value;
    // Clone before clearing so origValues is not wiped before we can read it.
    const origData = _.cloneDeep(inject.origValues);
    inject.origValues = [];
    inject.value = origData;
    inject.checkTotals(null);
    this.setItems();
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
        },
        {
          label: this.addCrossSorting,
          icon: "pi pi-sort-amount-down",
          items: [
            {
              label: this.sortAlphabeticalLabel,
              icon: this.crossSortOrder === 'alphabetical' ? 'pi pi-check' : 'pi pi-sort-alpha-down',
              command: () => this.setCrossSortOrder('alphabetical')
            },
            {
              label: this.sortByValueLabel,
              icon: this.crossSortOrder === 'value' ? 'pi pi-check' : 'pi pi-sort-amount-down',
              command: () => this.setCrossSortOrder('value')
            },
            {
              label: this.sortByValueAscLabel,
              icon: this.crossSortOrder === 'valueAsc' ? 'pi pi-check' : 'pi pi-sort-amount-up',
              command: () => this.setCrossSortOrder('valueAsc')
            }
          ]
        }

      ];
    }
  }

}