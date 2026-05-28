import { NextFunction, Request, Response } from "express";
import { HttpException } from '../global/model/index';
import { EnCrypterService } from "../../services/encrypter/encrypter.service";
import { MongoDBConnection } from "../../services/connection/db-systems/mongodb-connection";
import DataSource, { IDataSource } from "../datasource/model/datasource.model";
import ExcelSheetModel from "./model/excel-sheet.model";
import { AggregationTypes } from "../global/model/aggregation-types";
import { DateUtil } from "../../utils/date.util";

const databaseUrl = require('../../../config/database.config');


export class ExcelSheetController {
    static async GenerateCollectionFromJSON(req: Request, res: Response, next: NextFunction) {
        return await ExcelSheetController.FromJSONToCollection(req, res, next);
    }

    static async FromJSONToCollection(req: Request, res: Response, next: NextFunction) {
        //Guarda una nueva colección con el nombre pasado desde el frontal, si esta ya existe sustituye los campos del excel por los nuevos.
        try {
            const excelName = req.body?.name, optimize = req.body?.optimize, cacheAllowed = req.body?.allowCache;
            let excelFields = req.body?.fields;
            const columnsConfig = req.body?.columnsConfig; // Configuración de columnas del usuario
            const sourceType = req.body?.source_type || 'excel';
            const description = req.body?.description || '';
            const tables: Array<{ tableName: string, fields: any[] }> = req.body?.tables;

            if (!excelName || (!excelFields && !tables)) {
                return res.status(400).json({ ok: false, message: 'Nombre o campos incorrectos en la solicitud' });
            }

            // Multi-table format: { name, tables: [{ tableName, fields }] }
            if (tables && Array.isArray(tables) && tables.length > 0) {
                const parsedUrl = new URL(databaseUrl?.url);
                const { host, port } = parsedUrl;
                const config = {
                    type: "mongodb",
                    host: host.substring(0, host.indexOf(':')),
                    port: Number(port),
                    database: parsedUrl.pathname.substring(1),
                    user: parsedUrl.username,
                    password: parsedUrl.password,
                    authSource: parsedUrl.search.split('=')[1]
                };

                const mongoConnection = new MongoDBConnection(config);
                const client = await mongoConnection.getclient();
                try {
                    const db = client.db(config.database);
                    for (const table of tables) {
                        const collection = db.collection(`xls_${excelName}_${table.tableName}`);
                        const formatedFields = JSON.parse(JSON.stringify(table.fields));
                        for (const obj of formatedFields) {
                            for (let key in obj) {
                                const field: any = obj[key];
                                if (isNaN(Number(field))) {
                                    const isDateValue = DateUtil.convertDate(field);
                                    if (isDateValue) obj[key] = isDateValue;
                                } else {
                                    obj[key] = Number(field);
                                }
                            }
                        }
                        await collection.deleteMany({});
                        if (formatedFields.length > 0) await collection.insertMany(formatedFields);
                    }
                } catch (err) {
                    console.error('MultiTable JSON to Collection Error: ', err);
                    throw err;
                } finally {
                    await client.close();
                }

                return await this.MultiTableCollectionToDataSource(excelName, tables, optimize, cacheAllowed, sourceType, description, res, next);
            }

            // Special case: when 'type' field has multiple distinct values, split into separate tables
            const typeValues = Array.isArray(excelFields) && excelFields.length > 0 && 'type' in excelFields[0]
                ? [...new Set(excelFields.map((f: any) => String(f.type)))]
                : [];
            if (typeValues.length > 1) {
                return await ExcelSheetController.FromJSONToCollectionByType(excelName, excelFields, typeValues, optimize, cacheAllowed, sourceType, description, res, next);
            }

            // Single-table format (backward compat)
            const excelModel = ExcelSheetModel(excelName)
            const excelDocs = await excelModel.findOne({});

            if (excelDocs) {
                excelDocs.key = excelFields
                excelDocs.save()
            } else {

                const parsedUrl = new URL(databaseUrl?.url);
                //Transformar a datasource con todo inicializado a vacio
                const { host, port, password } = parsedUrl;

                const config = {
                    type: "mongodb",
                    host: host.substring(0, host.indexOf(':')),
                    port: Number(port),
                    database: parsedUrl.pathname.substring(1),
                    user: parsedUrl.username,
                    password: parsedUrl.password,
                    authSource: parsedUrl.search.split('=')[1]
                };


                const mongoConnection = new MongoDBConnection(config);
                const client = await mongoConnection.getclient();

                try {
                    const database = client.db(config.database);
                    const collection = database.collection('xls_' + excelName);

                    const formatedFields = JSON.parse(JSON.stringify(excelFields));

                    for (const obj of formatedFields) {
                        for (let key in obj) {
                            let field: any = obj[key];

                            if (isNaN(Number(field))) {
                                const isDateValue = DateUtil.convertDate(field);

                                if (isDateValue) {
                                    obj[key] = isDateValue; //{ "$date": field }
                                }
                            } else {
                                obj[key] = Number(field);
                            }
                        }
                    }

                    // Insertar los datos
                    const result = await collection.insertMany(formatedFields);
                } catch (err) {
                    console.error('JSON to COllection Error: ', err);
                    throw err;
                } finally {
                    await client.close();
                }
            }

            await this.ExcelCollectionToDataSource(excelName, excelFields, optimize, cacheAllowed, columnsConfig, sourceType, description, res, next);
        } catch (error) {
            console.error('Error al crear o actualizar el ExcelSheet:', error);
            next(new HttpException(500, 'Error al crear o actualizar el ExcelSheet'));
        }
    }

    static async MultiTableCollectionToDataSource(excelName: string, tables: Array<{ tableName: string, fields: any[] }>, optimized: boolean, cacheAllowed: boolean, sourceType: string, description: string, res: Response, next: NextFunction) {
        try {
            const dsTableObjects = tables.map(table => {
                const propertiesAndTypes: Record<string, string> = {};
                table.fields.forEach(object => {
                    Object.entries(object).forEach(([property, value]) => {
                        if (!isNaN(Number(value))) {
                            propertiesAndTypes[property] = 'numeric';
                        } else {
                            const isDateValue = DateUtil.convertDate(value);
                            if (isDateValue) propertiesAndTypes[property] = 'date';
                            else if (typeof value === 'string') propertiesAndTypes[property] = 'text';
                        }
                    });
                });

                const columnsEntry = Object.entries(propertiesAndTypes).map(([name, type]) => {
                    const col: any = {
                        column_name: name,
                        column_type: type,
                        display_name: { default: name, localized: [] },
                        description: { default: name, localized: [] },
                        minimumFractionDigits: 0,
                        column_granted_roles: [],
                        row_granted_roles: [],
                        visible: true,
                        ia_visibility: 'FULL',
                        tableCount: 0,
                        valueListSource: {},
                    };
                    if (type === 'numeric') col.aggregation_type = AggregationTypes.getValuesForNumbers();
                    else if (type === 'text') col.aggregation_type = AggregationTypes.getValuesForText();
                    else col.aggregation_type = AggregationTypes.getValuesForOthers();
                    return col;
                });

                return {
                    table_name: `${excelName}_${table.tableName}`,
                    display_name: { default: table.tableName, localized: [] },
                    description: { default: table.tableName, localized: [] },
                    table_granted_roles: [],
                    table_type: [],
                    columns: columnsEntry,
                    relations: [],
                    visible: true,
                    tableCount: 0,
                    no_relations: []
                };
            });

            // Auto-detect relations by column presence (generic, name-independent)
            const childTables = dsTableObjects.filter(t => t.columns.some(c => c.column_name === 'parent_id'));
            const parentTables = dsTableObjects.filter(t =>
                t.columns.some(c => c.column_name === 'id') &&
                !t.columns.some(c => c.column_name === 'parent_id')
            );
            for (const childTable of childTables) {
                for (const parentTable of parentTables) {
                    // child.parent_id → parent.id
                    childTable.relations.push({ source_table: childTable.table_name, source_column: ['parent_id'], target_table: parentTable.table_name, target_column: ['id'], visible: true });
                    // parent.id ← child.parent_id
                    parentTable.relations.push({ source_table: parentTable.table_name, source_column: ['id'], target_table: childTable.table_name, target_column: ['parent_id'], visible: true });
                    // cross-author relations if both tables have author column
                    const childHasAuthor = childTable.columns.some(c => c.column_name === 'author');
                    const parentHasAuthor = parentTable.columns.some(c => c.column_name === 'author');
                    if (childHasAuthor && parentHasAuthor) {
                        childTable.relations.push({ source_table: childTable.table_name, source_column: ['author'], target_table: parentTable.table_name, target_column: ['author'], visible: true });
                        parentTable.relations.push({ source_table: parentTable.table_name, source_column: ['author'], target_table: childTable.table_name, target_column: ['author'], visible: true });
                    }
                }
                // self-referential: child.parent_id → child.id (nested replies)
                childTable.relations.push({ source_table: childTable.table_name, source_column: ['parent_id'], target_table: childTable.table_name, target_column: ['id'], visible: true });
            }

            if (!databaseUrl?.url) return res.status(400).json({ ok: false, message: 'La connexión a la base de datos no existe' });
            const parsedUrl = new URL(databaseUrl?.url);
            const database = parsedUrl.pathname.substring(1);
            const { host, port } = parsedUrl;

            // Upsert: update existing datasource by name instead of creating a duplicate
            const existingDS = await DataSource.findOne({ 'ds.metadata.model_name': excelName });
            if (existingDS) {
                await DataSource.findByIdAndUpdate(existingDS._id, {
                    $set: {
                        'ds.model.tables': dsTableObjects,
                        'ds.metadata.optimized': optimized ?? false,
                        'ds.metadata.cache_config.enabled': cacheAllowed ?? false,
                    }
                });
                return res.status(200).json({ ok: true, data_source_id: existingDS._id });
            }

            const datasource: IDataSource = new DataSource({
                ds: {
                    connection: {
                        type: "mongodb",
                        source_type: sourceType,
                        host: host.substring(0, host.indexOf(':')),
                        port: Number(port),
                        database,
                        schema: "public",
                        searchPath: "public",
                        user: parsedUrl.username,
                        password: EnCrypterService.encrypt(parsedUrl.password),
                        poolLimit: null,
                        sid: null,
                        warehouse: null,
                        ssl: false
                    },
                    metadata: {
                        model_name: excelName,
                        model_description: description ?? '',
                        model_id: "",
                        model_granted_roles: [],
                        optimized: optimized ?? false,
                        ia_visibility: 'FULL',
                        cache_config: {
                            units: "",
                            quantity: 1,
                            hours: "",
                            minutes: "",
                            enabled: cacheAllowed ?? false,
                        },
                        filter: null,
                        model_owner: "",
                        tags: [],
                        external: {}
                    },
                    model: {
                        tables: dsTableObjects
                    }
                }
            });

            const saved = await datasource.save();
            return res.status(201).json({ ok: true, data_source_id: saved._id });
        } catch (error) {
            console.error('Error al crear datasource multi-tabla:', error);
            throw error;
        }
    }

    static async FromJSONToCollectionByType(
        excelName: string, excelFields: any[], typeValues: string[],
        optimize: boolean, cacheAllowed: boolean, sourceType: string, description: string,
        res: Response, next: NextFunction
    ) {
        const tableGroups: Array<{ tableName: string, fields: any[] }> = typeValues.map(type => ({
            tableName: type,
            fields: excelFields.filter((f: any) => String(f.type) === type)
        }));

        const parsedUrl = new URL(databaseUrl?.url);
        const config = {
            type: "mongodb",
            host: parsedUrl.host.substring(0, parsedUrl.host.indexOf(':')),
            port: Number(parsedUrl.port),
            database: parsedUrl.pathname.substring(1),
            user: parsedUrl.username,
            password: parsedUrl.password,
            authSource: parsedUrl.search.split('=')[1]
        };
        const mongoConnection = new MongoDBConnection(config);
        const client = await mongoConnection.getclient();
        try {
            const db = client.db(config.database);
            for (const table of tableGroups) {
                const collection = db.collection(`xls_${excelName}_${table.tableName}`);
                const formatedFields = JSON.parse(JSON.stringify(table.fields));
                for (const obj of formatedFields) {
                    for (const key in obj) {
                        const field: any = obj[key];
                        if (isNaN(Number(field))) {
                            const isDateValue = DateUtil.convertDate(field);
                            if (isDateValue) obj[key] = isDateValue;
                        } else {
                            obj[key] = Number(field);
                        }
                    }
                }
                await collection.deleteMany({});
                if (formatedFields.length > 0) await collection.insertMany(formatedFields);
            }
        } catch (err) {
            console.error('FromJSONToCollectionByType error:', err);
            throw err;
        } finally {
            await client.close();
        }
        return await ExcelSheetController.MultiTableCollectionToDataSource(excelName, tableGroups, optimize, cacheAllowed, sourceType, description, res, next);
    }

    static async UpdateCollectionFromJSON(req: Request, res: Response, next: NextFunction) {
        try {
            const datasourceId = req.params.id;
            const excelName = req.body?.name, optimize = req.body?.optimize, cacheAllowed = req.body?.allowCache;
            let excelFields = req.body?.fields;
            const columnsConfig = req.body?.columnsConfig;

            if (!datasourceId || !excelName || !excelFields) {
                return res.status(400).json({ ok: false, message: 'ID, nombre o campos incorrectos en la solicitud' });
            }

            // Actualizar datos en MongoDB
            const excelModel = ExcelSheetModel(excelName);
            const excelDocs = await excelModel.findOne({});
            if (excelDocs) {
                excelDocs.key = excelFields;
                await excelDocs.save();
            }

            // Siempre reemplazar los datos reales de la colección xls_<nombre>
            const parsedUrl = new URL(databaseUrl?.url);
            const { host, port } = parsedUrl;
            const config = {
                type: "mongodb",
                host: host.substring(0, host.indexOf(':')),
                port: Number(port),
                database: parsedUrl.pathname.substring(1),
                user: parsedUrl.username,
                password: parsedUrl.password,
                authSource: parsedUrl.search.split('=')[1]
            };
            const mongoConnection = new MongoDBConnection(config);
            const client = await mongoConnection.getclient();
            try {
                const database = client.db(config.database);
                const collection = database.collection('xls_' + excelName);
                const formatedFields = JSON.parse(JSON.stringify(excelFields));
                for (const obj of formatedFields) {
                    for (let key in obj) {
                        let field: any = obj[key];
                        if (isNaN(Number(field))) {
                            const isDateValue = DateUtil.convertDate(field);
                            if (isDateValue) { obj[key] = isDateValue; }
                        } else {
                            obj[key] = Number(field);
                        }
                    }
                }
                await collection.deleteMany({});
                await collection.insertMany(formatedFields);
            } finally {
                await client.close();
            }

            // Generar nuevo dsTableObject
            const propertiesAndTypes = {};
            if (columnsConfig && Array.isArray(columnsConfig)) {
                columnsConfig.forEach(col => { propertiesAndTypes[col.field] = col.type; });
            } else {
                excelFields.forEach(object => {
                    Object.entries(object).forEach(([property, value]) => {
                        if (!isNaN(Number(value))) {
                            propertiesAndTypes[property] = 'numeric';
                        } else {
                            const isDateValue = DateUtil.convertDate(value);
                            if (isDateValue) { propertiesAndTypes[property] = 'date'; }
                            else if (typeof value === 'string') { propertiesAndTypes[property] = 'text'; }
                        }
                    });
                });
            }

            const columnsEntry = [];
            Object.entries(propertiesAndTypes).map(([name, type]) => ({ name, type })).forEach((column) => {
                let newCol: any = {
                    column_name: column.name,
                    column_type: String(column.type),
                    display_name: { default: column.name, localized: [] },
                    description: { default: column.name, localized: [] },
                    minimumFractionDigits: 0,
                    column_granted_roles: [],
                    row_granted_roles: [],
                    visible: true,
                    ia_visibility: 'FULL',
                    tableCount: 0,
                    valueListSource: {},
                };
                if (newCol.column_type === 'numeric') { newCol.aggregation_type = AggregationTypes.getValuesForNumbers(); }
                else if (newCol.column_type === 'text') { newCol.aggregation_type = AggregationTypes.getValuesForText(); }
                else { newCol.aggregation_type = AggregationTypes.getValuesForOthers(); }
                columnsEntry.push(newCol);
            });

            const dsTableObject = [{
                table_name: excelName,
                display_name: { default: excelName, localized: [] },
                description: { default: excelName, localized: [] },
                table_granted_roles: [],
                table_type: [],
                columns: columnsEntry,
                relations: [],
                visible: true,
                tableCount: 0,
                no_relations: []
            }];

            // Actualizar el DataSource existente (no crear uno nuevo)
            await DataSource.findByIdAndUpdate(datasourceId, {
                $set: {
                    'ds.model.tables': dsTableObject,
                    'ds.metadata.optimized': optimize ?? false,
                    'ds.metadata.cache_config.enabled': cacheAllowed ?? false,
                }
            });

            return res.status(200).json({ ok: true, data_source_id: datasourceId });
        } catch (error) {
            console.error('Error al actualizar el ExcelSheet:', error);
            next(new HttpException(500, 'Error al actualizar el ExcelSheet'));
        }
    }

    static async ExistsExcelData(req: Request, res: Response, next: NextFunction) {
        //Checkea si hay documentos, en el nombre pasado por el frontal. Si los hay devuelve true para confirmar en el front
        try {
            if (!req.body?.name) return res.status(400).json({ ok: false, message: 'Nombre o campos incorrectos en la solicitud' });
            const excelModelChecker = ExcelSheetModel(req.body?.name), existentExcelDoc = await excelModelChecker.find({});
            if (existentExcelDoc.length > 0) {
                // Solo mostrar aviso de sobrescritura si además existe un datasource activo con ese nombre
                const existentDataSource = await DataSource.findOne({ 'ds.metadata.model_name': req.body.name });
                if (existentDataSource) {
                    return res.status(200).json({ ok: true, message: 'Modelo existe', existence: true });
                }
            }
            return res.status(200).json({ ok: true, message: 'Modelo existe', existence: false });
        } catch (error) {
            console.log("Error: ", error);
            return false;
        }
    }

    static async ExcelCollectionToDataSource(excelName, excelFields, optimized, cacheAllowed, columnsConfig, sourceType, description, res: Response, next: NextFunction) {
        try {
            //Declaramos un objeto que va a contener los tipos y nombres de los campos del Excel
            const propertiesAndTypes = {};

            // Si hay configuración de columnas del usuario, usarla en lugar de detectar automáticamente
            if (columnsConfig && Array.isArray(columnsConfig)) {
                columnsConfig.forEach(col => {
                    propertiesAndTypes[col.field] = col.type;
                });
            } else {
                // Detección automática (para Excel o si no hay configuración)
                excelFields.forEach(object => {
                    Object.entries(object).forEach(([property, value]) => {

                        if (!isNaN(Number(value))) {
                            propertiesAndTypes[property] = 'numeric';
                        } else {
                            const isDateValue = DateUtil.convertDate(value);

                            if (isDateValue) {
                                propertiesAndTypes[property] = 'date';
                            } else if (typeof value === 'string') {
                                propertiesAndTypes[property] = 'text';
                            }
                        }

                    });
                });
            }
            const propertiesAndTypesArray = Object.entries(propertiesAndTypes).map(([name, type]) => ({ name, type })), columnsEntry = [];
            //Mapeado de las columnas
            propertiesAndTypesArray.forEach((column) => {
                let newCol: any = {
                    column_name: column.name,
                    column_type: String(column.type),
                    display_name: {
                        default: column.name,
                        localized: []
                    },
                    description: {
                        default: column.name,
                        localized: []
                    },
                    minimumFractionDigits: 0,
                    column_granted_roles: [],
                    row_granted_roles: [],
                    visible: true,
                    ia_visibility: 'FULL',
                    tableCount: 0,
                    valueListSource: {},
                }

                if (newCol.column_type === 'numeric') {
                    newCol.aggregation_type = AggregationTypes.getValuesForNumbers();
                } else if (newCol.column_type === 'text') {
                    newCol.aggregation_type = AggregationTypes.getValuesForText();
                } else {
                    newCol.aggregation_type = AggregationTypes.getValuesForOthers();
                }

                columnsEntry.push(newCol);
            });
            //Construcción del objeto table
            const dsTableObject =
                [
                    {
                        table_name: excelName,
                        display_name: {
                            default: excelName,
                            localized: []
                        },
                        description: {
                            default: excelName,
                            localized: []
                        },
                        table_granted_roles: [],
                        table_type: [],
                        columns: columnsEntry,
                        relations: [],
                        visible: true,
                        tableCount: 0,
                        no_relations: []
                    }
                ];

            if (!databaseUrl?.url) return res.status(400).json({ ok: false, message: 'La connexión a la base de datos no existe' });
            const parsedUrl = new URL(databaseUrl?.url);
            //Transformar a datasource con todo inicializado a vacio
            const database = parsedUrl.pathname.substring(1);
            const { host, port, password } = parsedUrl;
            const datasource: IDataSource = new DataSource({
                ds: {
                    connection: {
                        type: "mongodb",
                        source_type: sourceType,
                        host: host.substring(0, host.indexOf(':')),
                        port: Number(port),
                        database,
                        schema: "public",
                        searchPath: "public",
                        user: parsedUrl.username,
                        password: EnCrypterService.encrypt(password),
                        poolLimit: null,
                        sid: null,
                        warehouse: null,
                        ssl: false
                    },
                    metadata: {
                        model_name: excelName,
                        model_description: description ?? '',
                        model_id: "",
                        model_granted_roles: [],
                        optimized: optimized ?? false,
                        ia_visibility: 'FULL',
                        cache_config: {
                            units: "",
                            quantity: 1,
                            hours: "",
                            minutes: "",
                            enabled: cacheAllowed ?? false,
                        },
                        filter: null,
                        model_owner: "",
                        tags: [],
                        external: {}
                    },
                    model: {
                        tables: dsTableObject
                    }
                }
            });
            try {
                const data_source = await datasource.save();
                return res.status(201).json({ ok: true, data_source_id: data_source._id });
            } catch (error) {
                return (new HttpException(500, `Error saving the datasource`));
            }
        } catch (error) {
            console.log("Error al parsear el excel: ", error);
            throw error;
        }
    }

}