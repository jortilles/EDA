import { MAX_TABLE_ROWS_FOR_ALERT } from '@eda/configs/config';
import { Query } from '@eda/models/model.index';
import { EdaDialogController } from '@eda/shared/components/shared-components.index';
import { EdaBlankPanelComponent } from '../eda-blank-panel.component';

import { ChartsConfigUtils } from './charts-config-utils';
import { PanelInteractionUtils } from './panel-interaction-utils';

import { NULL_VALUE, EMPTY_VALUE } from '../../../../../config/customizable/customizable_default'

export const QueryUtils = {

  /**
   * Creates fake columns for SQL Queries
   * @return built column
   */

  createColumn: (columnName: string, columnType: string, sqlOriginTable: any): any => {

    const column = {
      table_id: sqlOriginTable?.value,
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
    const labels = [$localize`:@@atributoLabel:Atributo`, $localize`:@@atributoConsulta:Consulta`, $localize`:@@value:Valor`];
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
        "avg": $localize`:@@aggTmean:Media`,
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
  /**
   * Switch sql mode or eda mode and run query
   * @param ebp edaBlankPanelComponent
   * @param query query to run
   *
   */
  switchAndRun: async (ebp: EdaBlankPanelComponent, query: Query) => {
    const isSqlMode = ebp.selectedQueryMode === 'SQL';

    const executeEdaQuery = async (): Promise<any> => {
      const filteredQuery: Query = {
        ...query,
        query: {
          ...query.query,
          filters: query.query.filters.filter(f =>
            (f.filter_elements[0]?.value1?.length > 0) ||
            ['not_null', 'not_null_nor_empty', 'null_or_empty'].includes(f.filter_type)
          )
        }
      };
      return ebp.dashboardService.executeQuery(filteredQuery).toPromise();
    };

    const executeSqlQuery = async (): Promise<any> => {
      const response = await ebp.dashboardService.executeSqlQuery(query).toPromise();
      const [headers, rows] = response;

      const types = headers.map((_, i) => {
        let foundString = false;
        for (const row of rows) {
          const field = row[i];
          if (typeof field === 'number') return 'numeric';
          if (typeof field === 'string') {
            // Check for HTML tags in strings
            if (/<[a-z][\s\S]*>/i.test(field)) return 'html';
            foundString = true;
          }
        }
        return foundString ? 'text' : null;
      });

      ebp.currentQuery = headers.map((header, i) =>
        QueryUtils.createColumn(header, types[i], ebp.sqlOriginTable)
      );

      return response;
    };

    return isSqlMode ? await executeSqlQuery() : await executeEdaQuery();
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

    // Update globalFilters elements

    if(ebp.sortedFilters === undefined) ebp.sortedFilters = []; // if it is an old report, we define the report as empty

    for(let i=0; i<ebp.sortedFilters.length; i++){
      if(ebp.sortedFilters[i].isGlobal) {
        ebp.sortedFilters[i].filter_elements = ebp.globalFilters.find((globalFilter: any) => globalFilter.filter_id === ebp.sortedFilters[i].filter_id).filter_elements;
        ebp.sortedFilters[i].filter_codes = ebp.globalFilters.find((globalFilter: any) => globalFilter.filter_id === ebp.sortedFilters[i].filter_id).filter_codes;
      }
    }

    /** Handle duplicate columns. If two columns have the same name add suffix _1, _2, _3.... etc */
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
      ebp.chartLabels = ebp.chartUtils.uniqueLabels(response[0]);   // Chart labels
      ebp.chartData = response[1].map(item => item.map(a => {

        if(a === null  && NULL_VALUE != 'LEAVE_THE_NULL'){
          return NULL_VALUE;
        }
        if(a === ''){
          return EMPTY_VALUE;
        }

        return a;

      })); // replace nulls and '' with customizable values
       
      // ebp.chartData = response[1];       // Chart data
      ebp.ableBtnSave();                 // Button save
      /* Labels and Data - Arrays */
      if (!globalFilters) {

        PanelInteractionUtils.verifyData(ebp);

        // This if/else preserves the previously configured chart even if the data changes.
        // If the query no longer fits the configured chart, a table will be used to display the data.
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

    // Ensure the dragAndDrop component can be displayed
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

      // Section that initializes initAxes if ordering is empty in the config
      if(ebp.chartForm.controls.chart.value!==null && ebp.chartForm.controls.chart.value?.subValue  == 'crosstable') {
        // Verify new changes in Axes since the start of crosstable editing
        if(!ebp.newAxesChanged && (!ebp.chartTypes.filter( grafico => grafico.subValue==='crosstable' )[0].ngIf || !ebp.chartTypes.filter( grafico => grafico.subValue==='table' )[0].ngIf)) {

          if(ebp.currentQuery.length>2 && (ebp.currentQuery.find( valor => valor.column_type === 'numeric') !== undefined) && ebp.panelChartConfig?.config) {
            const config = ebp.panelChartConfig.config.getConfig(); // Retrieve the config
            // Exclude nav-children from the query so they don't appear in crosstable axes
            const _navChildKeys = new Set<string>();
            ebp.currentQuery.forEach((col: any) => { if (col.downChild) _navChildKeys.add(`${col.downChild.table_id}.${col.downChild.column_name}`); });
            const _queryForAxes = ebp.currentQuery.filter((col: any) => !_navChildKeys.has(`${col.table_id}.${col.column_name}`));
            ebp.currentQuery = ebp.newCurrentQuery(ebp.currentQuery, ebp.initAxes(_queryForAxes)); // Reorder the currentQuery
            config['ordering'] = [{axes: ebp.initAxes(_queryForAxes)}]; // Add the new axes to the config
            ebp.copyConfigCrossTable = JSON.parse(JSON.stringify(config));
          }
        }
      }

      /**
     * Too many rows check — use effective fields to avoid nav-children inflating the count
     */
      const _fieldsForCount = (ebp.currentQuery || []).some((col: any) => col.downChild)
        ? QueryUtils.getEffectiveFields(ebp)
        : ebp.currentQuery;
      const totalTableCount = _fieldsForCount.reduce((a, b) => {
        return a + parseInt(b.tableCount);
      }, 0);
      const aggregations = ebp.currentQuery.filter(col => col.aggregation_type.filter(agg => (agg.value !== 'none' && agg.selected === true)).length > 0).length;
      /**
       * If the table row count is greater than the MAX_TABLE_ROWS_FOR_ALERT
       * And there is no aggregation
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

    // When Execute is applied the treetable is reset
    // TODO: REVIEW THE VARIABLE
    if(ebp.panelChartConfig.edaChart==='treetable') {
      ebp.panelChartConfig.config.getConfig()['editedTreeTable'] = false;
    }

  },


  /**
   * Returns effective fields for query execution, excluding navigable children
   * and applying active navigation substitutions. If there are no navigable
   * children it will return currentQuery UNMODIFIED.
   */
  getEffectiveFields: (ebp: EdaBlankPanelComponent): any[] => {
    // We will only show parent fields in the query; navigable children are shown only as navigation substitutions when applicable. To do that, first identify which columns are navigable children...
    const navigableChildKeys = new Set<string>();
    for (const col of ebp.currentQuery) {
      if (col.downChild) {
        navigableChildKeys.add(`${col.downChild.table_id}.${col.downChild.column_name}`);
      }
    }

    // Map parent col key → active nav target
    const navSubstitutions = new Map<string, any>();
    for (const entry of (ebp.navState || [])) {
      navSubstitutions.set(entry.rootKey, entry.navPath[entry.currentIndex]);
    }

    const effectiveFields: any[] = [];
    for (const col of ebp.currentQuery) {
      const colKey = `${col.table_id}.${col.column_name}`;

      // skip navigable children 
      if (navigableChildKeys.has(colKey)) continue;

      // substitute the parent field with its active navigation target when navigation is active
      if (navSubstitutions.has(colKey)) {
        effectiveFields.push(navSubstitutions.get(colKey));
      } else {
        effectiveFields.push(col);
      }
    }

    return effectiveFields;
  },

  /**
   * Builds a query object
   */
  initEdaQuery: (ebp: EdaBlankPanelComponent): Query => {
    const config = ChartsConfigUtils.setConfig(ebp);
    const hasNavChildren = (ebp.currentQuery || []).some((col: any) => col.downChild);
    const fields = hasNavChildren ? QueryUtils.getEffectiveFields(ebp) : ebp.currentQuery;

    const params = {
      table: '',
      dataSource: ebp.dataSource._id,
      panel: ebp.panel.id,
      dashboard: ebp.inject.dashboard_id,
      filters: ebp.mergeFilters(ebp.selectedFilters, ebp.globalFilters),
      config: config.getConfig(),
      queryLimit: ebp.queryLimit,
      joinType: ebp.joinType,
      rootTable: ebp.rootTable?.table_name,
      groupByEnabled: ebp.groupByEnabled,
      connectionProperties: ebp.connectionProperties,
      prediction: ebp.panel?.content?.query?.query?.prediction ? ebp.panel.content.query.query.prediction:'None',
      predictionConfig: ebp.panel?.content?.query?.query?.predictionConfig || undefined,
      sortedFilters: ebp.sortedFilters,
      resultSortingColumns: ebp.resultSortingColumns
    };
    return ebp.queryBuilder.normalQuery(fields, params, ebp.selectedQueryMode);
  },


  /**
   * Builds a query object for SQL mode
   */
  initSqlQuery: (ebp: EdaBlankPanelComponent): Query => {
    const config = ChartsConfigUtils.setConfig(ebp);
    const params = {
      table: '',
      dataSource: ebp.dataSource._id,
      panel: ebp.panel.id,
      dashboard: ebp.inject.dashboard_id,
      filters: ebp.mergeFilters(ebp.selectedFilters, ebp.globalFilters),
      config: config.getConfig(),
      connectionProperties: ebp.connectionProperties
    };
    return ebp.queryBuilder.normalQuery(ebp.currentQuery, params, ebp.selectedQueryMode, ebp.currentSQLQuery);

  }
}