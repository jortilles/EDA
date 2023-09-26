import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { EdaBlankPanelComponent } from '@eda/components/eda-panels/eda-blank-panel/eda-blank-panel.component';
import { Column } from '@eda/models/model.index';
import * as _ from 'lodash';
import { TableUtils } from './tables-utils';
import { display } from 'html2canvas/dist/types/css/property-descriptors/display';

export const PanelInteractionUtils = {

  /**
     * loads columns from table
     * @param table  
     */
  loadColumns: (ebp: EdaBlankPanelComponent, table: any, hideColumns : number) => {


    ebp.userSelectedTable = table.table_name;
    ebp.disableBtnSave();
    // Clean columns
    ebp.columns = [];
    table.columns.forEach((c: Column) => {
      c.table_id = table.table_name;

      const matcher = _.find(ebp.currentQuery, (x: Column) => c.table_id === x.table_id && c.column_name === x.column_name && c.display_name.default === x.display_name.default);
      if (!matcher) ebp.columns.push(c);
      

      if (hideColumns === 1) {
        ebp.columns = ebp.columns.filter(col =>  col.hidden !== hideColumns)
      } 

      ebp.columns = ebp.columns.filter(col => col.visible === true )
        .sort((a, b) => (a.display_name.default > b.display_name.default) ? 1 : ((b.display_name.default > a.display_name.default) ? -1 : 0));
    });

    if (!_.isEqual(ebp.inputs.findTable.ngModel, '')) {
      ebp.inputs.findTable.reset();
      ebp.setTablesData();
    }
  },

  /**
     * set local and global filters
     * @param column 
     */
  handleFilters: (ebp: EdaBlankPanelComponent, content: any): void => {
    ebp.selectedFilters = _.cloneDeep(content.filters);
    ebp.globalFilters = content.filters.filter(f => f.isGlobal === true);
    ebp.selectedFilters.forEach(filter => { filter.removed = false; });
    ebp.selectedFilters = ebp.selectedFilters.filter(f => f.isGlobal === false);
  },

  handleFilterColumns: (
    ebp: EdaBlankPanelComponent,
    filterList: Array<any>,
    query: Array<any>
  ): void => {
    try{
      filterList.forEach(filter => {
        const table = ebp.tables.filter(table => table.table_name === filter.filter_table)[0];
        const column = table.columns? table.columns.filter(column => column.column_name === filter.filter_column)[0] : [];
        const columnInQuery = query.filter(col => col.column_name === filter.filter_column).length > 0;
        if (!filter.isGlobal && !columnInQuery && column != undefined) {
          ebp.filtredColumns.push(column);
        }
        if(column == undefined){
          console.log('WARNING\nWARING. YOU HAVE A COLUMN IN THE FILTERS NOT PRESENT IN THE MODEL!!!!!!!!!!!!\nWARNING');
          console.log(filter);
        }
      });
    }catch(e){
        console.error('Error loading filters');
        console.error(e);
    }
  },

  handleCurrentQuery: (ebp: EdaBlankPanelComponent): void => {
    if (ebp.panel.content) {
      const fields = ebp.panel.content.query.query.fields;
      for (let i = 0, n = fields.length; i < n; i++) {
        const field = fields[i];
        try{
          if (field) {
            ebp.currentQuery[i].format = field.format;
            ebp.currentQuery[i].cumulativeSum = field.cumulativeSum;
          }
        }catch(e){
          console.error('ERROR handling current query .... handleCurrentQuery.... did you changed the query model?');
          console.error(e);

        }
      }
    }
  },

  /**
  * Sets tables and tablesToShow when column is selected
  */
  searchRelations: (ebp: EdaBlankPanelComponent, c: Column, event?: CdkDragDrop<string[]>) => {
    // Check to drag & drop only to correct container
    if (!_.isNil(event) && event.container.id === event.previousContainer.id) {
      return;
    }

    const originTable = ebp.tables.filter(t => t.table_name === c.table_id)[0];              // Selected table   
    const tablesMap = TableUtils.findRelationsRecursive(ebp.inject.dataSource.model.tables, originTable, new Map());         // Map with all related tables
    ebp.tablesToShow = Array.from(tablesMap.values());
    ebp.tablesToShow = ebp.tablesToShow
      .filter(table => table.visible === true)
      .sort((a, b) => (a.display_name.default > b.display_name.default) ? 1 : ((b.display_name.default > a.display_name.default) ? -1 : 0));
  },

  /**
    * set aggregation types
    * @param column 
    */
  handleAggregationType: (ebp: EdaBlankPanelComponent, column: Column): void => {
  
    const voidPanel = ebp.panel.content === undefined;
    const tmpAggTypes = [];
    const tableId = column.table_id;
    const colName = column.column_name;
    const displayName = column.display_name.default
    const initializeAgregations = (column, tmpAggTypes) => {
      column.aggregation_type.forEach((agg) => {
        tmpAggTypes.push({ display_name: agg.display_name, value: agg.value, selected: agg.value === 'sum' });
      });
    }
    if (!voidPanel) {
      const colInCurrentQuery = ebp.currentQuery.find(c => c.table_id === tableId && c.column_name === colName  && c.display_name.default == displayName ).aggregation_type.find(agg => agg.selected === true);
      const queryFromServer = ebp.panel.content.query.query.fields;
      // Column is in currentQuery
      if (colInCurrentQuery) {
        column.aggregation_type.forEach(agg => tmpAggTypes.push(agg));
        ebp.aggregationsTypes = tmpAggTypes;
        //Column isn't in currentQuery
      } else {
        const columnInServer = queryFromServer.filter(c =>  c.table_id === tableId && c.column_name === colName   && c.display_name.default == displayName )[0];
        // Column is in server's query
        if (columnInServer) {
          const aggregation = columnInServer.aggregation_type;
          column.aggregation_type.forEach(agg => {
            tmpAggTypes.push(agg.value === aggregation ? { display_name: agg.display_name, value: agg.value, selected: true }
              : { display_name: agg.display_name, value: agg.value, selected: false });
          });
          //Column is not in server's query
        } else initializeAgregations(column, tmpAggTypes);
        ebp.aggregationsTypes = tmpAggTypes;
      }
      // New panel
    } else {
      initializeAgregations(column, tmpAggTypes);
      ebp.aggregationsTypes = tmpAggTypes;
    }
    ebp.currentQuery.find(c => {
      return   c.table_id === tableId && colName === c.column_name   && c.display_name.default == displayName
    }).aggregation_type = _.cloneDeep(ebp.aggregationsTypes);
  },

  /**
  * Set order types
  * @param column 
  */
  handleOrdTypes: (ebp: EdaBlankPanelComponent, column: Column): void => {

    let addOrd: Column;
    const voidPanel = ebp.panel.content === undefined;
    if (!voidPanel) {
      const queryFromServer = ebp.panel.content.query.query.fields;

      if (!column.ordenation_type) {
        column.ordenation_type = 'No';
      }

      const colInServer = queryFromServer.filter(c => c.column_name === column.column_name && c.table_id === column.table_id)[0];
      let ordenation = colInServer ? colInServer.ordenation_type : column.ordenation_type;
      const d = ebp.ordenationTypes.find(ag => ag.selected === true && ordenation !== ag.value);
      const ord = ebp.ordenationTypes.find(o => o.value === ordenation);

      if (!_.isNil(d)) {
        d.selected = false;
      }
      if (!_.isNil(ord)) {
        ord.selected = true;
      }

    } else if (!column.ordenation_type) {

      ebp.ordenationTypes = [
        { display_name: 'ASC', value: 'Asc', selected: false },
        { display_name: 'DESC', value: 'Desc', selected: true },
        { display_name: 'NO', value: 'No', selected:false  }
      ];

    } else {
      ebp.ordenationTypes.forEach(ord => {
        ord.value !== column.ordenation_type ? ord.selected = false : ord.selected = true;
      });
    }

    const colIncurrentQuery = ebp.currentQuery.find(c => column.column_name === c.column_name && column.table_id === c.table_id);
    try {
      colIncurrentQuery.ordenation_type = ebp.ordenationTypes.filter(ord => ord.selected === true)[0].value;
    } catch (e) {
      colIncurrentQuery.ordenation_type = 'No';
    }
  },

  /**
     * moves given column to [select or filters] in config panel
     * @param c column to move
     */
  moveItem: (ebp: EdaBlankPanelComponent, c: Column) => {
    ebp.disableBtnSave();
    // Busca index en l'array de columnes
    // const match = _.findIndex(ebp.columns, { column_name: c.column_name, table_id: c.table_id,  });
    const match = _.find(ebp.columns, (x: Column) => c.table_id === x.table_id && c.column_name === x.column_name);
    if (match) match.isdeleted = true; // Marco la columna com a borrada
    
    ebp.currentQuery.push(_.cloneDeep(c));      // Col·loca la nova columna a l'array Select
    PanelInteractionUtils.searchRelations(ebp, c);        // Busca les relacions de la nova columna afegida a la consulta
    PanelInteractionUtils.handleAggregationType(ebp, c);  // Comprovacio d'agregacions de la nova columna afegida a la consulta
    PanelInteractionUtils.handleOrdTypes(ebp, c);         // Comprovacio ordenacio  de la nova columna afegida a la consulta
   

    ebp.inputs.findColumn.reset();  // resetea las columnas a mostrar
    PanelInteractionUtils.loadColumns( // Torna a carregar les columnes de la taula
      ebp, 
      ebp.tablesToShow.filter(table => table.table_name === ebp.userSelectedTable)[0], ebp.hiddenColumn );
  
  },

  /**
   * sets chart state (allowed, not allowed)
   * @param charts not allowedCharts
   */
  notAllowedCharts: (ebp: EdaBlankPanelComponent, notAllowedCharts: any[]) => {
    for (const notAllowed of notAllowedCharts) {
      for (const chart of ebp.chartTypes) {
        if (notAllowed === chart.subValue) {
          chart.ngIf = true;
        }
      }
    }
  },

  /**
  * sets chart state (allowed, not allowed) because there are too many data 
  * @param charts not allowedCharts
  */
  tooManyDataForCharts(ebp: EdaBlankPanelComponent, tooManyDataForCharts: any[]) {
    for (const myElem of tooManyDataForCharts) {
      for (const chart of ebp.chartTypes) {
        if (myElem === chart.value) {
          chart.tooManyData = true;
        }
      }
    }
  },

  /**
    * Check data and set notAllowed charts
    */
  verifyData: (ebp: EdaBlankPanelComponent) => {
    // Reset charts
    for (const chart of ebp.chartTypes) {
      chart.ngIf = false;
      chart.tooManyData = false;
    }
    if (!_.isEmpty(ebp.currentQuery)) {
      let notAllowedCharts = [];
      let tooManyDataForCharts = [];
      const dataDescription = ebp.chartUtils.describeData(ebp.currentQuery, ebp.chartLabels);

      if (dataDescription.totalColumns === 0 || _.isEmpty(ebp.chartData)) {
        //this.alertService.addWarning($localize`:@@NoRecords:No se pudo obtener ningún registro`);
      } else {
        notAllowedCharts = ebp.chartUtils.getNotAllowedCharts(dataDescription, ebp.currentQuery);
        tooManyDataForCharts = ebp.chartUtils.getTooManyDataForCharts(ebp.chartData.length);

      }

      /// if the chart is not allowed, it doesn't matters there is too many data.
      tooManyDataForCharts = tooManyDataForCharts.filter(x => !notAllowedCharts.includes(x));

      PanelInteractionUtils.notAllowedCharts(ebp, notAllowedCharts);
      PanelInteractionUtils.tooManyDataForCharts(ebp, tooManyDataForCharts);

    }
  },






  /**
    * Removes given column from content
    * @param c column to remove
    * @param list where collumn is present (select, filters)
    */
  removeColumn: (ebp: EdaBlankPanelComponent, c: Column, list?: string) => {
    ebp.disableBtnSave();

    // Busca de l'array index, la columna a borrar i ho fa
    if (list === 'select') {

      const match = _.findIndex(ebp.currentQuery, (o) => o.column_name == c.column_name && o.table_id == c.table_id && o.display_name == c.display_name );
      // Reseting all configs of column removed
      ebp.currentQuery[match].ordenation_type = 'No';
      ebp.currentQuery[match].aggregation_type.forEach(ag => ag.selected = false);
      ebp.currentQuery[match].format = '';
      ebp.currentQuery.splice(match, 1);
    } else if (list === 'filter') {
      const match = _.findIndex(ebp.filtredColumns, { column_name: c.column_name, table_id: c.table_id });
      ebp.filtredColumns.splice(match, 1);
    }
    // Carregar de nou l'array Columns amb la columna borrada

    PanelInteractionUtils.loadColumns(ebp, _.find(ebp.tables, (t) => t.table_name === c.table_id), ebp.hiddenColumn);
  
    // Buscar relacións per tornar a mostrar totes les taules
    if (ebp.currentQuery.length === 0 && ebp.filtredColumns.length === 0) {

      ebp.tablesToShow = ebp.tables;

    } else {
      _.map(ebp.currentQuery, selected => selected.table_id === c.table_id);
    }

    const filters = ebp.selectedFilters.filter(f => f.filter_column === c.column_name);
    filters.forEach(f => ebp.selectedFilters = ebp.selectedFilters.filter(ff => ff.filter_id !== f.filter_id));
  }

}