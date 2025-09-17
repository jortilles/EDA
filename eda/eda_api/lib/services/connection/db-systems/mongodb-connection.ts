import { MongoDBBuilderService } from '../../query-builder/qb-systems/mongodb-builder-service';
import { AbstractConnection } from '../abstract-connection';
import { MongoClient } from "mongodb";
import _ from 'lodash';
const databaseUrl = require('../../../../config/database.config');


export class MongoDBConnection extends AbstractConnection {

    GetDefaultSchema(): string {
        return 'public';
    }

    private connectUrl: string;
    private queryBuilder: MongoDBBuilderService;

    async getclient() {
        try {
            const type = this.config.type;
            const host = this.config.host;
            const port = this.config.port;
            const db = this.config.database;
            const user = this.config.user;
            const password = this.config.password;
            let authSource = this.config.authSource;

            let credentialStr = '';
            if (user && password) {
                credentialStr = `${user}:${password}@`;
            }

            if(authSource == undefined || authSource == null){
                authSource = 'admin';
                const parsedUrl = new URL(databaseUrl?.url);
                authSource =  parsedUrl.search.split('=')[1];
                console.log('it is needed to add the authshource in the mongo connection');
            }

            this.connectUrl = `${type}://${credentialStr}${host}:${port}/${db}?authSource=${authSource}`;

            const options = { useNewUrlParser: true, useUnifiedTopology: true };
            const connection = await MongoClient.connect(this.connectUrl, options);
            return connection;
        } catch (error) {
            throw error;
        }
    }

    async tryConnection(): Promise<any> {
        try {
            this.client = await this.getclient();
            console.log('\x1b[32m%s\x1b[0m', 'Connecting to MongoDB🍃 database...\n');
            await this.client.connect();
            this.itsConnected();
            await this.client.close();
            return;
        } catch (err) {
            throw err;
        }
    }

    public async generateDataModel(optimize: number, filters: string, name?: string): Promise<any> {
        return '';
    }

    async execQuery(query: any): Promise<any> {
        const client = await this.getclient()

        try {
            // db and collection
            const database = client.db(this.config.database);
            const collection = database.collection('xls_' + query.collectionName);

            const aggregations = query.aggregations || {};

            // prevent to display all the fields with projection (select)
            const projection = query.columns.reduce((acc: any, field: string) => {
                if (aggregations['count_distinct']?.includes(field)) {
                    acc[field] = { $size: `$${field}` };
                } else if (_.isEmpty(query.dateProjection) && query.dateFormat[field] === 'No') {
                    acc[field] = { $dateToString: { format: "%Y-%m-%d", date: { $dateFromString: { dateString: `$${field}` } } } };
                } else if (!_.isEmpty(query.dateProjection) && query.dateProjection[field]) {
                    acc[field] = query.dateProjection[field];
                } else {
                    if (query.pipeline[0]['$group']['_id'][field] == `$${field}`) {
                        acc[field] = `$_id.${field}`;
                    } else {
                        acc[field] = 1;
                    }
                }
                return acc;
            }, {});

            let data: any;
            // Format and sort
            let formatData = [];

            if (!_.isEmpty(query.dateProjection)) {
                query.pipeline.unshift({ $project: projection });
            }

            query.pipeline.push({ $project: projection });

            // Filters always before $group
            if (query.filters && !_.isEmpty(query.filters)) {
                query.pipeline.unshift({ $match: query.filters });
            }

            // HavingFilters always after $group
            if (query.havingFilters && !_.isEmpty(query.havingFilters)) {
                query.pipeline.push({ $match: query.havingFilters });
            }


            
            if (query.ordenationType.some((order) => order.ordenationType != 'No')) {
                let $sort = {};

                query.ordenationType.forEach(o => {
                    if (o.ordenationType == 'Desc') {
                        $sort[o.column] = -1;
                    } else if (o.ordenationType == 'Asc') {
                        $sort[o.column] = 1;
                    }
                });

                query.pipeline.push({ ['$sort']: $sort });
            }

            data = await collection.aggregate(query.pipeline).toArray();


            if (data.length > 0) {
                formatData = data.map(doc => {
                    const ordenado = query.columns.map(col => {
                        // Verificar si el campo está en _id (caso de agrupación)
                        if (doc._id && doc._id.hasOwnProperty(col)) {
                            return doc._id[col];
                        }
                        // De lo contrario, usar el campo de agregación directamente
                        return doc[col];
                    });
                    return ordenado;
                });
            }

            return formatData;
        } catch (err) {
            console.error(err);
            throw err;
        } finally {
            await client.close();
        }
    }


    async execSqlQuery(query: string): Promise<any> {
        return this.execQuery(query);
    }

    override async getQueryBuilded(queryData: any, dataModel: any, user: any, limit: number) {
        this.queryBuilder = new MongoDBBuilderService(queryData, dataModel, user, limit);
        return this.queryBuilder.builder();
    }

    public BuildSqlQuery(queryData: any, dataModel: any, user: any): string {
        return '';
    }

    public createTable(queryData: any, user: any): string {
        return '';
    }

    public generateInserts(queryData: any, user: any): string {
        return '';
    }


}
