import { SnowFlakeBuilderService } from './../../query-builder/qb-systems/snowflake-builder.service';
import { Snowflake } from 'snowflake-promise';
import { AbstractConnection } from '../abstract-connection';
import { AggregationTypes } from '../../../module/global/model/aggregation-types';
import DataSource from '../../../module/datasource/model/datasource.model';
export class SnowflakeConnection extends AbstractConnection {

  private queryBuilder: SnowFlakeBuilderService;
  private AggTypes: AggregationTypes;
  GetDefaultSchema = (): string => 'PUBLIC';
  getSchema = (): string => this.config.schema || this.GetDefaultSchema();


  async getclient(): Promise<any> {
    try {
      const snowflake = new Snowflake({
        account: this.config.host,
        username: this.config.user,
        password: this.config.password,
        database: this.config.database,
        schema: this.config.schema,
        warehouse: this.config.warehouse
      });

      return snowflake;

    } catch (err) {
      throw err;
    }
  }

  async tryConnection(): Promise<void> {

    try {
      this.client = await this.getclient();
      console.log('\x1b[32m%s\x1b[0m', 'Connecting to Snowflake database...\n');
      await this.client.connect();
      this.itsConnected();
      await this.client.destroy();
      return;

    } catch (err) {
      throw err;
    }
  }

  async generateDataModel(optimize: number, filter:string): Promise<any> {

    try {

      let tables = [];
      let tableNames = [];
      const tablesQuery = `SHOW TABLES IN SCHEMA ${this.getSchema()}`;
      const viewsQuery = `SHOW VIEWS IN SCHEMA  ${this.getSchema()}`;

      const resultTables = await this.execQuery(tablesQuery).then(res => res.map(row => ({ name: row.name, count: row.rows })));
      const resultViews = await this.execQuery(viewsQuery).then(res => res.map(row => ({ name: row.name, count: row.rows })));

      const filterTable = (str, filters) => {
        let isIncluded = false;
        filters.split(',').forEach(filter => {
          if(str.inlcludes(filter.trim())) isIncluded = true;
        });
        return isIncluded;
      }

      tableNames = [...resultTables, ...resultViews].filter(table => filterTable(table, filter));

      const foreignKeys = await this.execQuery(this.getForeigKeysQuery());

      /**set tables */
      for (let i = 0; i < tableNames.length; i++) {

        let newTable: any = await this.setTable(tableNames[i].name);
        newTable.tableCount = tableNames[i].count;
        tables.push(newTable);
        if(i> 500){
          console.log('Un datasource no puede tener más de 500 tablas ');
          i = tableNames.length + 1;
        }
      }

      /**Set columns */
      for (let i = 0; i < tables.length; i++) {
        for (let j = 0; j < tables[i].columns.length; j++) {
          tables[i].columns[j] = this.setColumns(tables[i].columns[j], tables[i].tableCount);
        }
      }

      /**Return datamodel with foreign-keys-relations if exists or custom relations if not */
      if (foreignKeys.length > 0) return await this.setForeignKeys(tables, foreignKeys);
      else return await this.setRelations(tables);


    } catch (err) {
      throw err;
    }
  }

  async execQuery(query: string): Promise<any> {

    const connection = await this.getclient();

    try {
      await connection.connect();
      const result = await connection.execute(query);
      connection.destroy();
      return result;

    } catch (err) {
      throw err
    }
  }

  async execSqlQuery(query: string): Promise<any> {
    return this.execQuery(query);
}




  async setTable(tableName: string) {

    const query = `SHOW COLUMNS IN TABLE "${this.getSchema()}"."${tableName}"`;

    try {

      const getColumns = await this.execQuery(query)
        .then(res => res.map(row => {
          return { column_name: row.column_name, column_type: JSON.parse(row.data_type).type }
        })
        );

      const newTable = {
        table_name: tableName,
        display_name: {
          'default': this.normalizeName(tableName),
          'localized': []
        },
        description: {
          'default': `${this.normalizeName(tableName)}`,
          'localized': []
        },
        table_granted_roles: [],
        table_type: [],
        columns: getColumns,
        relations: [],
        visible: true
      };

      return newTable;

    } catch (err) {
      throw err
    }
  }

  private setColumns(c, tableCount?: number) {
    let column = c;
    column.display_name = { default: this.normalizeName(column.column_name), localized: [] };
    column.description = { default: this.normalizeName(column.column_name), localized: [] };
    
    const dbType = column.column_type;
    column.column_type = this.normalizeType(dbType) || dbType;
    let floatOrInt =  this.floatOrInt(dbType);
    column.minimumFractionDigits = floatOrInt === 'int' &&  column.column_type === 'numeric' ? 0 
    : floatOrInt === 'float' &&  column.column_type === 'numeric' ? 2 : null;


    if (column.column_type === 'numeric') {
      column.aggregation_type = AggregationTypes.getValuesForNumbers();
    } else if (column.column_type === 'text') {
        column.aggregation_type = AggregationTypes.getValuesForText();
    } else {
        column.aggregation_type = AggregationTypes.getValuesForOthers();
    }

    column.computed_column == 'no'   // las posibilidades son no, computed_numeric, computed_string

    column.column_granted_roles = [];
    column.row_granted_roles = [];
    column.visible = true;
    column.tableCount = tableCount || 0;

    return column;
  }

  private normalizeName(name: string) {

    let out = name.split('_').join(' ');
    return out.toLowerCase()
      .split(' ')
      .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
      .join(' ');
  }

  getQueryBuilded(queryData: any, dataModel: any, user: any): Promise<any> {
    this.queryBuilder = new SnowFlakeBuilderService(queryData, dataModel, user);
    return this.queryBuilder.builder();
  }

  BuildSqlQuery(queryData: any, dataModel: any, user: any): string {
    this.queryBuilder = new SnowFlakeBuilderService(queryData, dataModel, user);
    return this.queryBuilder.sqlBuilder(queryData, queryData.filters)
  }


  createTable(queryData: any): string {
    throw new Error('Method not implemented.');
  }

  generateInserts(queryData: any): string {
    throw new Error('Method not implemented.');
  }

  getForeigKeysQuery(): string {
    return `
    select 
       fk_tco.table_name as foreign_table,
       fk_tco.constraint_name as fk_column,
       pk_tco.table_name as primary_table,
       pk_tco.constraint_name as pk_column
    from information_schema.referential_constraints rco
    join information_schema.table_constraints fk_tco 
     on fk_tco.constraint_name = rco.constraint_name
     and fk_tco.constraint_schema = rco.constraint_schema
    join information_schema.table_constraints pk_tco
     on pk_tco.constraint_name = rco.unique_constraint_name
     and pk_tco.constraint_schema = rco.unique_constraint_schema
    WHERE 
	  fk_tco.table_schema =     '${this.getSchema()}'
	  AND pk_tco.table_schema = '${this.getSchema()}' 
    order by fk_tco.table_schema,
         fk_tco.table_name;
    `
  }

}