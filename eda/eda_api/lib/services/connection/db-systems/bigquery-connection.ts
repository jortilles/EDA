import { BigQueryBuilderService } from './../../query-builder/qb-systems/bigquery-builder.service';
import { AggregationTypes } from '../../../module/global/model/aggregation-types';
import { AbstractConnection } from "../abstract-connection";
import DataSource from '../../../module/datasource/model/datasource.model';
const { BigQuery } = require('@google-cloud/bigquery');

export class BigQueryConnection extends AbstractConnection {

  private queryBuilder: BigQueryBuilderService;

  async tryConnection(): Promise<void> {

    try {
      const projectId = this.config.project_id;
      const keyFilename = `D:/Proyectos/EDA/eda_api/lib/files/${this.config.project_id}.json`;

      this.client = new BigQuery({ projectId, keyFilename });
      const sqlQuery = `SELECT "Ok" as succes`;
      const options = { query: sqlQuery };
      const [rows] = await this.client.query(options);
      return;

    } catch (err) {

      throw err;

    }
  }

  async generateDataModel(optimize: number, filter:string): Promise<any> {

    try {

      this.client = this.getclient();
      const tableNames = [];
      const tables = [];

      /**
      * Set filter for tables if exists
      */
      const filters = filter ? filter.split(',') : []
      let filter_str = filter ? `where ( table_name LIKE '${filters[0].trim()}'` : ``;
      for (let i = 1; i < filters.length; i++) {
        filter_str += ` OR table_name LIKE '${filters[i].trim()}'`;
      }
      if (filter) filter_str += ' )';

      const sqlQuery = `SELECT table_name FROM ${this.config.schema}.INFORMATION_SCHEMA.TABLES ${filter_str}`;
      const options = { query: sqlQuery };
      const [rows] = await this.client.query(options);

      for (let i = 0, n = rows.length; i < n; i++) {
        const result = rows[i];
        tableNames.push(result['table_name']);
      }

      for (let i = 0; i < tableNames.length; i++) {

        let new_table = await this.setTable(tableNames[i]);
        let count = 0;
        if (optimize === 1) {
          const dbCount = await this.countTable(tableNames[i]);
          count = dbCount[0][0].count;
        }
        new_table.tableCount = count;
        tables.push(new_table);
        if(i> 500){
          console.log('Un datasource no puede tener más de 500 tablas ');
          i = tableNames.length + 1;
      }
      }

      for (let i = 0; i < tables.length; i++) {
        for (let j = 0; j < tables[i].columns.length; j++) {
          tables[i].columns[j] = this.setColumns(tables[i].columns[j], tables[i].tableCount);
        }
      }

      return await this.setRelations(tables);

    } catch (err) {
      throw err;
    }
  }

  private async setTable(tableName: string): Promise<any> {
    const query = `SELECT column_name, data_type AS column_type FROM ${this.config.schema}.INFORMATION_SCHEMA.COLUMNS WHERE table_name = '${tableName}';`;
    const options = { query: query };
    return new Promise(async (resolve, reject) => {
      try {
        const [getColumns] = await this.client.query(options);
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
        resolve(newTable);
      } catch (err) {
        reject(err);
      }
    });
  }

  private setColumns(c: any, tableCount?: number) {
    let column = c;
    column.display_name = { default: this.normalizeName(column.column_name), localized: [] };
    column.description = { default: this.normalizeName(column.column_name), localized: [] };

    const dbType = column.column_type;
    column.column_type = this.normalizeType(dbType) || dbType;
    let floatOrInt = this.floatOrInt(dbType);
    column.minimumFractionDigits = floatOrInt === 'int' && column.column_type === 'numeric' ? 0
      : floatOrInt === 'float' && column.column_type === 'numeric' ? 2 : null;


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

  private async countTable(tableName: string): Promise<any> {
    const query = `
    SELECT count(*) as count from ${this.config.schema}.${tableName}
    `;
    const options = { query: query };
    return new Promise(async (resolve, reject) => {
      try {
        const count = await this.client.query(options);
        resolve(count);
      } catch (err) {
        reject(err);
      }
    })
  }

  async getQueryBuilded(queryData: any, dataModel: any, user: any) {
    this.queryBuilder = new BigQueryBuilderService(queryData, dataModel, user);
    return this.queryBuilder.builder();
  }

  BuildSqlQuery(queryData: any, dataModel: any, user: any): string {
    this.queryBuilder = new BigQueryBuilderService(queryData, dataModel, user);
    return this.queryBuilder.sqlBuilder(queryData, queryData.filters);
  }

  createTable(queryData: any): string {
    throw new Error("Method not implemented.");
  }
  generateInserts(queryData: any): string {
    throw new Error("Method not implemented.");
  }

  async execQuery(query: string): Promise<any> {

    try {

      const projectId = this.config.project_id;
      const keyFilename = `D:/Proyectos/EDA/eda_api/lib/files/${this.config.project_id}.json`;
      const options = { query: query };
      const client = new BigQuery({ projectId, keyFilename });
      const results = await client.query(options);

      return results[0];

    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async execSqlQuery(query: string): Promise<any> {
    return this.execQuery(query);
  
  }


  getclient(): Promise<any> {

    const projectId = this.config.project_id;
    const keyFilename = `D:/Proyectos/EDA/eda_api/lib/files/${this.config.project_id}.json`;
    return new BigQuery({ projectId, keyFilename });

  }

  GetDefaultSchema(): string {
    throw new Error("Method not implemented.");
  }

}