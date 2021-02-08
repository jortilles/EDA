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

      this.pool = new BigQuery({ projectId, keyFilename });
      const sqlQuery = `SELECT "Ok" as succes`;
      const options = { query: sqlQuery };
      const [rows] = await this.pool.query(options);
      return;

    } catch (err) {

      throw err;

    }
  }

  async generateDataModel(optimize: string): Promise<any> {

    try {

      this.pool = this.getPool();
      const tableNames = [];
      const tables = [];
      const sqlQuery = `SELECT table_name FROM ${this.config.schema}.INFORMATION_SCHEMA.TABLES`;
      const options = { query: sqlQuery };
      const [rows] = await this.pool.query(options);

      for (let i = 0, n = rows.length; i < n; i++) {
        const result = rows[i];
        tableNames.push(result['table_name']);
      }

      for (let i = 0; i < tableNames.length; i++) {
        let new_table = await this.setTable(tableNames[i]);
        let count = 0;
        if (optimize === '1') {
          const dbCount = await this.countTable(tableNames[i]);
          count = dbCount[0][0].count;
        }
        new_table.tableCount = count;
        tables.push(new_table);
      }

      for (let i = 0; i < tables.length; i++) {
        for (let j = 0; j < tables[i].columns.length; j++) {
          tables[i].columns[j] = this.setColumns(tables[i].columns[j], tables[i].tableCount);
        }
      }

      return await this.commonColumns(tables);

    } catch (err) {
      throw err;
    }
  }

  private async setTable(tableName: string): Promise<any> {
    const query = `SELECT column_name, data_type AS column_type FROM ${this.config.schema}.INFORMATION_SCHEMA.COLUMNS WHERE table_name = '${tableName}';`;
    const options = { query: query };
    return new Promise(async (resolve, reject) => {
      try {
        const [getColumns] = await this.pool.query(options);
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

  private setColumns(c, tableCount?: number) {
    let column = c;
    column.display_name = { default: this.normalizeName(column.column_name), localized: [] };
    column.description = { default: this.normalizeName(column.column_name), localized: [] };
    column.column_type = this.normalizeType(column.column_type) || column.column_type;


    column.column_type === 'numeric'
      ? column.aggregation_type = AggregationTypes.getValues()
      : column.aggregation_type = [{ value: 'none', display_name: 'no' }];

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
        const count = await this.pool.query(options);
        resolve(count);
      } catch (err) {
        reject(err);
      }
    })
  }

  async getDataSource(id: string) {
    try {
      return await DataSource.findOne({ _id: id }, (err, datasource) => {
        if (err) {
          throw Error(err);
        }
        return datasource;
      });
    } catch (err) {
      console.log(err);
      throw err;
    }
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

    try{
      
      const projectId = this.config.project_id;
      const keyFilename = `D:/Proyectos/EDA/eda_api/lib/files/${this.config.project_id}.json`;
      const options = { query: query };
      const client = new BigQuery({ projectId, keyFilename });
      const results = await client.query(options);
  
      return results[0];

    }catch(err){
      console.log(err);
      throw err;
    }
  }


  getPool(): Promise<any> {

    const projectId = this.config.project_id;
    const keyFilename = `D:/Proyectos/EDA/eda_api/lib/files/${this.config.project_id}.json`;
    return new BigQuery({ projectId, keyFilename });

  }

  GetDefaultSchema(): string {
    throw new Error("Method not implemented.");
  }

  private async commonColumns(dm) {
    let data_model = dm;
    let visited = [];
    // Recorrem totes les columnes de totes les taules i comparem amb totes les columnes de cada taula (menys la que estem recorrent
    // Taules
    for (let l = 0; l < data_model.length; l++) {
      visited.push(data_model[l].table_name);
      // Columnes
      for (let k = 0; k < data_model[l].columns.length; k++) {
        let sourceColumn = { source_column: data_model[l].columns[k].column_name, column_type: data_model[l].columns[k].column_type };
        // Taules
        for (let j = 0; j < data_model.length; j++) {

          if (!visited.includes(data_model[j].table_name)) {
            // Columnes
            for (let i = 0; i < data_model[j].columns.length; i++) {
              let targetColumn = { target_column: data_model[j].columns[i].column_name, column_type: data_model[j].columns[i].column_type };
              if ((sourceColumn.source_column.toLowerCase().includes('_id') ||
                sourceColumn.source_column.toLowerCase().includes('id_') ||
                sourceColumn.source_column.toLowerCase().includes('number') ||
                sourceColumn.source_column.toLowerCase().startsWith("sk") ||
                sourceColumn.source_column.toLowerCase().startsWith("tk") ||
                sourceColumn.source_column.toLowerCase().endsWith("sk") ||
                sourceColumn.source_column.toLowerCase().endsWith("tk") ||
                sourceColumn.source_column.toLowerCase().includes('code'))
                && sourceColumn.source_column === targetColumn.target_column && sourceColumn.column_type === targetColumn.column_type) {

                // FER EL CHECK AMB ELS INNER JOINS ---- DESHABILITAT (Masses connexions a la db)
                let a = true; //await checkJoins(pool, data_model[l].table_name, sourceColumn.source_column, data_model[j].table_name, targetColumn.target_column);

                if (a) {
                  data_model[l].relations.push({
                    source_table: data_model[l].table_name,
                    source_column: [sourceColumn.source_column],
                    target_table: data_model[j].table_name,
                    target_column: [targetColumn.target_column],
                    visible: true
                  });
                  data_model[j].relations.push({
                    source_table: data_model[j].table_name,
                    source_column: [targetColumn.target_column],
                    target_table: data_model[l].table_name,
                    target_column: [sourceColumn.source_column],
                    visible: true
                  });

                }
              }
            }
          }
        }
      }
    }
    return data_model;
  }

}