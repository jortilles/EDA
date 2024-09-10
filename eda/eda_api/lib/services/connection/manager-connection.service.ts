import { SnowflakeConnection } from './db-systems/snowflake-connection';
import { BigQueryConnection } from './db-systems/bigquery-connection';
import { OracleConnection } from './db-systems/oracle-connection';
import { VerticaConnection } from './db-systems/vertica-connection';
import { MysqlConnection } from './db-systems/mysql-connection';
import { PgConnection } from './db-systems/pg-connection';
import { AbstractConnection } from './abstract-connection';
import { EnCrypterService } from '../encrypter/encrypter.service';
import { SQLserverConnection } from './db-systems/slqserver-connection';
import { JSONWebServiceConnection } from './db-systems/json-webservice-connection';
import { MongoDBConnection } from './db-systems/mongodb-connection';
import DataSource from '../../module/datasource/model/datasource.model';

export const
    MS_CONNECTION = 'mssql',
    MY_CONNECTION = 'mysql',
    PG_CONNECTION = 'postgres',
    VE_CONNECTION = 'vertica',
    SQLS_CONNECTION = 'sqlserver',
    ORACLE_CONNECTION = 'oracle',
    BIGQUERY_CONNECTION = 'bigquery',
    SNOWFLAKE_CONNECTION = 'snowflake',
    WEB_SERVICE = 'jsonwebservice',
    MONGODB_CONNECTION = 'mongodb'



export class ManagerConnectionService {

    static async getConnection(id: string, properties?: any): Promise<AbstractConnection> {
        const datasource = await this.getDataSource(id);
        const config = datasource.ds.connection;
        config.password = EnCrypterService.decode(config.password || ' ');

        // Esto sirve solo para postgres y se pasa con la sintaxis de prostgres. 
        // Si se quisiera implementar para otras bbdd habría que hacerlo.
        if (properties) {
            config.options = '';
            for (const prop in properties) {
                // pasamos las custom properties en el parametro options.
                config.options += ' -c '+ prop + '=' +properties[prop];
            }
        }

        switch (config.type) {
            case MS_CONNECTION:
            // return new MsConnection(config, secondary);
            case MY_CONNECTION:
                return new MysqlConnection(config);
            case PG_CONNECTION:
                return new PgConnection(config);
            case VE_CONNECTION:
                return new VerticaConnection(config);
            case SQLS_CONNECTION:
                return new SQLserverConnection(config);
            case ORACLE_CONNECTION:
                return new OracleConnection(config);
            case BIGQUERY_CONNECTION:
                return new BigQueryConnection(config);
            case SNOWFLAKE_CONNECTION:
                return new SnowflakeConnection(config);
            case WEB_SERVICE:
                return new JSONWebServiceConnection(config);
            case MONGODB_CONNECTION:
                return new MongoDBConnection(config);
            default:
                return null;
        }
    }

    static async testConnection(config: any): Promise<AbstractConnection> {
        switch (config.type) {
            case MS_CONNECTION:
            //return new MsConnection(config, secondary);
            case MY_CONNECTION:
                return new MysqlConnection(config);
            case PG_CONNECTION:
                return new PgConnection(config);
            case VE_CONNECTION:
                return new VerticaConnection(config);
            case SQLS_CONNECTION:
                return new SQLserverConnection(config);
            case ORACLE_CONNECTION:
                return new OracleConnection(config);
            case BIGQUERY_CONNECTION:
                return new BigQueryConnection(config);
            case SNOWFLAKE_CONNECTION:
                return new SnowflakeConnection(config);
            case WEB_SERVICE:
                return new JSONWebServiceConnection(config);
            case MONGODB_CONNECTION:
                    return new MongoDBConnection(config);
            default:
                return null;
        }
    }

    private static async switchConnection(type: string) {

    }

    private static async getDataSource(id: string): Promise<any> {
        try {
            return await DataSource.findOne({ _id: id }, (err, datasource) => {
                if (err) {
                    throw Error(err);
                }
                return datasource;
            });
        } catch (err) {
            throw err;
        }
    }
}

export default ManagerConnectionService;
