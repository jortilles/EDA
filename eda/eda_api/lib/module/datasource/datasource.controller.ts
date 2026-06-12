import { NextFunction, Request, Response } from 'express';
import DataSource, { IDataSource } from './model/datasource.model';
import Dashboard from '../dashboard/model/dashboard.model';
import { HttpException } from '../global/model/index';
import ManagerConnectionService from '../../services/connection/manager-connection.service';
import ConnectionModel from './model/connection.model';
import { EnCrypterService } from '../../services/encrypter/encrypter.service';
import BigQueryConfig from './model/BigQueryConfig.model';
import CachedQuery from '../../services/cache-service/cached-query.model';
import { QueryOptions } from 'mongoose';
import { upperCase } from 'lodash';
import Group from '../../module/admin/groups/model/group.model';
import _ from 'lodash';
import * as path from 'path';
import * as fs from 'fs';
import { AggregationTypes } from '../global/model/aggregation-types';
import { OdooApiService } from '../../services/odoo/odoo-api.service';
import { GA4ApiService } from '../../services/google-analytics/ga4-api.service';
import { applyGA4Labels, extractGA4LocaleFromRequest } from '../../services/google-analytics/ga4-labels';
import { applyOdooLabels, resolveOdooLocale } from '../../services/odoo/odoo-labels';
import { HoldedApiService } from '../../services/holded/holded-api.service';
import { applyHoldedLabels, resolveHoldedLocale } from '../../services/holded/holded-labels';
import { DuckDBConnection } from '../../services/connection/db-systems/duckdb-connection';
const cache_config = require('../../../config/cache.config');

export class DataSourceController {

    static async GetDataSources(req: Request, res: Response, next: NextFunction) {
        // Esto es pare recuperar los filtros externos.
        const filter = DataSourceController.returnExternalFilter(req);
        try {
            //si no lleva filtro, pasamos directamente a recuperarlos todos
            const datasources = JSON.stringify(filter) !== '{}' ?
                await DataSource.find({ $or: Object.entries(filter).map(([clave, valor]) => ({ [clave]: valor })) }).exec() :
                await DataSource.find({}).exec();

            const protectedDataSources = [];
            for (let i = 0, n = datasources.length; i < n; i += 1) {
                const datasource = datasources[i];
                datasource.ds.connection.password = EnCrypterService.decode(datasource.ds.connection.password);
                datasource.ds.connection.password = '__-(··)-__';
                protectedDataSources.push(datasource);
            }
            if (req?.qs.tags && datasources) return res.status(200).json({ ok: true, ds: DataSourceController.returnTagsFromDataSource(req, datasources) });
            if (!req?.qs.tags) return res.status(200).json({ ok: true, ds: protectedDataSources });
        } catch (err) {
            return next(new HttpException(404, 'Error loading DataSources'));
            next(err);
        }
    }

    static async GetDataSourceById(req: Request, res: Response, next: NextFunction) {
        try {
            const dataSource = await DataSource.findById({ _id: req.params.id });
            // ocultem el password (solo si hay password que decodificar)
            if (dataSource.ds.connection.password) {
                dataSource.ds.connection.password = EnCrypterService.decode(dataSource.ds.connection.password);
            }
            dataSource.ds.connection.password = '__-(··)-__';
            return res.status(200).json({ ok: true, dataSource });
        } catch (err) {
            next(new HttpException(404, 'Datasource not found'));
        }
    }

    /**
     *  this function returns the datasource list
     * @param req  request 
     * @param res response
     * @param next next funciont
     * @returns all the datasources
     */

    static async GetDataSourcesNames(req: Request, res: Response, next: NextFunction) {

        let options: QueryOptions = {};
        // Esto es pare recuperar los filtros externos.
        const filter = DataSourceController.returnExternalFilter(req);
        try {
            //si no lleva filtro, pasamos directamente a recuperarlos todos
            const datasources = JSON.stringify(filter) !== '{}' ?
                await DataSource.find({ $or: Object.entries(filter).map(([clave, valor]) => ({ [clave]: valor })) }, '_id ds.metadata.model_name ds.security', options).exec() :
                await DataSource.find({}, '_id ds.metadata.model_name ds.security', options).exec();
            if (!datasources) {
                return next(new HttpException(500, 'Error loading DataSources'));
            }
            const names = JSON.parse(JSON.stringify(datasources));
            const output = [];
            for (let i = 0, n = names.length; i < n; i += 1) {
                const e = names[i];
                output.push({ _id: e._id, model_name: e.ds.metadata.model_name });
            }
            output.sort((a, b) => (upperCase(a.model_name) > upperCase(b.model_name)) ? 1 :
                ((upperCase(b.model_name) > upperCase(a.model_name)) ? -1 : 0))
            return res.status(200).json({ ok: true, ds: output });
        } catch (e) {
            console.log('Error getting GetDataSourcesNames');
            console.log(e);
        }

    }



    /**
     *  Returns all the datoasources availables to create a new dashboard once they are filtered by users permissions. 
     * @param req 
     * @param res 
     * @param next 
     * @returns  datasource list filtered by user's permission.
     */
    /**
     *  Returns all the datoasources availables to create a new dashboard once they are filtered by users permissions. 
     * @param req 
     * @param res 
     * @param next 
     * @returns  datasource list filtered by user's permission.
     */
    static async GetDataSourcesNamesForDashboard(req: Request, res: Response, next: NextFunction) {
        const userID = req.user._id;
        let options: QueryOptions = {};
        // Esto es pare recuperar los filtros externos.
        const filter = DataSourceController.returnExternalFilter(req);
        try {
            //si no lleva filtro, pasamos directamente a recuperarlos todos           
            const datasources = JSON.stringify(filter) !== '{}' ?
                await DataSource.find({ $or: Object.entries(filter).map(([clave, valor]) => ({ [clave]: valor })) }, '_id ds.metadata.model_name ds.metadata.model_granted_roles ds.metadata.model_owner ds.metadata.ia_visibility', options).exec() :
                await DataSource.find({}, '_id ds.metadata.model_name ds.metadata.model_granted_roles ds.metadata.model_owner ds.metadata.model_description ds.metadata.ia_visibility', options).exec();

            if (!datasources) {
                return next(new HttpException(500, 'Error loading DataSources'));
            }
            const names = JSON.parse(JSON.stringify(datasources));
            const output = [];
            for (let i = 0, n = names.length; i < n; i += 1) {
                const e = names[i];
                // Si hay permisos de seguridad.....
                if (e.ds.metadata.model_granted_roles?.length > 0) {
                    const users = [];
                    const roles = [];
                    let allCanSee = 'false';
                    //Get users with permission
                    e.ds.metadata.model_granted_roles.forEach(permission => {
                        switch (permission.type) {
                            case 'anyoneCanSee':
                                if (permission.permission === true) {
                                    allCanSee = 'true';
                                }
                                break;
                            case 'users':
                                permission.users.forEach(user => {
                                    if (!users.includes(user)) users.push(user);
                                });
                                break;
                            case 'groups':
                                req.user.role.forEach(role => {
                                    if (permission.groups.includes(role)) {
                                        if (!roles.includes(role)) roles.push(role);
                                    }
                                });
                        }
                    });
                    if (users.includes(userID) || roles.length > 0 || allCanSee == 'true' || req.user.role.includes('135792467811111111111110') /* admin role  los admin lo ven todo*/) {
                        output.push({ _id: e._id, model_name: e.ds.metadata.model_name, model_description: e.ds.metadata.model_description ?? null, ia_visibility: e.ds.metadata.ia_visibility ?? 'FULL' });
                    }

                } else {
                    output.push({ _id: e._id, model_name: e.ds.metadata.model_name, model_description: e.ds.metadata.model_description ?? null, ia_visibility: e.ds.metadata.ia_visibility ?? 'FULL' });
                }
            }
            output.sort((a, b) => (upperCase(a.model_name) > upperCase(b.model_name)) ? 1 :
                ((upperCase(b.model_name) > upperCase(a.model_name)) ? -1 : 0))





            return res.status(200).json({ ok: true, ds: output });
        } catch (e) {
            console.log('Error loading DataSources');
            console.log(e);
        }





    }


    /* Aquesta funció retorna els datasources disponibles per editar al llistat de l'esquerra.
   Aquesta funció sustitueix GetDataSourcesNames en la nova versió on cada usuari por afegir i editar models de dades */
    static async GetDataSourcesNamesForEdit(req: Request, res: Response, next: NextFunction) {
        const groups = await Group.find({ users: { $in: req.user._id } }).exec();
        const isAdmin = groups.filter(g => g.role === 'EDA_ADMIN_ROLE').length > 0;
        const output = [];
        let options: QueryOptions = {};
        // Si l'usuari es admin retorna tots els ds.
        if (isAdmin) {
            try {
                // Buscar DataSources
                const dataSources = await DataSource.find({}, '_id ds.metadata.model_name ds.security');

                if (!dataSources) {
                    return next(new HttpException(500, 'Error loading DataSources'));
                }

                // Transformar datos
                const output = dataSources.map(ds => ({ _id: ds._id, model_name: ds.ds.metadata.model_name }));

                // Ordenar por model_name ignorando mayúsculas
                output.sort((a, b) => {
                    const nameA = a.model_name.toUpperCase();
                    const nameB = b.model_name.toUpperCase();
                    return nameA > nameB ? 1 : nameA < nameB ? -1 : 0;
                });

                return res.status(200).json({ ok: true, ds: output });

            } catch (err) {
                return next(new HttpException(500, 'Error loading DataSources'));
            }


        } else {
            // if the user is not admin it return his own ones. 
            try {
                // Filtrar DataSources por el owner actual
                const dataSources = await DataSource.find({ 'ds.metadata.model_owner': { $in: [req.user._id] } }, '_id ds.metadata.model_name ds.metadata.model_owner');

                if (!dataSources) {
                    return next(new HttpException(500, 'Error loading DataSources'));
                }

                // Transformar los documentos
                const output = dataSources.map(ds => ({ _id: ds._id, model_name: ds.ds.metadata.model_name }));

                // Ordenar por model_name ignorando mayúsculas
                output.sort((a, b) => {
                    const nameA = a.model_name.toUpperCase();
                    const nameB = b.model_name.toUpperCase();
                    return nameA > nameB ? 1 : nameA < nameB ? -1 : 0;
                });

                return res.status(200).json({ ok: true, ds: output });

            } catch (err) {
                return next(new HttpException(500, 'Error loading DataSources'));
            }

        }
    }

    static async UpdateDataSource(req: Request, res: Response, next: NextFunction) {

        try {
            // Validation request
            const body = req.body;
            console.log('[UpdateDataSource] body keys:', Object.keys(body || {}));
            console.log('[UpdateDataSource] body.ds?.connection?.type:', body?.ds?.connection?.type);

            const psswd = body.ds.connection.password;
            let ds: IDataSource;
            let id = req.body._id;
            if (id === undefined) {
                id = req.params.id;
            }
            if (typeof id == 'object') {
                id = id.$oid;
                body._id = id;
            }
            console.log('[UpdateDataSource] resolved id:', id);

            try {
                const dataSource: IDataSource = await DataSource.findById(id);
                console.log('[UpdateDataSource] dataSource found:', !!dataSource);

                if (!dataSource) {
                    console.log('[UpdateDataSource] → new datasource, inserting');
                    let cadena = JSON.stringify(body);
                    cadena = cadena.split('$oid').join('id');
                    ds = new DataSource(JSON.parse(cadena.toString()));
                    ds.ds.metadata.model_owner = req.user?._id;

                } else {
                    console.log('[UpdateDataSource] → existing datasource, updating');
                    const originalOwner = dataSource.ds.metadata.model_owner;
                    body.ds.connection.password = psswd === '__-(··)-__' ? dataSource.ds.connection.password : EnCrypterService.encrypt(body.ds.connection.password);
                    let cadena = JSON.stringify(body.ds);
                    cadena = cadena.split('$oid').join('id');
                    dataSource.ds = JSON.parse(cadena.toString());
                    ds = dataSource;
                    ds.ds.metadata.model_owner = originalOwner;

                    console.log('[UpdateDataSource] tables in body:', ds.ds?.model?.tables?.map((t: any) => ({
                        table_name: t.table_name,
                        columns: t.columns?.length,
                        has_relations: Array.isArray(t.relations),
                        first_col_keys: t.columns?.[0] ? Object.keys(t.columns[0]) : []
                    })));

                    // Normalize columns sent in external format { field, type, format, separator }
                    // to the EDA model format { column_name, column_type, display_name, ... }
                    if (ds.ds?.connection?.type === 'duckdb') {
                        const normName = (s: string) => s.replace(/_/g, ' ').split(' ')
                            .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

                        (ds.ds.model?.tables || []).forEach((table: any) => {
                            if (!Array.isArray(table.columns)) return;
                            table.columns = table.columns.map((col: any) => {
                                // Already in EDA format — leave untouched
                                if (col.column_name !== undefined) return col;

                                const rawType: string = col.type || 'text';
                                let colType: string;
                                switch (rawType) {
                                    case 'integer':
                                    case 'numeric':   colType = 'numeric'; break;
                                    case 'timestamp': colType = 'date';    break;
                                    default:          colType = 'text';
                                }
                                const displayName = normName((col.field || '').replace(/_/g, ' '));
                                return {
                                    column_name: col.field,
                                    column_type: colType,
                                    display_name:  { default: displayName, localized: [] },
                                    description:   { default: displayName, localized: [] },
                                    aggregation_type: colType === 'numeric'
                                        ? AggregationTypes.getValuesForNumbers()
                                        : colType === 'date'
                                        ? AggregationTypes.getValuesForOthers()
                                        : AggregationTypes.getValuesForText(),
                                    minimumFractionDigits: rawType === 'integer' ? 0 : rawType === 'numeric' ? 2 : null,
                                    computed_column: 'no',
                                    visible: true,
                                    ia_visibility: 'FULL',
                                    column_granted_roles: [],
                                    row_granted_roles: [],
                                    tableCount: 0
                                };
                            });
                        });
                        console.log('[UpdateDataSource] DuckDB columns normalized');
                    }

                    if (String(req.user._id) !== String(originalOwner)) {
                        const groups = await Group.find({ users: { $in: req.user._id } }).exec();
                        const editorRole = groups.length > 0 ? groups[0].role : 'UNKNOWN';
                        if (!Array.isArray(ds.ds.metadata.model_updates)) {
                            ds.ds.metadata.model_updates = [];
                        }
                        ds.ds.metadata.model_updates.push({
                            user: req.user._id,
                            role: editorRole,
                            date: new Date().toISOString()
                        });
                        if (ds.ds.metadata.model_updates.length > 50) {
                            ds.ds.metadata.model_updates = ds.ds.metadata.model_updates.slice(-50);
                        }
                    }
                }

                console.log('[UpdateDataSource] processing relations, tables count:', ds.ds?.model?.tables?.length);

                //aparto las relaciones ocultas para optimizar el modelo.
                ds.ds.model.tables.forEach(t => {
                    t.no_relations = t?.relations ? t.relations.filter((r: any) => r.visible == false) : [];
                });
                ds.ds.model.tables.forEach(t => {
                    t.relations = t?.relations ? t.relations.filter((r: any) => r.visible !== false) : [];
                });

                console.log('[UpdateDataSource] relations processed OK');

                /** Comprobacionde la reciprocidad de las relaciones */
                ds.ds.model.tables.forEach(tabla => {
                    tabla.relations.forEach(relacion => {
                        const tablas_dstino_array = ds.ds.model.tables.filter(t => t.table_name == relacion.target_table);
                        tablas_dstino_array.forEach(t => {
                            const r = t.relations.filter(r => r.source_table == relacion.target_table &&
                                JSON.stringify(r.source_column) == JSON.stringify(relacion.target_column) &&
                                r.target_table == relacion.source_table &&
                                JSON.stringify(r.target_column) == JSON.stringify(relacion.source_column));
                            if (r.length == 0) {
                                // si la relacion no se encuentra la meto
                                const mi_relacion = {
                                    source_table: relacion.target_table,
                                    source_column: relacion.target_column,
                                    target_table: relacion.source_table,
                                    target_column: relacion.source_column,
                                    visible: true
                                }
                                t.relations.push(mi_relacion);
                                ds.ds.model.tables = JSON.parse(JSON.stringify(ds.ds.model.tables.filter(item => item.table_name !== t.table_name)));
                                ds.ds.model.tables.push(t);
                            }
                        })
                    })
                });

                console.log('[UpdateDataSource] reciprocity check done, calling markModified + save');

                ds.markModified('ds');

                try {
                    const dataSource = await ds.save();
                    console.log('[UpdateDataSource] save OK, _id:', dataSource._id);
                    return res.status(200).json({ ok: true, message: 'Modelo actualizado correctamente' });
                } catch (error) {
                    console.log('[UpdateDataSource] save ERROR:', error);
                    next(new HttpException(500, 'Error updating dataSource'));
                }
            } catch (err) {
                console.log('[UpdateDataSource] inner catch ERROR:', err);
                return next(new HttpException(500, 'Datasouce not found'));
            }
        } catch (err) {
            console.log('[UpdateDataSource] outer catch ERROR:', err);
            next(err);
        }
    }

    static async DeleteDataSource(req: Request, res: Response, next: NextFunction) {
        try {
            const dashboards = await Dashboard.find();
                const dbds = dashboards.filter(d => d.config.ds._id === req.params.id);
                let stopLoop = false;

                try {
                    // Eliminar todos los dashboards asociados
                    for (const dbd of dbds) {
                        const dashboard = await Dashboard.findByIdAndDelete(dbd._id);
                        if (!dashboard) {
                            return next(new HttpException(500, `Error removing dashboard with id ${dbd._id}`));
                        }
                    }

                    // Eliminar el DataSource
                    const dataSource = await DataSource.findByIdAndDelete(req.params.id);
                    if (!dataSource) {
                        return next(new HttpException(500, 'Error removing dataSource'));
                    }

                    // Si es DuckDB u Odoo, eliminar la carpeta con los CSV del disco
                    if (['duckdb', 'odoo', 'googleanalytics', 'holded' ].includes(dataSource.ds?.connection?.type)) {
                        const database: string = dataSource.ds.connection.database;
                        const duckdbBase = path.join(process.cwd(), 'duckdb');
                        // Resolve folder: supports both legacy absolute paths and new relative names
                        const folderName = (path.isAbsolute(database) || database?.includes('\\') || database?.includes('/'))
                            ? path.basename(database)
                            : database;
                        const targetPath = path.join(duckdbBase, folderName);
                        if (folderName && fs.existsSync(targetPath)) {
                            fs.rmSync(targetPath, { recursive: true, force: true });
                        }
                    }

                    return res.status(200).json({ ok: true, dataSource });

                } catch (err) {
                    return next(new HttpException(500, 'Error removing dataSource or dashboards'));
                }
        } catch (err) {
            next(err);
        }
    }

    static async CheckConnection(req: Request, res: Response, next: NextFunction) {

        if (!['postgres', 'mysql', 'vertica', 'sqlserver', 'oracle', 'bigquery', 'snowflake', 'jsonwebservice', 'mongodb', 'clickhouse'].includes(req.qs.type)) {

            next(new HttpException(404, '"Only" postgres, MySQL, oracle, SqlServer, Google BigQuery, Snowflake, Vertica and ClickHouse are accepted'));

        } else {
            try {
                req.qs.ssl === "false" ? req.qs.ssl = false : req.qs.ssl = true;

                const cn = req.qs.type !== 'bigquery' ? new ConnectionModel(req.qs.user, req.qs.host, req.qs.database,
                    req.qs.password, req.qs.port, req.qs.type,
                    req.body.poolLimit, req.qs.schema, req.qs.sid, req.qs.warehouse, req.qs.ssl)
                    : new BigQueryConfig(req.qs.type, req.qs.database, req.qs.project_id);
                const manager = await ManagerConnectionService.testConnection(cn);
                await manager.tryConnection();
                return res.status(200).json({ ok: true });
            } catch (err) {
                console.log(err)
                next(new HttpException(500, `Can't connect to database, ${err}`));
            }

        }
    }

    static async CheckStoredConnection(req: Request, res: Response, next: NextFunction) {

        if (!['postgres', 'mysql', 'vertica', 'sqlserver', 'oracle', 'bigquery', 'snowflake', 'jsonwebservice', 'mongodb', 'clickhouse'].includes(req.qs.type)) {
            next(new HttpException(404, 'Only postgres, MySQL, oracle, SqlServer, Vertica and ClickHouse are accepted'));
        } else {
            try {
                const actualDS = await DataSourceController.getMongoDataSource(req.params.id);
                const passwd = req.qs.password === '__-(··)-__' ? EnCrypterService.decode(actualDS.ds.connection.password) : req.qs.password;
                const cn = new ConnectionModel(req.qs.user, req.qs.host, req.qs.database, passwd,
                    req.qs.port, req.qs.type, req.qs.schema, req.body.poolLimit, req.qs.sidm, req.qs.warehouse, req.qs.ssl);
                const manager = await ManagerConnectionService.testConnection(cn);
                await manager.tryConnection();
                return res.status(200).json({ ok: true });
            } catch (err) {
                console.log(err)
                next(new HttpException(500, `Can't connect to database`));
            }

        }
    }

    static async GenerateDataModel(req: Request, res: Response, next: NextFunction) {
        if (req.body.type === 'bigquery') {

            return DataSourceController.GenerateDataModelBigQuery(req, res, next);
        } else {
            return DataSourceController.GenerateDataModelSql(req, res, next);
        }
    }

    static async GenerateDataModelBigQuery(req: Request, res: Response, next: NextFunction) {
        try {
            const cn = new BigQueryConfig(req.body.type, req.body.database, req.body.project_id);
            const manager = await ManagerConnectionService.testConnection(cn);
            const tables = await manager.generateDataModel(req.body.optimize, req.body.filter);


            const CC = req.body.allowCache === 1 ? cache_config.DEFAULT_CACHE_CONFIG : cache_config.DEFAULT_NO_CACHE_CONFIG

            const datasource: IDataSource = new DataSource({
                ds: {
                    connection: {
                        type: req.body.type,
                        host: null,
                        port: null,
                        database: req.body.database,
                        schema: req.body.database || manager.GetDefaultSchema(),
                        project_id: req.body.project_id,
                        searchPath: req.body.project_id || manager.GetDefaultSchema(),
                        user: null,
                        password: null,
                        sid: null,
                        warehouse: null
                    },
                    metadata: {
                        model_name: req.body.name,
                        model_description: req.body.description || '',
                        model_id: '',
                        model_granted_roles: [],
                        optimized: req.params.optimize === '1',
                        cache_config: CC,
                        ia_visibility: 'FULL'
                    },
                    model: {
                        tables: tables
                    }
                }
            });

            try {
                const data_source = await datasource.save();
                return res.status(201).json({ ok: true, data_source_id: data_source._id });
            } catch (error) {
                return (new HttpException(500, `Error saving the datasource`));
            }

        } catch (err) {
            next(err);
        }
    }

    static async GenerateDataModelSql(req: Request, res: Response, next: NextFunction) {
        try {
            const cn = new ConnectionModel(req.body.user, req.body.host, req.body.database,
                req.body.password, req.body.port, req.body.type, req.body.schema, req.body.poolLimit, req.body.sid, req.body.warehouse, req.body.ssl, req.body.external);
            const manager = await ManagerConnectionService.testConnection(cn);
            const tables = await manager.generateDataModel(req.body.optimize, req.body.filter, req.body.name);
            const CC = req.body.allowCache === 1 ? cache_config.DEFAULT_CACHE_CONFIG : cache_config.DEFAULT_NO_CACHE_CONFIG;
            const datasource: IDataSource = new DataSource({
                ds: {
                    connection: {
                        type: req.body.type,
                        host: req.body.host,
                        port: req.body.port,
                        database: req.body.database,
                        schema: req.body.schema || manager.GetDefaultSchema(),
                        searchPath: req.body.schema || manager.GetDefaultSchema(),
                        user: req.body.user,
                        password: EnCrypterService.encrypt(req.body.password || 'no'),
                        poolLimit: req.body.poolLimit,
                        sid: req.body.sid,
                        warehouse: req.body.warehouse,
                        ssl: req.body.ssl
                    },
                    metadata: {
                        model_name: req.body.name,
                        model_description: req.body.description || '',
                        model_id: '',
                        model_granted_roles: [],
                        optimized: req.params.optimize === '1',
                        cache_config: CC,
                        filter: req.body.filter,
                        model_owner: req.user._id,
                        properties: null,
                        external: req.body.external,
                        ia_visibility: 'FULL'
                    },
                    model: {
                        tables: tables
                    }
                }

            });

            try {
                const data_source = await datasource.save();
                return res.status(201).json({ ok: true, data_source_id: data_source._id });
            } catch (error) {
                console.log(error);
                return (new HttpException(500, `Error saving the datasource`));
            }

        } catch (err) {

            next(err);
        }
    }

    static async getMongoDataSource(id: string) {
        try {
            const dataSource = await DataSource.findById(id);
                return dataSource;
        } catch (err) {
            throw err;
        }
    }


    /**
     * Refresh the data model from the source database. The mysql, postgres, oracle, json websercive, etc source... 
     * @param req 
     * @param res 
     * @param next 
     */
    static async RefreshDataModel(req: Request, res: Response, next: NextFunction) {
        try {

            const actualDS = await DataSourceController.getMongoDataSource(req.params.id);
            const passwd = req.body.password === '__-(··)-__' ? EnCrypterService.decode(actualDS.ds.connection.password) : req.body.password


            const cn = new ConnectionModel(req.body.user, req.body.host, req.body.database, passwd,
                req.body.port, req.body.type, req.body.schema, req.body.poolLimit, req.body.sid, req.body.warehouse, req.body.ssl);
            const manager = await ManagerConnectionService.testConnection(cn);
            const storedDataModel = JSON.parse(JSON.stringify(actualDS));
            let tables = [];

            if (storedDataModel.ds.connection.type == 'jsonwebservice') {
                // json webservice get the table name form the model name.... 
                tables = await manager.generateDataModel(storedDataModel.ds.metadata.optimized, storedDataModel.ds.metadata.filter, storedDataModel.ds.metadata.model_name);
            } else {
                tables = await manager.generateDataModel(storedDataModel.ds.metadata.optimized, storedDataModel.ds.metadata.filter);
            }

            const datasource: IDataSource = new DataSource({
                ds: {
                    connection: {
                        type: req.body.type,
                        host: req.body.host,
                        port: req.body.port,
                        database: req.body.database,
                        schema: req.body.schema || manager.GetDefaultSchema(),
                        searchPath: req.body.schema || manager.GetDefaultSchema(),
                        user: req.body.user,
                        password: passwd,
                        sid: req.body.sid,
                        warehouse: req.body.warehouse
                    },
                    metadata: {
                        model_name: req.body.name,
                        model_id: '',
                        model_granted_roles: [],
                        optimized: storedDataModel.ds.metadata.optimized
                    },
                    model: {
                        tables: tables
                    }
                }
            });

            // For the stored datasource... i join the relations && no_relations array to compare it
            storedDataModel.ds.model.tables.forEach(t => {
                if (t.no_relations) {
                    t.relations = t.relations.concat(t.no_relations);
                }
            });

            const out = DataSourceController.FindAndUpdateDataModel(datasource.ds.model.tables, storedDataModel.ds.model.tables);
            datasource.ds.model.tables = DataSourceController.FindAndDeleteDataModel(datasource.ds.model.tables, out);

            try {
                const dataSource: IDataSource = await DataSource.findById(req.params.id)
                
                dataSource.ds.model.tables = datasource.ds.model.tables;
    
                const iDataSource = new DataSource(dataSource);
    
                try {
                    const saved = await iDataSource.save();
                    if (!saved) {
                        return next(new HttpException(500, `Error in the save datasource`));
                    }
                    return res.status(200).json({ ok: true, message: out });
                } catch (error) {
                    return next(new HttpException(500, `Error updating the datasource`));
                }
            } catch (error) {
                
                return (new HttpException(500, `Error updating the datasource`));
            }
        } catch (err) {
            next(err);
        }
    }

    static async CopyDataSource(req: Request, res: Response, next: NextFunction) {
        try {
            const original = await DataSource.findById(req.params.id);
            if (!original) {
                return next(new HttpException(404, 'DataSource not found'));
            }
            const newName = req.body.name;
            const copy = new DataSource({
                ds: {
                    connection: original.ds.connection,
                    metadata: {
                        ...original.ds.metadata,
                        model_name: newName,
                        model_owner: [req.user._id],
                        model_granted_roles: []
                    },
                    model: original.ds.model
                }
            });
            const saved = await copy.save();
            return res.status(201).json({ ok: true, data_source_id: saved._id });
        } catch (err) {
            next(err);
        }
    }

    static async removeCacheFromModel(req: Request, res: Response, next: NextFunction) {
        try {
            const queries = await CachedQuery.deleteMany({ 'cachedQuery.model_id': req.body.id }).exec();
            return res.status(200).json({ ok: true });
        } catch (err) {
            next(err);
        }

    }

    static FindAndUpdateDataModel(referenceModel, updatedDataModel) {
        referenceModel.forEach(rTable => {
            const uTable = updatedDataModel.filter(t => t.table_name === rTable.table_name)[0];
            if (uTable) {
                let column = [];
                rTable.columns.forEach(r_column => {
                    column = uTable.columns.filter(c => {
                        return c.column_name === r_column.column_name;
                    });
                    if (!column.length) {

                        uTable.columns.push(r_column);
                    }
                });
                uTable.tableCount = rTable.tableCount;

            } else {
                updatedDataModel.push(rTable);
            }
        });
        return updatedDataModel;
    }

    static FindAndDeleteDataModel(referenceModel, updatedDataModel) {
        let out = updatedDataModel;
        let toDelete = [];
        out.forEach(uTable => {
            let rTable = referenceModel.filter(t => t.table_name === uTable.table_name)[0];
            if (rTable) {
                let column = [];
                uTable.columns.forEach(uColumn => {
                    column = rTable.columns.filter(c => c.column_name === uColumn.column_name);

                    if (!column.length && !uColumn.computed_column) {
                        uTable.columns = uTable.columns.filter(c => c.column_name !== uColumn.column_name);
                    } else if (column.length) {
                        uColumn.tableCount = column[0].tableCount;
                    }
                });
            } else if (uTable.table_type !== 'view') {
                toDelete.push(uTable.table_name);
            }
        });
        return out.filter(t => !toDelete.includes(t.table_name));

    }

    static returnTagsFromDataSource(req: Request, dataSources: IDataSource[]) {
        let queryTagArray: Array<any> = req.qs.tags;

        if (_.isEmpty(queryTagArray)) return dataSources;
        if (!_.isEmpty(queryTagArray)) {
            queryTagArray = req.qs.tags.split(',');
            return dataSources.filter(dataSource =>
                dataSource.ds.metadata.tags && dataSource.ds.metadata.tags.some(tag => queryTagArray.includes(tag))
            );
        }
    }

    static async AddDuckDBDataSource(req: Request, res: Response, next: NextFunction) {
        try {
            const { name, description, optimize, allowCache, folderName, csvFiles } = req.body;
            // csvFiles: Array<{ fileName: string, csvContent: string, columnsConfig: any[] }>

            if (!name || !folderName || !csvFiles || !Array.isArray(csvFiles) || csvFiles.length === 0) {
                return next(new HttpException(400, 'Name, folderName and at least one CSV file are required'));
            }

            const normalizeName = (str: string) =>
                str.split('_').join(' ').toLowerCase()
                    .split(' ').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');

            const safeFolderName = folderName.replace(/[^a-zA-Z0-9_\-]/g, '_').toLowerCase();
            if (!safeFolderName) {
                return next(new HttpException(400, `Invalid folderName "${folderName}": must contain at least one alphanumeric character`));
            }

            const duckdbBaseFolder = path.join(process.cwd(), 'duckdb');
            const targetFolder = path.join(duckdbBaseFolder, safeFolderName);
            if (!fs.existsSync(targetFolder)) {
                fs.mkdirSync(targetFolder, { recursive: true });
            }

            const tables = csvFiles.map((csvFile: any) => {
                const safeName = (csvFile.fileName || 'file')
                    .replace(/\.csv$/i, '')
                    .replace(/[^a-zA-Z0-9_\-]/g, '_')
                    .toLowerCase();

                fs.writeFileSync(path.join(targetFolder, `${safeName}.csv`), csvFile.csvContent, 'utf8');

                const columns = (csvFile.columnsConfig || []).map((col: any) => {
                    let colType: string;
                    switch (col.type) {
                        case 'integer':
                        case 'numeric':
                            colType = 'numeric'; break;
                        case 'timestamp':
                            colType = 'date'; break;
                        default:
                            colType = 'text';
                    }
                    return {
                        column_name: col.field,
                        column_type: colType,
                        display_name: { default: normalizeName(col.field.replace(/_/g, ' ')), localized: [] },
                        description: { default: normalizeName(col.field.replace(/_/g, ' ')), localized: [] },
                        aggregation_type: colType === 'numeric'
                            ? AggregationTypes.getValuesForNumbers()
                            : colType === 'date'
                            ? AggregationTypes.getValuesForOthers()
                            : AggregationTypes.getValuesForText(),
                        minimumFractionDigits: col.type === 'integer' ? 0 : col.type === 'numeric' ? 2 : null,
                        computed_column: 'no',
                        visible: true,
                        ia_visibility: 'FULL',
                        column_granted_roles: [],
                        row_granted_roles: [],
                        tableCount: 0
                    };
                });

                const tableDisplayName = normalizeName(safeName.replace(/_/g, ' '));
                return {
                    table_name: safeName,
                    display_name: { default: tableDisplayName, localized: [] },
                    description: { default: tableDisplayName, localized: [] },
                    table_type: [],
                    table_granted_roles: [],
                    columns,
                    relations: [],
                    visible: true,
                    tableCount: 0
                };
            });

            const CC = allowCache ? cache_config.DEFAULT_CACHE_CONFIG : cache_config.DEFAULT_NO_CACHE_CONFIG;

            const datasource: IDataSource = new DataSource({
                ds: {
                    connection: {
                        type: 'duckdb',
                        host: null,
                        port: null,
                        database: safeFolderName,  // store only folder name, not absolute path
                        schema: 'main',
                        user: null,
                        password: null
                    },
                    metadata: {
                        model_name: name,
                        model_description: description || '',
                        model_id: '',
                        model_granted_roles: [],
                        optimized: !!optimize,
                        cache_config: CC,
                        model_owner: req.user._id,
                        ia_visibility: 'FULL'
                    },
                    model: { tables }
                }
            });

            const saved = await datasource.save();
            return res.status(201).json({ ok: true, data_source_id: saved._id });
        } catch (err) {
            next(err);
        }
    }

    static async AddDuckDbTable(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { fileName, csvContent, columnsConfig } = req.body;

            if (!fileName || !csvContent || !columnsConfig) {
                return next(new HttpException(400, 'fileName, csvContent and columnsConfig are required'));
            }

            const dataSource = await DataSource.findById(id);
            if (!dataSource) {
                return next(new HttpException(404, 'DataSource not found'));
            }

            const folderName = dataSource.ds?.connection?.database;
            if (!folderName) {
                return next(new HttpException(400, 'Invalid DuckDB datasource'));
            }

            const normalizeName = (str: string) =>
                str.split('_').join(' ').toLowerCase()
                    .split(' ').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');

            const safeName = (fileName || 'file')
                .replace(/\.csv$/i, '')
                .replace(/[^a-zA-Z0-9_\-]/g, '_')
                .toLowerCase();

            const targetFolder = path.join(process.cwd(), 'duckdb', folderName);
            if (!fs.existsSync(targetFolder)) {
                fs.mkdirSync(targetFolder, { recursive: true });
            }
            fs.writeFileSync(path.join(targetFolder, `${safeName}.csv`), csvContent, 'utf8');

            const columns = (columnsConfig || []).map((col: any) => {
                let colType: string;
                switch (col.type) {
                    case 'integer':
                    case 'numeric':
                        colType = 'numeric'; break;
                    case 'timestamp':
                        colType = 'date'; break;
                    default:
                        colType = 'text';
                }
                return {
                    column_name: col.field,
                    column_type: colType,
                    display_name: { default: normalizeName(col.field.replace(/_/g, ' ')), localized: [] },
                    description: { default: normalizeName(col.field.replace(/_/g, ' ')), localized: [] },
                    aggregation_type: colType === 'numeric'
                        ? AggregationTypes.getValuesForNumbers()
                        : colType === 'date'
                        ? AggregationTypes.getValuesForOthers()
                        : AggregationTypes.getValuesForText(),
                    minimumFractionDigits: col.type === 'integer' ? 0 : col.type === 'numeric' ? 2 : null,
                    computed_column: 'no',
                    visible: true,
                    ia_visibility: 'FULL',
                    column_granted_roles: [],
                    row_granted_roles: [],
                    tableCount: 0
                };
            });

            const tableDisplayName = normalizeName(safeName.replace(/_/g, ' '));
            const newTable = {
                table_name: safeName,
                display_name: { default: tableDisplayName, localized: [] },
                description: { default: tableDisplayName, localized: [] },
                table_type: [],
                table_granted_roles: [],
                columns,
                relations: [],
                visible: true,
                tableCount: 0
            };

            const tables = [...(dataSource.ds.model.tables || []), newTable];
            await DataSource.findByIdAndUpdate(id, { 'ds.model.tables': tables });

            return res.status(201).json({ ok: true, table: newTable });
        } catch (err) {
            next(err);
        }
    }

    static async DeleteDuckDbCsv(req: Request, res: Response, next: NextFunction) {
        try {
            const { id, tableName } = req.params;
            const dataSource = await DataSource.findById(id);
            if (!dataSource) {
                return next(new HttpException(404, 'DataSource not found'));
            }
            const folderName = dataSource.ds?.connection?.database;
            if (!folderName) {
                return next(new HttpException(400, 'Invalid DuckDB datasource'));
            }
            const csvPath = path.join(process.cwd(), 'duckdb', folderName, `${tableName}.csv`);
            if (fs.existsSync(csvPath)) {
                fs.unlinkSync(csvPath);
            }
            return res.status(200).json({ ok: true });
        } catch (err) {
            next(err);
        }
    }

    static async AddOdooDataSource(req: Request, res: Response, next: NextFunction) {
        try {
            const { name, description, url, db, username, password, optimize, allowCache } = req.body;

            if (!name || !url || !db || !username || !password) {
                return next(new HttpException(400, 'Se requieren: name, url, db, username, password'));
            }

            const folderPath = path.join(process.cwd(), 'duckdb', db);

            await OdooApiService.downloadToFolder(
                { url, db, username, password },
                folderPath
            );

            // Generate DuckDB model from the downloaded CSV files
            const duckConfig: any = { type: 'duckdb', database: db, schema: 'main' };
            const conn = new DuckDBConnection(duckConfig);
            const tables = await conn.generateDataModel(optimize ? 1 : 0, '');

            DataSourceController.addOdooRelations(tables);
            const odooLocale = resolveOdooLocale(req.body?.locale || req.headers?.['accept-language']);
            applyOdooLabels(tables, odooLocale);

            const CC = allowCache ? cache_config.DEFAULT_CACHE_CONFIG : cache_config.DEFAULT_NO_CACHE_CONFIG;

            const datasource: IDataSource = new DataSource({
                ds: {
                    connection: {
                        type: 'odoo',
                        host: url,
                        port: null,
                        database: db,
                        schema: 'main',
                        user: username,
                        password: EnCrypterService.encrypt(password)
                    },
                    metadata: {
                        model_name: name,
                        model_description: description || '',
                        model_id: '',
                        model_granted_roles: [],
                        optimized: !!optimize,
                        cache_config: CC,
                        model_owner: req.user._id,
                        ia_visibility: 'FULL'
                    },
                    model: { tables }
                }
            });

            const saved = await datasource.save();
            return res.status(201).json({ ok: true, data_source_id: saved._id });

        } catch (err: any) {
            console.error('[Odoo] AddOdooDataSource error:', err.message);
            return next(new HttpException(500, `Error creando datasource Odoo: ${err.message}`));
        }
    }

    private static addOdooRelations(tables: any[]): void {
        const byName = new Map<string, any>(tables.map(t => [t.table_name, t]));

        const link = (
            srcTable: string, srcCol: string,
            tgtTable: string, tgtCol: string
        ) => {
            const src = byName.get(srcTable);
            const tgt = byName.get(tgtTable);
            if (!src || !tgt) return;

            src.relations.push({
                source_table: srcTable,
                source_column: [srcCol],
                target_table: tgtTable,
                target_column: [tgtCol],
                visible: true
            });
            tgt.relations.push({
                source_table: tgtTable,
                source_column: [tgtCol],
                target_table: srcTable,
                target_column: [srcCol],
                visible: true
            });
        };

        link('invoice_lines', 'invoice_id',     'invoices', 'id');
        link('invoices',      'partner_id',     'partners', 'id');
        link('invoices',      'salesperson_id', 'users',    'id');
        link('invoice_lines', 'product_id',     'products', 'id');
    }

    static async AddHoldedDataSource(req: Request, res: Response, next: NextFunction) {
        try {
            const { name, description, folderName, apiKey, optimize, allowCache } = req.body;

            if (!name || !folderName || !apiKey) {
                return next(new HttpException(400, 'Se requieren: name, folderName, apiKey'));
            }

            const folderPath = path.join(process.cwd(), 'duckdb', folderName);

            await HoldedApiService.downloadToFolder({ apiKey }, folderPath);

            const duckConfig: any = { type: 'duckdb', database: folderName, schema: 'main' };
            const conn = new DuckDBConnection(duckConfig);
            const tables = await conn.generateDataModel(optimize ? 1 : 0, '');

            DataSourceController.addHoldedRelations(tables);
            const holdedLocale = resolveHoldedLocale(req.body?.locale || req.headers?.['accept-language']);
            applyHoldedLabels(tables, holdedLocale);

            const CC = allowCache ? cache_config.DEFAULT_CACHE_CONFIG : cache_config.DEFAULT_NO_CACHE_CONFIG;

            const datasource: IDataSource = new DataSource({
                ds: {
                    connection: {
                        type: 'holded',
                        host: '',
                        port: null,
                        database: folderName,
                        schema: 'main',
                        user: '',
                        password: EnCrypterService.encrypt(apiKey)
                    },
                    metadata: {
                        model_name: name,
                        model_description: description || '',
                        model_id: '',
                        model_granted_roles: [],
                        optimized: !!optimize,
                        cache_config: CC,
                        model_owner: req.user._id,
                        ia_visibility: 'FULL'
                    },
                    model: { tables }
                }
            });

            const saved = await datasource.save();
            return res.status(201).json({ ok: true, data_source_id: saved._id });

        } catch (err: any) {
            console.error('[Holded] AddHoldedDataSource error:', err.message);
            return next(new HttpException(500, `Error creando datasource Holded: ${err.message}`));
        }
    }

    private static addHoldedRelations(tables: any[]): void {
        const byName = new Map<string, any>(tables.map(t => [t.table_name, t]));

        const link = (
            srcTable: string, srcCol: string,
            tgtTable: string, tgtCol: string
        ) => {
            const src = byName.get(srcTable);
            const tgt = byName.get(tgtTable);
            if (!src || !tgt) return;

            src.relations.push({
                source_table: srcTable,
                source_column: [srcCol],
                target_table: tgtTable,
                target_column: [tgtCol],
                visible: true
            });
            tgt.relations.push({
                source_table: tgtTable,
                source_column: [tgtCol],
                target_table: srcTable,
                target_column: [srcCol],
                visible: true
            });
        };

        link('invoice_lines', 'invoice_id', 'invoices', 'id');
        link('invoices',      'contact_id', 'contacts', 'id');
        link('invoice_lines', 'product_id', 'products', 'id');
        link('ledger',        'document_id', 'invoices', 'id');
    }

    static async GetDuckDbFolders(req: Request, res: Response, next: NextFunction) {
        try {
            const duckdbBaseFolder = path.join(process.cwd(), 'duckdb');
            if (!fs.existsSync(duckdbBaseFolder)) {
                return res.status(200).json({ ok: true, folders: [] });
            }
            const entries = fs.readdirSync(duckdbBaseFolder, { withFileTypes: true });
            const folders = entries
                .filter(e => e.isDirectory())
                .map(e => e.name);
            return res.status(200).json({ ok: true, folders });
        } catch (err) {
            next(err);
        }
    }

    static async AddGoogleAnalyticsDataSource(req: Request, res: Response, next: NextFunction) {
        try {
            const { name, description, propertyId, credentialsJson, folderName, optimize, allowCache } = req.body;

            if (!name || !propertyId || !credentialsJson || !folderName) {
                return next(new HttpException(400, 'Se requieren: name, propertyId, credentialsJson, folderName'));
            }

            const safeFolderName = folderName.replace(/[^a-zA-Z0-9_\-]/g, '_').toLowerCase();
            const folderPath = path.join(process.cwd(), 'duckdb', safeFolderName);

            await GA4ApiService.downloadToFolder(
                { propertyId, credentialsJson },
                folderPath
            );

            const duckConfig: any = { type: 'duckdb', database: safeFolderName, schema: 'main' };
            const conn = new DuckDBConnection(duckConfig);
            const tables = await conn.generateDataModel(optimize ? 1 : 0, '');

            DataSourceController.addGA4Relations(tables);
            const ga4Locale = extractGA4LocaleFromRequest(req);
            applyGA4Labels(tables, ga4Locale);

            const CC = allowCache ? cache_config.DEFAULT_CACHE_CONFIG : cache_config.DEFAULT_NO_CACHE_CONFIG;

            const datasource: IDataSource = new DataSource({
                ds: {
                    connection: {
                        type: 'googleanalytics',
                        host: propertyId,
                        port: null,
                        database: safeFolderName,
                        schema: 'main',
                        user: null,
                        password: EnCrypterService.encrypt(credentialsJson)
                    },
                    metadata: {
                        model_name: name,
                        model_description: description || '',
                        model_id: '',
                        model_granted_roles: [],
                        optimized: !!optimize,
                        cache_config: CC,
                        model_owner: req.user._id,
                        ia_visibility: 'FULL'
                    },
                    model: { tables }
                }
            });

            const saved = await datasource.save();
            return res.status(201).json({ ok: true, data_source_id: saved._id });

        } catch (err: any) {
            console.error('[GA4] AddGoogleAnalyticsDataSource error:', err.message);
            return next(new HttpException(500, `Error creando datasource Google Analytics: ${err.message}`));
        }
    }

    private static addGA4Relations(tables: any[]): void {
        const byName = new Map<string, any>(tables.map(t => [t.table_name, t]));

        const link = (
            srcTable: string, srcCol: string,
            tgtTable: string, tgtCol: string
        ) => {
            const src = byName.get(srcTable);
            const tgt = byName.get(tgtTable);
            if (!src || !tgt) return;

            src.relations.push({
                source_table: srcTable,
                source_column: [srcCol],
                target_table: tgtTable,
                target_column: [tgtCol],
                visible: true
            });
            tgt.relations.push({
                source_table: tgtTable,
                source_column: [tgtCol],
                target_table: srcTable,
                target_column: [srcCol],
                visible: true
            });
        };

        link('sesiones',     'fecha', 'paginas',      'fecha');
        link('sesiones',     'fecha', 'eventos',      'fecha');
        link('sesiones',     'fecha', 'dispositivos', 'fecha');
        link('sesiones',     'fecha', 'geografico',   'fecha');
    }

    static returnExternalFilter(req: Request) {
        // Esto es pare recuperar los filtros externos.
        let external;
        if (req.qs.external) {
            external = JSON.parse(req.qs.external);
        }
        // Creamos un objeto de filtro dinámico
        let filter = {};
        // Recorremos las claves del objeto externalObject y las añadimos al filtro
        for (let key in external) {
            filter[`ds.metadata.external.${key}`] = external[key];
        }
        filter = Object.entries(filter).reduce((acc, [clave, valor]) => {
            acc[clave] = valor;
            return acc;
        }, {});
        return filter;
    }

    static async GetDuckDbCsv(req: any, res: any) {
    try {
        const { id, tableName } = req.params;
        const dataSource = await DataSource.findById(id);
        if (!dataSource) return res.status(404).json({ status: 404, message: 'Datasource not found' });
        
        const connection = dataSource.ds?.connection;
        if (connection?.type !== 'duckdb') {
            return res.status(400).json({ status: 400, message: 'Not a DuckDB datasource' });
        }

        const database = connection.database;
        const duckdbBase = path.join(process.cwd(), 'duckdb');
        const folderName = path.isAbsolute(database) || database.includes('\\') || database.includes('/')
            ? path.basename(database)
            : database;
        
        const csvPath = path.join(duckdbBase, folderName, `${tableName}.csv`);
        
        if (!fs.existsSync(csvPath)) {
            return res.status(404).json({ status: 404, message: `Table ${tableName} not found` });
        }

        const csvContent = fs.readFileSync(csvPath, 'utf8');
        res.status(200).json({ csvContent });
    } catch (err) {
        res.status(500).json({ status: 500, message: err.message });
    }
}

}



