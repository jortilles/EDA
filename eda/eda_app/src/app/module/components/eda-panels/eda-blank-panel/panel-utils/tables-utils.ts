import * as _ from 'lodash';

export const TableUtils = {

  sortTables : (a : any, b:any) => (a.display_name.default > b.display_name.default) ? 1 : ((b.display_name.default > a.display_name.default) ? -1 : 0),

  /**
    * Recursive function to find all related tables to given table
    * @param tables Model's tables
    * @param table  origin table to start building the path
    * @param vMap   Map() to keep tracking visited nodes -> first call is just a new Map()
  */
  findRelationsRecursive: (tables: any, table: any, vMap: any) => {

    vMap.set(table.table_name, table);

    table.relations.filter(r => r.visible !== false)
      .forEach(rel => {
        const newTable = tables.find(t => t.table_name === rel.target_table);
        if (!vMap.has(newTable.table_name)) {
          TableUtils.findRelationsRecursive(tables, newTable, vMap);
        }
      });

    return vMap;

  },

  /**
   * Filter and sort tables given a refference table
   * @param allTables: Tables to filter
   * @param refferenceTable : refference table 
   * @return all tables related to reffernce table
   *  
   */
  filterTables: (allTables: Array<any>, refferenceTable: string) => {

    const tablesMap = TableUtils.findRelationsRecursive(allTables, refferenceTable, new Map());
    let tables: Array<any> = Array.from(tablesMap.values());

    tables = tables.sort(TableUtils.sortTables);

    return tables

  },

  /**
   * Sets tables data 
   * @param tables: model's tables
   * @param applyToAllfilter 
   * @return alltables, sqlOrigintables, tablesToShow
   */

  getTablesData: (tables: Array<any>, applyToAllfilter: { present: boolean, refferenceTable: string, id: string }) => {

    let allTables = tables.filter(table => table.visible === true)
      .sort(TableUtils.sortTables);

    if (applyToAllfilter.present) {

      const originTable = allTables.filter(t => t.table_name === applyToAllfilter.refferenceTable)[0];
      allTables = TableUtils.filterTables(tables, originTable).filter(table => table.visible === true);

    }

    let sqlOriginTables = allTables.map(table => {
      return { label: table.display_name.default, value: table.table_name }
    });

    let tablesToShow = _.cloneDeep(allTables);

    return { allTables : allTables, sqlOriginTables : sqlOriginTables, tablesToShow : tablesToShow }

  }

}