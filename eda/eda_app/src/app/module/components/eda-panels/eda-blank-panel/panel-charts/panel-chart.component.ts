import { EdaKpiComponent } from './../../../eda-kpi/eda-kpi.component';
import { EdaTableComponent } from './../../../eda-table/eda-table.component';
import { Component, OnInit, Input, SimpleChanges, OnChanges, ViewChild, ViewContainerRef, ComponentFactoryResolver, OnDestroy, Output, EventEmitter } from '@angular/core';
import { PanelChart } from './panel-chart';
import { ChartUtilsService } from '@eda/services/service.index';
import * as _ from 'lodash';
import {
  EdaColumnText,
  EdaColumnNumber,
  EdaColumnDate,
  EdaTable,
  EdaChartComponent
} from '@eda/components/component.index';
import { Column } from '@eda/models/model.index';

@Component({
  selector: 'panel-chart',
  templateUrl: './panel-chart.component.html',
  styleUrls: []
})
export class PanelChartComponent implements OnInit, OnChanges, OnDestroy {
  ngOnDestroy(): void {
    this.destroyComponent();
  }

  @Input() config: PanelChart;
  @Output() configUpdated: EventEmitter<any> = new EventEmitter<any>(null);

  @ViewChild('chartComponent', { read: ViewContainerRef, static: true }) entry: ViewContainerRef;


  /*Chart's containers for panel body and preview panel*/
  public componentRef: any;
  public currentConfig: any;
  public NO_DATA: boolean;

  constructor(
    private resolver: ComponentFactoryResolver,
    private chartUtils: ChartUtilsService
  ) { }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.config.data && this.config.data.values.length !== 0) {
      this.NO_DATA = false;
      this.changeChartType();

    } else {
      this.NO_DATA = true;
      this.destroyComponent();
    }

  }

  /**
   * changes chart Type
   */
  public changeChartType() {
    const type = this.config.chartType;
    if (['table', 'crosstable'].includes(type)) {
      this.renderEdaTable(type);
    }
    if (['doughnut', 'bar', 'horizontalBar', 'line'].includes(type)) {
      this.renderEdaChart(type);
    }
    if (['kpi'].includes(type)) {
      this.renderEdaKpi();
    }
  }

  /**
   * renders a table component
   * @param type table or crosstable
   */
  private renderEdaTable(type) {
    if (type === 'table') {
      this.createEdatableComponent(type);
    }
    if (type === 'crosstable') {
      this.createEdatableComponent(type);
    }
  }

  /**
   * Renders edaChartComponent
   * @param type 
   */
  private renderEdaChart(type: string) {
    const dataDescription = this.chartUtils.describeData(this.config.query, this.config.data.labels);
    const dataTypes = this.config.query.map(column => column.column_type);
    const chartData = this.chartUtils.transformDataQuery(this.config.chartType, this.config.data.values, dataTypes, dataDescription);
    const config = this.chartUtils.initChartOptions(this.config.chartType, dataDescription.numericColumns[0].name, dataDescription.otherColumns);
    let chartConfig: any = {};
    chartConfig.chartType = this.config.chartType;
    chartConfig.chartLabels = chartData[0];
    if (type === 'doughnut') {
      chartConfig.chartData = chartData[1];
    } else {
      chartConfig.chartDataset = chartData[1];
    }
    chartConfig.chartOptions = config.chartOptions;
    chartConfig.chartColors = this.chartUtils.recoverChartColors(this.config.chartType, this.config.layout);
    this.createEdaChartComponent(chartConfig);
  }

  /**
   * Renders a KPIComponent
   */
  private renderEdaKpi() {
    let chartConfig: any = {};
    chartConfig.value = this.config.data.values[0][0];
    chartConfig.header = this.config.data.labels[0];
    this.createEdaKpiComponent(chartConfig);

  }

  /**
   * Creates a chart component
   * @param inject chart configuration
   */
  private createEdaChartComponent(inject: any) {
    this.currentConfig = inject;
    this.entry.clear();
    const factory = this.resolver.resolveComponentFactory(EdaChartComponent);
    this.componentRef = this.entry.createComponent(factory);
    this.componentRef.instance.inject = inject;
    this.configUpdated.emit();
  }

  /**
    * Creates a table component
    * @param inject chart configuration
    */
  private createEdatableComponent(type) {
    this.entry.clear();
    const factory = this.resolver.resolveComponentFactory(EdaTableComponent);
    this.componentRef = this.entry.createComponent(factory);
    this.componentRef.instance.inject = this.initializeTable(type, this.config.layout);
    this.componentRef.instance.inject.value = this.chartUtils.transformDataQueryForTable(this.config.data.labels, this.config.data.values);
    const layout = this.config.layout;
    if (layout && layout.tableConfig) {
      this.componentRef.instance.inject.rows = layout.tableConfig;
    } 
    this.currentConfig = this.componentRef.instance.inject;
  }

  /**
   * creates a kpiComponent
   * @param inject 
   */
  private createEdaKpiComponent(inject: any) {
    this.entry.clear();
    const factory = this.resolver.resolveComponentFactory(EdaKpiComponent);
    this.componentRef = this.entry.createComponent(factory);
    this.componentRef.instance.inject = inject;
  }

  /**
   * Destroys current component
   */
  public destroyComponent() {
    if (this.componentRef) {
      this.componentRef.destroy();
    }
  }

  /**
   * Initializes table
   * @param type 
   * @param configs 
   */
  private initializeTable(type: string, configs?: any): EdaTable {
    const tableColumns = [];
    for (let i = 0, n = this.config.query.length; i < n; i += 1) {
      const r: Column = this.config.query[i];
      if (_.isEqual(r.column_type, 'date')) {
        tableColumns.push(new EdaColumnDate({ header: r.display_name.default, field: r.column_name }));
      } else if (_.isEqual(r.column_type, 'numeric')) {
        tableColumns.push(new EdaColumnNumber({ header: r.display_name.default, field: r.column_name }))
      } else if (_.isEqual(r.column_type, 'varchar')) {
        tableColumns.push(new EdaColumnText({ header: r.display_name.default, field: r.column_name }));
      } else if (_.isEqual(r.column_type, 'text')) {
        tableColumns.push(new EdaColumnText({ header: r.display_name.default, field: r.column_name }));
      }
    }
    if (type === 'table') {
      return new EdaTable({ cols: tableColumns, ...configs });
    } else if (type === 'crosstable') {
      return new EdaTable({ cols: tableColumns, pivot: true, ...configs });
    }

  }

  /**
   * @return current chart config
   */
  public getCurrentConfig() {
    return this.currentConfig;
  }


}