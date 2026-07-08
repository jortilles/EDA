import { KnobConfig } from './../panel-charts/chart-configuration-models/knob-config';
import { TreeMapConfig } from './../panel-charts/chart-configuration-models/treeMap-config';
import { EdaBlankPanelComponent } from '../eda-blank-panel.component';
import { ChartConfig } from '../panel-charts/chart-configuration-models/chart-config';
import { ChartJsConfig } from '../panel-charts/chart-configuration-models/chart-js-config';
import { KpiConfig } from '../panel-charts/chart-configuration-models/kpi-config';
import { DynamicTextConfig } from '../panel-charts/chart-configuration-models/dynamicText-config';
import { MapConfig } from '../panel-charts/chart-configuration-models/map-config';
import { SankeyConfig } from '../panel-charts/chart-configuration-models/sankey-config';
import { FunnelConfig } from '../panel-charts/chart-configuration-models/funnel.config';
import { KpiTrendConfig } from '../panel-charts/chart-configuration-models/kpi-trend-config';
import { KpiDeviationConfig } from '../panel-charts/chart-configuration-models/kpi-deviation-config';

import { TableConfig } from '../panel-charts/chart-configuration-models/table-config';
import { ScatterConfig } from '../panel-charts/chart-configuration-models/scatter-config';
import { SunburstConfig } from '../panel-charts/chart-configuration-models/sunburst-config';
import { BubblechartConfig } from '../panel-charts/chart-configuration-models/bubblechart.config';
import { TreeTableConfig } from '../panel-charts/chart-configuration-models/treeTable-config';

// Custom per-chart config fields that live outside the small set of "core" ones (chartType,
// query, colors...). Every place that saves, reloads, or applies this config (setConfig() here,
// changeChartType() and onCloseChartProperties() in eda-blank-panel.component.ts) needs to know
// this exact list - keeping it in one place is what stops a newly added field (like the
// innerRadiusPercent/useGradient/coloredBarsConfig ones before it) from silently being dropped
// in one of the other spots. Applied uniformly regardless of chart type - a field irrelevant to
// the current type (e.g. innerRadiusPercent on a bar chart) is simply ignored by that chart's
// renderer, never causes an actual bug.
export interface CustomChartConfigField {
  name: string;
  default: any;
  // Only a few fields fall back to `default` when the field key itself is missing from an
  // otherwise-present config object; the rest stay `undefined` in that case. This mirrors the
  // pre-existing (inconsistent) behavior exactly - not something to silently "fix" as a side
  // effect of unifying these three call sites.
  fallbackIfMissing?: boolean;
}

export const CUSTOM_CHART_CONFIG_FIELDS: CustomChartConfigField[] = [
  { name: 'addTrend', default: false },
  { name: 'addComparative', default: false },
  { name: 'showLabels', default: false },
  { name: 'showLabelsPercent', default: false },
  { name: 'showPointLines', default: false },
  { name: 'showPredictionLines', default: false },
  { name: 'numberOfColumns', default: null },
  { name: 'assignedColors', default: [] },
  { name: 'chartLegend', default: true, fallbackIfMissing: true },
  { name: 'coloredBarsConfig', default: null },
  { name: 'showUniqueColors', default: null },
  { name: 'uniqueBarColors', default: null },
  { name: 'showGridLines', default: true, fallbackIfMissing: true },
  { name: 'innerRadiusPercent', default: null },
  { name: 'useGradient', default: true, fallbackIfMissing: true },
];

function readCustomFields(cfg: any, fields: CustomChartConfigField[]): any {
  const result: any = {};
  fields.forEach(field => {
    result[field.name] = cfg
      ? (field.fallbackIfMissing ? cfg[field.name] ?? field.default : cfg[field.name])
      : field.default;
  });
  return result;
}

export const ChartsConfigUtils = {

  setConfig: (ebp: EdaBlankPanelComponent) => {
    let tableRows: number;
    let config: any = null;

    if (!ebp.panelChart) {
      return new ChartConfig(config);
    }


    if (ebp.panelChart.componentRef && ['table', 'crosstable'].includes(ebp.panelChart.props.chartType)) {
      tableRows = ebp.panelChart.componentRef.instance.inject.rows || 10;
      config = {
        chartType: ebp.panelChart.props.chartType,
        withColTotals: ebp.panelChart.componentRef.instance.inject.withColTotals,
        withColSubTotals: ebp.panelChart.componentRef.instance.inject.withColSubTotals,
        withRowTotals: ebp.panelChart.componentRef.instance.inject.withRowTotals,
        withTrend: ebp.panelChart.componentRef.instance.inject.withTrend,
        resultAsPecentage: ebp.panelChart.componentRef.instance.inject.resultAsPecentage,
        onlyPercentages: ebp.panelChart.componentRef.instance.inject.onlyPercentages,
        visibleRows: tableRows,
        sortedSerie: ebp.panelChart.componentRef.instance.inject.sortedSerie,
        sortedColumn: ebp.panelChart.componentRef.instance.inject.sortedColumn,
        styles: ebp.panelChart.componentRef.instance.inject.styles,
        noRepetitions: ebp.panelChart.componentRef.instance.inject.noRepetitions,
        negativeNumbers: ebp.panelChart.componentRef.instance.inject.negativeNumbers,
        ordering: ebp.panelChart.componentRef.instance.inject.ordering,
        headerColor: ebp.panelChart.componentRef.instance.inject.headerColor || '',
        bandingColor: ebp.panelChart.componentRef.instance.inject.bandingColor || '',
        colorEnabled: ebp.panelChart.componentRef.instance.inject.colorEnabled !== false,
      }

    } else if (ebp.panelChart.componentRef && ebp.panelChart.props.chartType === 'kpideviation') {
      const inst = ebp.panelChart.componentRef?.instance;
      config = {
        backgroundColor: inst?.inject?.backgroundColor || '',
        kpiColor: inst?.inject?.kpiColor || '',
        positiveColor: inst?.inject?.positiveColor || '',
        negativeColor: inst?.inject?.negativeColor || '',
        prefixImage: inst?.inject?.prefixImage || '',
        modifiedFontPoints: inst?.inject?.modifiedFontPoints || 0,
        alertLimits: inst?.inject?.alertLimits || [],
      };
    } else if (ebp.panelChart.componentRef && ebp.panelChart.props.chartType.includes('kpi')) {
      const kpiChart = ebp.panelChart.componentRef.instance.inject?.edaChart;

      config = {
        sufix: ebp.panelChart.componentRef.instance.inject.sufix,
        alertLimits: ebp.panelChart.componentRef.instance.inject.alertLimits,
        assignedColors: ebp.panelChart.props.config?.getConfig()?.['assignedColors'] || null,
        modifiedFontPoints: ebp.panelChart.componentRef.instance.inject.modifiedFontPoints || 0,
        backgroundColor: ebp.panelChart.componentRef.instance.inject.backgroundColor || '',
        kpiColor: ebp.panelChart.componentRef.instance.inject.kpiColor || '',
        prefixImage: ebp.panelChart.componentRef.instance.inject.prefixImage || '',
        edaChart: {}
      }

      if (kpiChart?.hasOwnProperty('edaChart')) {
        config.edaChart.colors = kpiChart.chartColors;
        config.edaChart.chartType = ebp.panelChart.props.chartType;
        config.edaChart.assignedColors = ebp.panelChart.props.config?.getConfig()?.['assignedColors'] || null;  // ambién en edaChart
      }
    } else if (ebp.panelChart.componentRef && ebp.panelChart.props.chartType === 'dynamicText') {
      const dtInstance = ebp.panelChart.componentRef.instance;
      config = {
        color: dtInstance ? dtInstance.inject.color : ebp.panelChart.props.config.getConfig()['color'],
        modifiedFontPoints: dtInstance ? (dtInstance.inject.modifiedFontPoints || 0) : (ebp.panelChart.props.config.getConfig()['modifiedFontPoints'] || 0)
      }
    } else if (ebp.panelChart.props.chartType === 'geoJsonMap') {
      config = {
        zoom: ebp.panelChart.componentRef ? ebp.panelChart.componentRef.instance.inject.zoom : null,
        coordinates: ebp.panelChart.componentRef ? ebp.panelChart.componentRef.instance.inject.coordinates : null,
        logarithmicScale: ebp.panelChart.componentRef ? ebp.panelChart.componentRef.instance.inject.logarithmicScale : null,
        baseLayer: ebp.panelChart.componentRef ? ebp.panelChart.componentRef.instance.inject.baseLayer : null,
        legendPosition: ebp.panelChart.componentRef ? ebp.panelChart.componentRef.instance.inject.legendPosition : null,
        assignedColors: ebp.panelChart.componentRef ? ebp.panelChart.componentRef.instance.assignedColors : null,
        draggable: ebp.panelChart.componentRef ? ebp.panelChart.componentRef.instance.inject.draggable : null,
      }
    } else if (ebp.panelChart.props.chartType === 'treetable') {
      config = {
        chartType: ebp.panelChart.props.chartType,
        editedTreeTable: ebp.panelChart.props.config && ebp.panelChart.props.config.getConfig() ? ebp.panelChart.props.config.getConfig()['editedTreeTable'] : false,
        hierarchyLabels: ebp.panelChart.props.config && ebp.panelChart.props.config.getConfig() ? ebp.panelChart.props.config.getConfig()['hierarchyLabels'] : [],
        leafLabels: ebp.panelChart.props.config && ebp.panelChart.props.config.getConfig() ? ebp.panelChart.props.config.getConfig()['leafLabels'] : [],
      }

    } else if (ebp.panelChart.props.chartType === 'coordinatesMap') {
      config = {
          zoom: ebp.panelChart.componentRef ? ebp.panelChart.componentRef.instance.inject.zoom : null,
          coordinates: ebp.panelChart.componentRef ? ebp.panelChart.componentRef.instance.inject.coordinates : null,
          logarithmicScale: ebp.panelChart.componentRef ? ebp.panelChart.componentRef.instance.inject.logarithmicScale : null,
          assignedColors: ebp.panelChart.componentRef ? ebp.panelChart.componentRef.instance.assignedColors : null,
          draggable: ebp.panelChart.componentRef ? ebp.panelChart.componentRef.instance.inject.draggable : null,
      }
    } else if (ebp.panelChart.props.chartType === 'kpitrend') {
      const inst = ebp.panelChart.componentRef?.instance;
      config = {
        sufix: inst?.inject?.sufix || '',
        backgroundColor: inst?.inject?.backgroundColor || '',
        kpiColor: inst?.inject?.kpiColor || '',
        assignedColors: ebp.panelChart.props.config?.getConfig()?.['assignedColors'] || [],
        modifiedFontPoints: inst?.inject?.modifiedFontPoints || 0,
      };
    } else if (["parallelSets", "treeMap", "scatterPlot", "funnel", "bubblechart", "sunburst"].includes(ebp.panelChart.props.chartType)) {
      config = {
        assignedColors: ebp.panelChart.componentRef ? ebp.panelChart.componentRef.instance.assignedColors : [],
        useGradient: ebp.panelChart.componentRef ? ebp.panelChart.componentRef.instance.useGradient ?? true : true,
      }
    } else if (ebp.panelChart.props.chartType === 'knob') {

      config = {
        assignedColors: ebp.panelChart.componentRef ? ebp.panelChart.componentRef.instance.assignedColors : ebp.panelChart.props.config.getConfig()['assignedColors'],
        limits: ebp.panelChart.componentRef ? ebp.panelChart.componentRef.instance.limits : ebp.panelChart.props.config.getConfig()['limits'],
        semaphoreColor: ebp.panelChart.componentRef ? ebp.panelChart.componentRef.instance.inject?.semaphoreColor : ebp.panelChart.props.config.getConfig()['semaphoreColor']
      };
    } else {
      // Bar/line/area/radar/doughnut/polarArea family - a mix of D3 (doughnut, polarArea, the
      // whole bar family) and still-Chart.js (line/area/radar/barline) renderers, all sharing
      // the same set of generic visual/behavioral config fields.
      config = {
        chartType: ebp.panelChart.props.chartType,
        ...readCustomFields(ebp.panelChart.props.config?.getConfig(), CUSTOM_CHART_CONFIG_FIELDS),
      };
    }

    return new ChartConfig(config);
  },

    /**
    * Returns a configuration object for this type
    * @param type chart type
    */
    setVoidChartConfig: (type: string) => {
        if (['table', 'crosstable'].includes(type)) {
          return new TableConfig(false, false, 10, false, false, false, false, null, null, null, false, false ,  []);
        }else if (['bar', 'line', 'area', 'pie', 'doughnut', 'polarArea', 'barline', 'horizontalBar', 'pyramid', 'histogram', 'radar'].includes(type)) {
            return new ChartJsConfig(null, type, false, false, false, false, null,[], false, false);
        } else if (type === 'parallelSets') {
            return new SankeyConfig([]);
        } else if (type === 'treeMap') {
            return new TreeMapConfig([]);
        } else if(type === 'treetable') {
          return new TreeTableConfig(false, [], []);
        } else if (type === 'scatterPlot') {
            return new ScatterConfig([]);
        } else if (type === 'funnel') {
            return new FunnelConfig([]);
        } else if (type === 'bubblechart') {
            return new BubblechartConfig([]);
        } else if (type === 'knob') {
            return new KnobConfig(null, null);
        } else if (type === 'sunburst') {
            return new SunburstConfig([]);
        } else if (type === 'kpi') {
            return new KpiConfig();
        } else if (['kpibar', 'kpiline', 'kpiarea'].includes(type)) {
            return new KpiConfig({
                edaChart:  new ChartJsConfig(null, type, false, false, false, false, null,[], false, false)
            });
        } else if (type === 'dynamicText') {
            return new DynamicTextConfig(null);
        } else if (type === 'kpitrend') {
            return new KpiTrendConfig();
        } else if (type === 'kpideviation') {
            return new KpiDeviationConfig();
        }
    },

  recoverConfig: (type: string, config: TableConfig | KpiConfig | DynamicTextConfig | ChartJsConfig | MapConfig | SankeyConfig | TreeMapConfig | TreeTableConfig | KnobConfig | FunnelConfig | BubblechartConfig | SunburstConfig | KpiTrendConfig) => {

    return new ChartConfig(config ?? undefined);

  }




}