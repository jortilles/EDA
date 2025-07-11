import { MAX_TABLE_ROWS_FOR_ALERT } from '@eda/configs/config';
import { Query } from '@eda/models/model.index';
import { EdaDialogController } from '@eda/shared/components/shared-components.index';
import { EdaBlankPanelComponent } from '../eda-blank-panel.component';

import { ChartsConfigUtils } from './charts-config-utils';
import { PanelInteractionUtils } from './panel-interaction-utils';

import { NULL_VALUE, EMPTY_VALUE } from '../../../../../config/personalitzacio/customizables'

export const QueryUtils = {

  /**
   * Creates fake columns for SQL Queries
   * @return builded column
   */

  createColumn: (columnName: string, columnType: string, sqlOriginTable: any): any => {

    const column = {
      table_id: sqlOriginTable.value,
      column_name: columnName,
      column_type: columnType,
      description: { default: columnName, locaized: [] },
      display_name: { default: columnName, localized: [] },
      format: null,
      aggregation_type: [{ display_name: "no", value: "none", selected: true }],
      column_granted_roles: [],
      row_granted_roles: [],
      ordenation_type: 'No',
      tableCount: 0,
      visible: true
    }
    return column;
  },


  /**
   * Switch sql mode or eda mode and run query
   * @param ebp edaBlankPanelComponent
   * @param query query to run
   *
   */
  switchAndRun: async (ebp: EdaBlankPanelComponent, query: Query) => {
    try {
      if (ebp.selectedQueryMode != 'SQL') {
        const queryData = JSON.parse(JSON.stringify(query));
        queryData.query.filters = query.query.filters.filter((f) =>
          (f.filter_elements[0]?.value1 && f.filter_elements[0].value1.length !== 0)
          || ['not_null', 'not_null_nor_empty', 'null_or_empty'].includes(f.filter_type)
        );
        const response = await ebp.dashboardService.executeQuery(queryData).toPromise();
        return response;
      } else {
        const response = await ebp.dashboardService.executeSqlQuery(query).toPromise();
        const numFields = response[0].length;
        const types = new Array(numFields);
        types.fill(null);
        for (let row = 0; row < response[1].length; row++) {
          response[1][row].forEach((field, i) => {
            if (types[i] === null) {
              if (typeof field === 'number') {
                types[i] = 'numeric';
              } else if (typeof field === 'string') {
                types[i] = 'text';
              }
            }
          });
          if (!types.includes(null)) {
            break;
          }
        }

        ebp.currentQuery = [];
        types.forEach((type, i) => {
          ebp.currentQuery.push(QueryUtils.createColumn(response[0][i], type, ebp.sqlOriginTable));
        });
        return response;
      }
    } catch (err) {
      throw err;
    }
  },

  analizedQuery: async (ebp: EdaBlankPanelComponent) => {
    const query = QueryUtils.initEdaQuery(ebp);

    query.query.filters = query.query.filters.filter((f) =>
      (f.filter_elements[0]?.value1 && f.filter_elements[0].value1.length !== 0)
      || ['not_null', 'not_null_nor_empty', 'null_or_empty'].includes(f.filter_type)
    );

    const response = await ebp.queryService.executeAnalizedQuery(query).toPromise();
    return response;
  },
  
  transformAnalizedQueryData: (ebp: EdaBlankPanelComponent, data: any) => {
    const labels = [$localize`:@@atributoLabel:Atributo`, $localize`:@@atributoConsulta:Consulta`, $localize`:@@atributoValor:Valor`];
    const values = [];

    const i18n = {
        "count_tables": $localize`:@@count_tablesLabel:Tablas implicadas`,
        "source_table": $localize`:@@originTable:Tabla Origen`,
        "count_rows": $localize`:@@count_rowsLabel:Total de registros`,
        "count_nulls": $localize`:@@count_nullsLabel:Total nulos`,
        "count_empty": $localize`:@@count_emptyLabel:Total cadenas vacías`,
        "count_distinct": $localize`:@@count_distinctLabel:Total valores distintos`,
        "most_duplicated": $localize`:@@most_duplicatedLabel:Más repetido`,
        "least_duplicated": $localize`:@@least_duplicatedLabel:Menos repetido`,
        "max": $localize`:@@maxLabel:Valor máximo`,
        "min": $localize`:@@minLabel:Valor mínimo`,
        "mode": $localize`:@@moda_countsLabel:Moda`,
        "avg": $localize`:@@avgLabel:Media`,
        "median": $localize`:@@medianLabel:Mediana`,
        "median_count_bymonth": $localize`:@@median_count_bymonthLabel:Mediana por mes`,
        "max_bymonth": $localize`:@@max_bymonthLabel:Máximos por mes`,
        "min_bymonth": $localize`:@@min_bymonthLabel:Mínimos por mes`,
    };

    for (const key in data) {

      for (const valueKey in data[key]) {
        const value = data[key][valueKey];
        values.push([key,i18n[valueKey], value]);
      }
    }

    return {
      labels,
      values
    }
  },

  getQueryFromServer: async (ebp: EdaBlankPanelComponent, query: Query): Promise<string> => {
    const serverquery = await ebp.dashboardService.getBuildedQuery(query).toPromise();
    return serverquery;
  },

  switchAndBuildQuery: (ebp: EdaBlankPanelComponent) =>  {
    if (ebp.selectedQueryMode != 'SQL') return QueryUtils.initEdaQuery(ebp);
    else return QueryUtils.initSqlQuery(ebp);
  },

  /**
 * Runs a query and sets panel chart
 * @param globalFilters flag to apply when runQuery() is called from dashboard component.
 */
  runQuery: async (ebp: EdaBlankPanelComponent, globalFilters: boolean) => {

    /** gestiona las columnas duplicadas. Si tengo dos columnas con el mismo nombre le añado el sufijo _1, _2, _3.... etc */
    let dup = [];
    let cont = 0;
    ebp.currentQuery.forEach(a=> {
      let finder = dup.find(b => b === a.display_name.default);
      if (finder != null) {
        cont = cont + 1
        a.display_name.default = finder + "_" + cont ;
      } else {
        dup.push(a.display_name.default);
      }
     })

    ebp.display_v.disablePreview = false;

    if (!globalFilters) {

      ebp.spinnerService.on();

    } else {
      ebp.panelChart.NO_DATA = false;
      ebp.display_v.minispinner = true;
    }

    try {
      const query = QueryUtils.switchAndBuildQuery(ebp);
      /**Add fake column if SQL mode and there isn't fields yet */
      if (query.query.queryMode == 'SQL' && query.query.fields.length === 0) {
        query.query.fields.push(QueryUtils.createColumn('custom', null, ebp.sqlOriginTable));
      }


      // Execute query
      const response = await QueryUtils.switchAndRun(ebp, query);
      //console.log('response :::: --->',response)
      ebp.chartLabels = ebp.chartUtils.uniqueLabels(response[0]);   // Chart labels
      ebp.chartData = response[1].map(item => item.map(a => {

        if(a === null){
          return NULL_VALUE;
        }
        if(a === ''){
          return EMPTY_VALUE;
        }

        return a;

      })); // canviem els null y els '' per valor customitzable
       
      // ebp.chartData = response[1];       // Chart data
      ebp.ableBtnSave();                 // Button save
      /* Labels i Data - Arrays */
      if (!globalFilters) {

        PanelInteractionUtils.verifyData(ebp);

        // Este if y else permiten mantener el gráfico que ya estaba configurado a pesar de que sean otros datos
        // en caso de que query no cumpla con el grádico correspondiente, se proyectara una tabla con los datos.
        if(ebp.chartForm.value.chart===null || ebp.chartForm.value.chart.subValue==='tableanalized'){
          ebp.changeChartType('table', 'table', null);
          ebp.chartForm.patchValue({chart: ebp.chartUtils.chartTypes.find(o => o.value === 'table')});
        } 

        else {
          if(!ebp.chartForm.value.chart.ngIf && !ebp.chartForm.value.chart.tooManyData){
            ebp.changeChartType(ebp.chartForm.value.chart.value, ebp.chartForm.value.chart.subValue, ebp.panelChartConfig.config);
            ebp.chartForm.patchValue({chart: ebp.chartUtils.chartTypes.find(o => o.subValue === ebp.chartForm.value.chart.subValue)});
          }
          else {
            ebp.changeChartType('table', 'table', null);
            ebp.chartForm.patchValue({chart: ebp.chartUtils.chartTypes.find(o => o.value === 'table')});
          }
        }

        ebp.spinnerService.off();

      } else {
        ebp.reloadContent();
        ebp.display_v.minispinner = false;
      }

      ebp.spinnerService.off();
      ebp.index = 1;
      ebp.display_v.saved_panel = true;
    } catch (err) {
      ebp.alertService.addError(err); 
      ebp.spinnerService.off();
    }

    // Controla que se pueda visualizar el componente dragAndDrop
    ebp.dragAndDropAvailable = !ebp.chartTypes.filter( grafico => grafico.subValue === 'crosstable')[0].ngIf;


  },

  /**
  * Runs actual query when execute button is pressed to check for heavy queries
  */
  runManualQuery: (ebp: EdaBlankPanelComponent) => {

    /**No check in sql mode */
    if (ebp.selectedQueryMode == 'SQL') {
      QueryUtils.runQuery(ebp, false);
      return;
    }

    /**
    * Cumulative sum check
    */
    const dataDescription = ebp.chartUtils.describeData(ebp.currentQuery, ebp.chartLabels);
    const cumulativeSum = ebp.currentQuery.filter(field => field.column_type === 'date' && field.cumulativeSum === true).length > 0;

    if (dataDescription.otherColumns.length > 1 && cumulativeSum) {

      ebp.cumsumAlertController = new EdaDialogController({
        params: null,
        close: (event) => {
          ebp.cumsumAlertController = null;
        }
      })
    } else {

      // Aparatado que inicia el initAxes en caso el ordering este vacio en la config


      if(ebp.chartForm.controls.chart.value!==null   && ebp.chartForm.controls.chart.value.subValue  == 'crosstable'  ) {
        // Verifica un nuevo cambio en los Axes desde que se inicia la edición de la tabla cruzada
        if(!ebp.newAxesChanged && (!ebp.chartTypes.filter( grafico => grafico.subValue==='crosstable' )[0].ngIf || !ebp.chartTypes.filter( grafico => grafico.subValue==='table' )[0].ngIf)) {

          if(ebp.currentQuery.length>2 && (ebp.currentQuery.find( valor => valor.column_type === 'numeric') !== undefined)) {
            const config = ebp.panelChartConfig.config.getConfig(); // Adquiera la configuración config
            ebp.currentQuery = ebp.newCurrentQuery(ebp.currentQuery, ebp.initAxes(ebp.currentQuery)); // Reordeno el currentQuery                
            config['ordering'] = [{axes: ebp.initAxes(ebp.currentQuery)}]; // Agrego el nuevo axes a la config
            ebp.copyConfigCrossTable = JSON.parse(JSON.stringify(config));
          } 
        }
      }

      /**
          * Too much rows check
          */
      const totalTableCount = ebp.currentQuery.reduce((a, b) => {
        return a + parseInt(b.tableCount);
      }, 0);
      const aggregations = ebp.currentQuery.filter(col => col.aggregation_type.filter(agg => (agg.value !== 'none' && agg.selected === true)).length > 0).length;
      /**
       * If the table row count is greather than the MAX_TABLE_ROWS_FOR_ALERT
       * And there is no aggretation
       * And there is no limit OR the limit is over the MAX_TABLE_ROWS_FOR_ALERT
       */
      if ( (totalTableCount > MAX_TABLE_ROWS_FOR_ALERT)  && (ebp.selectedFilters.length + aggregations <= 0 )
            &&  ( ( ebp.queryLimit == undefined  )  ||  (  ebp.queryLimit >  MAX_TABLE_ROWS_FOR_ALERT ) )   ) {


        ebp.alertController = new EdaDialogController({
          params: { totalTableCount: totalTableCount },
          close: (event, response) => {
            if (response) {
              QueryUtils.runQuery(ebp, false);
            }
            ebp.alertController = null;
          }
        });

      } else {
        QueryUtils.runQuery(ebp, false);
      }
    }

    ebp.newAxesChanged = false;

    // Al aplicar Ejecutar el treetable de reinicia
    if(ebp.panelChart.props.chartType==='treetable') {
      ebp.panelChart.props.config.getConfig()['editedTreeTable'] = false;
    }

  },


  /**
   * Builds a query object
   */
  initEdaQuery: (ebp: EdaBlankPanelComponent): Query => {
    const config = ChartsConfigUtils.setConfig(ebp);

    const params = {
      table: '',
      dataSource: ebp.inject.dataSource._id,
      panel: ebp.panel.id,
      dashboard: ebp.inject.dashboard_id,
      filters: ebp.mergeFilters(ebp.selectedFilters, ebp.globalFilters),
      config: config.getConfig(),
      queryLimit: ebp.queryLimit,
      joinType: ebp.joinType,
      rootTable: ebp.rootTable?.table_name,
      connectionProperties: ebp.connectionProperties
    };
    return ebp.queryBuilder.normalQuery(ebp.currentQuery, params, ebp.selectedQueryMode);
  },


  /**
   * Builds a query object
   */
  initSqlQuery: (ebp: EdaBlankPanelComponent): Query => {
    const config = ChartsConfigUtils.setConfig(ebp);
    const params = {
      table: '',
      dataSource: ebp.inject.dataSource._id,
      panel: ebp.panel.id,
      dashboard: ebp.inject.dashboard_id,
      filters: ebp.mergeFilters(ebp.selectedFilters, ebp.globalFilters),
      config: config.getConfig(),
      connectionProperties: ebp.connectionProperties
    };
    return ebp.queryBuilder.normalQuery(ebp.currentQuery, params, ebp.selectedQueryMode, ebp.currentSQLQuery);

  }
}
