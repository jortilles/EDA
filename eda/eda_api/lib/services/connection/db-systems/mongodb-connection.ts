import { MongoDBBuilderService } from '../../query-builder/qb-systems/mongodb-builder-service';
import { AbstractConnection } from '../abstract-connection';
import { AggregationTypes } from '../../../module/global/model/aggregation-types';
import { MongoClient } from "mongodb";
import _ from 'lodash';

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

            let credentialStr = '';
            if (user && password) {
                credentialStr = `${user}:${password}@`;
            }

            this.connectUrl = `${type}://${credentialStr}${host}:${port}/${db}?authSource=${db}`;

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

    public async xgenerateDataModel(optimize: number, filters: string, name?: string): Promise<any> {
        return '';
    }

    // Función para obtener el tipo de una propiedad
    public getType(value) {
        if (Array.isArray(value)) return 'array';
        if (!isNaN(Number(value))) return 'numeric';
        if (value instanceof Date) return 'date';
        if (value instanceof Object) return 'object';
        if (typeof value == 'string') return 'text';
        return typeof value;
    }

    // Función para contar las propiedades, incluyendo propiedades anidadas, y obtener sus tipos
    public setColumns(collection: any[]) {
        const properties = [];

        for (const obj of collection) {
            let newCol: any = {
                column_name: obj.name,
                column_type: obj.type,
                display_name: {
                    default: obj.name,
                    localized: []
                },
                description: {
                    default: obj.name,
                    localized: []
                },
                minimumFractionDigits: 0,
                column_granted_roles: [],
                row_granted_roles: [],
                visible: true,
                tableCount: 0,
                valueListSource: {},
            }

            if (newCol.column_name.includes('.')) {
                newCol.aggregation_type = AggregationTypes.getValuesForOthers();
            } else if (newCol.column_type === 'numeric') {
                newCol.aggregation_type = AggregationTypes.getValuesForNumbers();
            } else if (newCol.column_type === 'text') {
                newCol.aggregation_type = AggregationTypes.getValuesForText();
            } else {
                newCol.aggregation_type = AggregationTypes.getValuesForOthers();
            }

            properties.push(newCol)
        }

        return properties;
    }

    public countProperties(obj, prefix = '') {
        let properties = [];

        for (let key in obj) {
            const fullKey = `${prefix}${key}`;
            const value = obj[key];

            if (key === '_id' && typeof value == 'object') {
                properties.push({ name: fullKey, type: this.getType(String(value)) });
            } else if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)) {
                // Si la propiedad es un objeto, profundizamos en él
                properties = properties.concat(this.countProperties(value, `${fullKey}.`));
            } else {
                properties.push({ name: fullKey, type: this.getType(value) });
            }
        }

        return properties;
    }

    public async generateDataModel(optimize: number, filters: string, name?: string) {
        try {
            this.client = await this.getclient();

            const db = this.client.db(this.config.database);

            // Obtener todas las colecciones de la base de datos
            const collections = await db.listCollections().toArray();
            const collectionsObjects = [];

            for (const collection of collections) {
                const collectionName = collection.name;
                console.log(`\nCollection: ${collectionName}`);

                // Obtener una muestra de documentos (limitamos a "sampleSize")
                const docs = await db.collection(collectionName).find({}).limit(10).toArray();

                if (docs.length > 0) {
                    let propertyCounts = [];
                    docs.forEach((doc, index) => {
                        const properties = this.countProperties(doc);
                        propertyCounts.push({
                            docIndex: index,
                            propertyCount: properties.length,
                            properties: properties
                        });
                    });

                    // Encontrar el documento con más propiedades
                    const maxPropertyDoc = propertyCounts.reduce((prev, current) => {
                        return (prev.propertyCount > current.propertyCount) ? prev : current;
                    });

                    const columns = this.setColumns(maxPropertyDoc.properties); 

                    const newTable = {
                        table_name: collectionName,
                        display_name: {
                            'default': this.normalizeName(collectionName),
                            'localized': []
                        },
                        description: {
                            'default': `${this.normalizeName(collectionName)}`,
                            'localized': []
                        },
                        table_granted_roles: [],
                        table_type: [],
                        columns: columns,
                        relations: [],
                        visible: true
                    };

                    collectionsObjects.push(newTable);

                } else {
                    console.log("La colección está vacía");
                }
            }
    
            return collectionsObjects;
        } catch (err) {
            console.error(err);
        } finally {
            // Cerrar la conexión con MongoDB
            await this.client.close();
        }
    }


    async execQuery(query: any): Promise<any> {
        const client = await this.getclient()

        try {
            // db and collection
            const database = client.db(this.config.database);
            const collection = database.collection(query.collectionName);
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
                    const keyColumn = (<any>field).replaceAll('.', '_');
                    acc[keyColumn] = '$'+field;
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

            console.log("Info de la consulta: ", JSON.stringify(query.pipeline));

            data = await collection.aggregate(query.pipeline).toArray();

            if (data.length > 0) {
                formatData = data.map(doc => {
                    const ordenado = query.columns.map(col => {
                        let key = col.replaceAll('.', '_');
                        // Verificar si el campo está en _id (caso de agrupación)
                        if (doc._id && doc._id.hasOwnProperty(col)) {
                            return doc._id[col];
                        } else if (doc._id && doc._id.hasOwnProperty(key)) {
                            return doc._id[key];
                        }
                        // De lo contrario, usar el campo de agregación directamente
                        return doc[key];
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

    override async getQueryBuilded(queryData: any, dataModel: any, user: any) {
        this.queryBuilder = new MongoDBBuilderService(queryData, dataModel, user);
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

    private normalizeName(name: string) {
        let out = name.split('_').join(' ');
        return out.toLowerCase()
            .split(' ')
            .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
            .join(' ');
    }


}
