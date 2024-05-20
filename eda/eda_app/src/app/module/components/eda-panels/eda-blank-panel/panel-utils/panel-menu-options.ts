import { EdaBlankPanelComponent } from '@eda/components/eda-panels/eda-blank-panel/eda-blank-panel.component';
import * as _ from 'lodash';

import { EdaContextMenuItem, EdaDialogController } from "@eda/shared/components/shared-components.index";

export const PanelOptions = {
  editQuery: (panelComponent: EdaBlankPanelComponent) => {
    return new EdaContextMenuItem({
      label: $localize`:@@panelOptions1:Editar consulta`,
      icon: 'fa fa-cog',
      command: () => {
        if (panelComponent.panel.content) {
          panelComponent.hiddenColumn = 0;
          panelComponent.panelDeepCopy = _.cloneDeep(panelComponent.panel.content, true);
          panelComponent.display_v.disablePreview = false;

        } else {
          panelComponent.display_v.disablePreview = true;
        }
        if (Object.entries(panelComponent.graficos).length !== 0) {
          panelComponent.colorsDeepCopy = _.cloneDeep(panelComponent.graficos);
        }
        panelComponent.contextMenu.hideContextMenu();
        panelComponent.openEditarConsulta();
        panelComponent.index = 0;
      }
    });
  },
  editChart: (panelComponent: EdaBlankPanelComponent) => {
    return new EdaContextMenuItem({
      label: $localize`:@@panelOptions2:Editar opciones del gráfico`,
      icon: 'mdi mdi-wrench',
      command: () => {

        if (Object.entries(panelComponent.graficos).length !== 0 && panelComponent.chartData.length !== 0) {
          
          if (['line', 'area', 'doughnut', 'polarArea', 'bar', 'horizontalBar', 'barline', 'histogram', 'pyramid'].includes(panelComponent.graficos.chartType)) {

            panelComponent.contextMenu.hideContextMenu();
            panelComponent.chartController = new EdaDialogController({
              params: { panelId: _.get(panelComponent.panel, 'id'), chart: panelComponent.graficos, config: panelComponent.panelChartConfig },
              close: (event, response) => panelComponent.onCloseChartProperties(event, response)
            });

          } else if (['table', 'crosstable'].includes(panelComponent.graficos.chartType)) {

            panelComponent.contextMenu.hideContextMenu();
            panelComponent.tableController = new EdaDialogController({
              params: { panelId: _.get(panelComponent.panel, 'id'), panelChart: panelComponent.panelChartConfig },
              close: (event, response) => panelComponent.onCloseTableProperties(event, response)
            });

          } else if (panelComponent.graficos.chartType === 'geoJsonMap') {

            panelComponent.contextMenu.hideContextMenu();
            panelComponent.mapController = new EdaDialogController({
              params: {
                panelID: _.get(panelComponent.panel, 'id'),
                panelChart: panelComponent.panelChartConfig,
                color: panelComponent.panelChart.componentRef.instance.color,
                logarithmicScale: panelComponent.panelChart.componentRef.instance.logarithmicScale,
                legendPosition: panelComponent.panelChart.componentRef.instance.legendPosition
              },
              close: (event, response) => { panelComponent.onCloseMapProperties(event, response) }
            });

          } else if (panelComponent.graficos.chartType === 'kpi') {

            panelComponent.contextMenu.hideContextMenu();
            panelComponent.kpiController = new EdaDialogController({
              params: {
                panelID: _.get(panelComponent.panel, 'id'),
                panelChart: panelComponent.panelChartConfig,
                alertLimits: panelComponent.panelChart.componentRef.instance.alertLimits
              },
              close: (event, response) => { panelComponent.onCloseKpiProperties(event, response) }
            });

          } 
          else if (panelComponent.graficos.chartType === 'dynamicText') {

            panelComponent.contextMenu.hideContextMenu();
            panelComponent.dynamicTextController = new EdaDialogController({
              params: {
                panelID: _.get(panelComponent.panel, 'id'),
                panelChart: panelComponent.panelChartConfig,
                color: panelComponent.panelChart.componentRef.instance.color
              },
              close: (event, response) => { panelComponent.onClosedynamicTextProperties(event, response) }
            });

          } 
          else if (panelComponent.graficos.chartType === 'parallelSets') {

            panelComponent.contextMenu.hideContextMenu();
            panelComponent.sankeyController = new EdaDialogController({
              params: {
                panelID: _.get(panelComponent.panel, 'id'),
                panelChart: panelComponent.panelChartConfig
              },
              close: (event, response) => { panelComponent.onCloseSankeyProperties(event, response) }
            });

          } 
          else if(panelComponent.graficos.chartType === 'treeMap'){

            panelComponent.contextMenu.hideContextMenu();
            panelComponent.treeMapController = new EdaDialogController({
              params: {
                panelID: _.get(panelComponent.panel, 'id'),
                panelChart: panelComponent.panelChartConfig
              },
              close: (event, response) => { panelComponent.onCloseTreeMapProperties(event, response) }
            });

          }

          else if (panelComponent.graficos.chartType === 'funnel') {
            panelComponent.contextMenu.hideContextMenu();
            panelComponent.funnelController = new EdaDialogController({
              params: {
                panelID: _.get(panelComponent.panel, 'id'),
                panelChart: panelComponent.panelChartConfig
              },
              close: (event, response) => { panelComponent.onCloseFunnelProperties(event, response) }
            });

          }
          else if (panelComponent.graficos.chartType === 'bubblechart') {
            panelComponent.contextMenu.hideContextMenu();
            panelComponent.bubblechartController = new EdaDialogController({
              params: {
                panelID: _.get(panelComponent.panel, 'id'),
                panelChart: panelComponent.panelChartConfig
              },
              close: (event, response) => { panelComponent.onCloseBubblechartProperties(event, response) }
            });

          }

          else if(panelComponent.graficos.chartType === 'scatterPlot'){
            panelComponent.contextMenu.hideContextMenu();
            panelComponent.scatterPlotController = new EdaDialogController({
              params: {
                panelID: _.get(panelComponent.panel, 'id'),
                panelChart: panelComponent.panelChartConfig
              },
              close: (event, response) => { panelComponent.onCloseScatterProperties(event, response) }
            });

          }
          else if(panelComponent.graficos.chartType === 'sunburst'){
            panelComponent.contextMenu.hideContextMenu();
            panelComponent.sunburstController = new EdaDialogController({
              params: {
                panelID: _.get(panelComponent.panel, 'id'),
                panelChart: panelComponent.panelChartConfig
              },
              close: (event, response) => { panelComponent.onCloseSunburstProperties(event, response) }
            });

          }
          else if(panelComponent.graficos.chartType === 'knob'){

            panelComponent.contextMenu.hideContextMenu();
            panelComponent.knobController = new EdaDialogController({
              params: {
                panelID: _.get(panelComponent.panel, 'id'),
                panelChart: panelComponent.panelChartConfig
              },
              close: (event, response) => { panelComponent.onCloseKnobProperties(event, response) }
            });

          }


        }
      }
    });
  },
  linkPanel:(panelComponent: EdaBlankPanelComponent) => {
    return new EdaContextMenuItem({
      label:$localize`:@@panelOptions5:Vincular con otro informe`,
      icon:"fa fa-external-link",
      command: () => {
        panelComponent.contextMenu.hideContextMenu();
        panelComponent.linkDashboardController = new EdaDialogController({
          params:{
            query : panelComponent.currentQuery,
            datasource : panelComponent.inject.dataSource._id,
            charttype : panelComponent.panelChart.props.chartType,
            modeSQL : panelComponent.panel.content.query.query.modeSQL,
            hiddenColumn: panelComponent.hiddenColumn,
            dashboard_id : panelComponent.inject.dashboard_id,
            linkedDashboard : panelComponent.panel.linkedDashboardProps
          },
          close : (event, response) => panelComponent.onCloseLinkDashboardProperties(event, response)
        })
      }
    })
  },
  exportExcel: (panelComponent: EdaBlankPanelComponent) => {
    return new EdaContextMenuItem({
      label: $localize`:@@panelOptions3:Exportar a Excel`,
      icon: 'mdi mdi-file',
      command: () => PanelOptions.readyToExport(panelComponent, 'excel')
    });
  },
  duplicatePanel: (panelComponent: EdaBlankPanelComponent) => {
    return new EdaContextMenuItem({
      label: $localize`:@@panelOptionsDup:Duplicar panel`,
      icon: 'fa fa-clone',
      command: () => {
        panelComponent.contextMenu.hideContextMenu();
        panelComponent.duplicatePanel();
      }
    });
  },
  deletePanel: (panelComponent: EdaBlankPanelComponent) => {
    return new EdaContextMenuItem({
      label: $localize`:@@panelOptions4:Eliminar panel`,
      icon: 'fa fa-trash',
      command: () => {
        panelComponent.contextMenu.hideContextMenu();
        panelComponent.removePanel();
      }
    });
  },
  readyToExport : (panelComponent: EdaBlankPanelComponent, fileType: string): void => {
    if (!panelComponent.panel.content) {
        return panelComponent.alertService.addError(`No tienes contenido para exportar`);
    }
    const cols = panelComponent.chartUtils.transformDataQueryForTable(panelComponent.chartLabels, panelComponent.chartData);
    const headers = panelComponent.currentQuery.map(o => o.display_name.default);

    if (_.isEqual(fileType, 'excel')) {
      panelComponent.fileUtiles.exportToExcel(headers, cols, panelComponent.panel.title);
    }

    panelComponent.contextMenu.hideContextMenu();
},
  generateMenu : (panelComponent : EdaBlankPanelComponent ) => {

    const menu = [];
    const editmode = panelComponent.getEditMode();
    const type = panelComponent.getChartType();
    if(editmode) menu.push(PanelOptions.editQuery(panelComponent));
    menu.push(PanelOptions.editChart(panelComponent));
    if(editmode && ![ "crosstable", "kpi", "dynamicText"].includes(type) ) {menu.push(PanelOptions.linkPanel(panelComponent)); }
    menu.push(PanelOptions.exportExcel(panelComponent));
    menu.push(PanelOptions.duplicatePanel(panelComponent));
    if(editmode) menu.push(PanelOptions.deletePanel(panelComponent));

    return menu;
  }
}