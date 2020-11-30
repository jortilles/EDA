import { EdaBlankPanelComponent } from '../eda-blank-panel.component';
import { ChartConfig } from '../panel-charts/chart-configuration-models/chart-config';
import { ChartJsConfig } from '../panel-charts/chart-configuration-models/chart-js-config';
import { KpiConfig } from '../panel-charts/chart-configuration-models/kpi-config';
import { MapConfig } from '../panel-charts/chart-configuration-models/map-config';
import { SankeyConfig } from '../panel-charts/chart-configuration-models/sankey-config';
import { TableConfig } from '../panel-charts/chart-configuration-models/table-config';

export const ChartsConfigUtils = {

  setConfig: (ebp: EdaBlankPanelComponent) => {

    let tableRows: number;
    let config: any = null;

    if (ebp.panelChart.componentRef && ['table', 'crosstable'].includes(ebp.panelChart.props.chartType)) {

      tableRows = ebp.panelChart.componentRef.instance.inject.rows;
      config =
      {
        withColTotals: ebp.panelChart.componentRef.instance.inject.withColTotals,
        withColSubTotals: ebp.panelChart.componentRef.instance.inject.withColSubTotals,
        withRowTotals: ebp.panelChart.componentRef.instance.inject.withRowTotals,
        resultAsPecentage: ebp.panelChart.componentRef.instance.inject.resultAsPecentage,
        onlyPercentages: ebp.panelChart.componentRef.instance.inject.onlyPercentages,
        visibleRows: tableRows
      }

    } else if (ebp.panelChart.componentRef && ebp.panelChart.props.chartType === 'kpi') {

      config =
      {
        sufix: ebp.panelChart.componentRef.instance.inject.sufix,
        alertLimits: ebp.panelChart.componentRef.instance.inject.alertLimits
      }

    } else if (['geoJsonMap', 'coordinatesMap'].includes(ebp.panelChart.props.chartType)) {
      config =
      {
        coordinates: ebp.panelChart.componentRef.instance.inject.coordinates,
        zoom: ebp.panelChart.componentRef.instance.inject.zoom,
        color: ebp.panelChart.componentRef.instance.inject.color,
        logarithmicScale: ebp.panelChart.componentRef.instance.inject.logarithmicScale,
        legendPosition: ebp.panelChart.componentRef.instance.inject.legendPosition
      }
    }
    else if (ebp.panelChart.props.chartType === 'parallelSets') {
      config =
      {
        colors: ebp.panelChart.componentRef.instance.colors
      }
    } else
      config = { colors: ebp.graficos.chartColors, chartType: ebp.panelChart.props.chartType };

    return new ChartConfig(config);

  },

  /**
  * Returns a configuration object for this type
  * @param type chart type
  */
  setVoidChartConfig: (type: string) => {
    if (['table', 'crosstable'].includes(type)) {

      return new TableConfig(false, false, 10, false, false, false);

    }
    else if (['bar', 'line', 'piechart', 'doughnut'].includes(type)) {

      return new ChartJsConfig(null, type);

    } else if (type === 'parallelSets') {

      return new SankeyConfig([]);

    }
    else {
      return new KpiConfig('', []);
    }
  },

  recoverConfig: (type: string, config: TableConfig | KpiConfig | ChartJsConfig | MapConfig | SankeyConfig) => {
    if (['table', 'crosstable'].includes(type)) {
      return new ChartConfig(config);
    }
    else if (['bar', 'line', 'pie', 'doughnut', 'barline', 'horizontalBar'].includes(type)) {
      return new ChartConfig(config);
    }
    else if (type === 'kpi') {
      return new ChartConfig(config);
    }
    else if (type === 'geoJsonMap') {
      return new ChartConfig(config);
    }
    else if (type === 'coordinatesMap') {
      return new ChartConfig(config);
    }
    else if (type === 'parallelSets') {
      return new ChartConfig(config);
    }
  }

}