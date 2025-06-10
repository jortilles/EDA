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

import { TableConfig } from '../panel-charts/chart-configuration-models/table-config';
import { ScatterConfig } from '../panel-charts/chart-configuration-models/scatter-config';
import { SunburstConfig } from '../panel-charts/chart-configuration-models/sunburst-config';
import { BubblechartConfig } from '../panel-charts/chart-configuration-models/bubblechart.config';
import { TreeTableConfig } from '../panel-charts/chart-configuration-models/treeTable-config';

export const ChartsConfigUtils = {

  setConfig: (ebp: EdaBlankPanelComponent) => {

    let tableRows: number;
    let config: any = null;

    if (ebp.panelChart.componentRef && ['table', 'crosstable'].includes(ebp.panelChart.props.chartType)) {
      tableRows = ebp.panelChart.componentRef.instance.inject.rows || 10;
      config = {
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
      }

    } else if (ebp.panelChart.componentRef && ebp.panelChart.props.chartType.includes('kpi')) {
      const kpiChart = ebp.panelChart.componentRef.instance.inject.edaChart;

      config = {
        sufix: ebp.panelChart.componentRef.instance.inject.sufix,
        alertLimits: ebp.panelChart.componentRef.instance.inject.alertLimits,
        edaChart: {}
      }

      if (kpiChart.edaChart) {
        config.edaChart.colors = kpiChart.chartColors;
        config.edaChart.chartType = ebp.panelChart.props.chartType;

        // colors: ebp.panelChart.props.config && ebp.panelChart.props.config.getConfig() ? ebp.panelChart.props.config.getConfig()['colors'] : [], 
        // chartType: ebp.panelChart.props.chartType, 
      }

    } else if (ebp.panelChart.componentRef && ebp.panelChart.props.chartType === 'dynamicText') {
      config = {
        color: ebp.panelChart.componentRef ? ebp.panelChart.componentRef.instance.inject.color : ebp.panelChart.props.config.getConfig()['color']
      }
    } else if (ebp.panelChart.props.chartType === 'geoJsonMap') {

      config = {
        zoom: ebp.panelChart.componentRef ? ebp.panelChart.componentRef.instance.inject.zoom : null,
        coordinates: ebp.panelChart.componentRef ? ebp.panelChart.componentRef.instance.inject.coordinates : null,
        logarithmicScale: ebp.panelChart.componentRef ? ebp.panelChart.componentRef.instance.inject.logarithmicScale : null,
        baseLayer: ebp.panelChart.componentRef ? ebp.panelChart.componentRef.instance.inject.baseLayer : null,
        legendPosition: ebp.panelChart.componentRef ? ebp.panelChart.componentRef.instance.inject.legendPosition : null,
        color: ebp.panelChart.componentRef ? ebp.panelChart.componentRef.instance.inject.color : null,
        draggable: ebp.panelChart.componentRef ? ebp.panelChart.componentRef.instance.inject.draggable : null,
        
      }
    } else if(ebp.panelChart.props.chartType === 'treetable') {
      config = {
        chartType: ebp.panelChart.props.chartType,
        editedTreeTable: ebp.panelChart.props.config && ebp.panelChart.props.config.getConfig() ? ebp.panelChart.props.config.getConfig()['editedTreeTable'] : false,
        hierarchyLabels: ebp.panelChart.props.config && ebp.panelChart.props.config.getConfig() ? ebp.panelChart.props.config.getConfig()['hierarchyLabels'] : [],
        leafLabels: ebp.panelChart.props.config && ebp.panelChart.props.config.getConfig() ? ebp.panelChart.props.config.getConfig()['leafLabels'] : [],
      }

    }  else if (ebp.panelChart.props.chartType === 'coordinatesMap') {
      config = {
        zoom: ebp.panelChart.componentRef ? ebp.panelChart.componentRef.instance.inject.zoom : null,
        coordinates: ebp.panelChart.componentRef ? ebp.panelChart.componentRef.instance.inject.coordinates : null,
        logarithmicScale: ebp.panelChart.componentRef ? ebp.panelChart.componentRef.instance.inject.logarithmicScale : null,
        initialColor: ebp.panelChart.componentRef ? ebp.panelChart.componentRef.instance.inject.initialColor : null,
        finalColor: ebp.panelChart.componentRef ? ebp.panelChart.componentRef.instance.inject.finalColor : null,
        draggable: ebp.panelChart.componentRef ? ebp.panelChart.componentRef.instance.inject.draggable : null,
        }
      }
    else if (["parallelSets", "treeMap", "scatterPlot", "funnel", "bubblechart", "sunbursts"].includes(ebp.panelChart.props.chartType)) {
      config = {
        colors: ebp.panelChart.componentRef ? ebp.panelChart.componentRef.instance.colors : [],
        assignedColors: ebp.panelChart.componentRef ? ebp.panelChart.componentRef.instance.assignedColors : [],
      }
    }
    else if (ebp.panelChart.props.chartType === 'knob') {
      config = {
        color: ebp.panelChart.componentRef ? ebp.panelChart.componentRef.instance.color : ebp.panelChart.props.config.getConfig()['color'],
        limits: ebp.panelChart.componentRef ? ebp.panelChart.componentRef.instance.limits : ebp.panelChart.props.config.getConfig()['limits']
      };
    } else{
      // Chart.js
      config = { 
        colors: ebp.panelChart.props.config && ebp.panelChart.props.config.getConfig() ? ebp.panelChart.props.config.getConfig()['colors'] : [], 
        chartType: ebp.panelChart.props.chartType, 
        addTrend: ebp.panelChart.props.config && ebp.panelChart.props.config.getConfig() ? ebp.panelChart.props.config.getConfig()['addTrend'] : false,
        addComparative: ebp.panelChart.props.config && ebp.panelChart.props.config.getConfig() ? ebp.panelChart.props.config.getConfig()['addComparative'] : false,
        showLabels: ebp.panelChart.props.config && ebp.panelChart.props.config.getConfig() ? ebp.panelChart.props.config.getConfig()['showLabels'] : false,
        showLabelsPercent: ebp.panelChart.props.config && ebp.panelChart.props.config.getConfig() ? ebp.panelChart.props.config.getConfig()['showLabelsPercent'] : false,
        numberOfColumns: ebp.panelChart.props.config && ebp.panelChart.props.config.getConfig() ? ebp.panelChart.props.config.getConfig()['numberOfColumns'] : null,
        assignedColors: ebp.panelChart.props.config && ebp.panelChart.props.config.getConfig() ? ebp.panelChart.props.config.getConfig()['assignedColors'] : [], // o null?
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
            return new ChartJsConfig(null, type, false, false, false, false, null, []);
        } else if (type === 'parallelSets') {
            return new SankeyConfig([],[]);
        } else if (type === 'treeMap') {
            return new TreeMapConfig([],[]);
        } else if(type === 'treetable') {
          return new TreeTableConfig(false, [], []);
        } else if (type === 'scatterPlot') {
            return new ScatterConfig([],[]);
        } else if (type === 'funnel') {
            return new FunnelConfig([]);
        } else if (type === 'bubblechart') {
            return new BubblechartConfig([],[]);
        } else if (type === 'knob') {
            return new KnobConfig(null, null);
        } else if (type === 'sunburst') {
            return new SunburstConfig([],[]);
        } else if (type === 'kpi') {
            return new KpiConfig();
        } else if (['kpibar', 'kpiline', 'kpiarea'].includes(type)) {
            return new KpiConfig({
                edaChart:  new ChartJsConfig(null, type, false, false, false, false, null, ['a'])
            });
        } else if (type === 'dynamicText') {
            return new DynamicTextConfig(null);
        }
    },

  recoverConfig: (type: string, config: TableConfig | KpiConfig | DynamicTextConfig | ChartJsConfig | MapConfig | SankeyConfig | TreeMapConfig | TreeTableConfig | KnobConfig | FunnelConfig | BubblechartConfig |SunburstConfig) => {

    return new ChartConfig(config);

  }




}