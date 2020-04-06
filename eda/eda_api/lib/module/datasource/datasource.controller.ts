import { NextFunction, Request, Response } from 'express';
import DataSource, { IDataSource } from './model/datasource.model';
import Dashboard from '../dashboard/model/dashboard.model';
import { IUserRequest, HttpException } from '../global/model/index';
import ManagerConnectionService from '../../services/connection/manager-connection.service';
import ConnectionModel from './model/connection.model';
import { EnCrypterService } from '../../services/encrypter/encrypter.service';

export class DataSourceController {

    static async GetDataSources(req: Request, res: Response, next: NextFunction) {
        try {
            DataSource.find({}, (err, dataSources) => {
                if (err) {
                    return next(new HttpException(404, 'Error loading DataSources'));
                }

                const protectedDataSources = [];

                for (let i = 0, n = dataSources.length; i < n; i += 1) {
                    const datasource = dataSources[i];
                    datasource.ds.connection.password = EnCrypterService.decode(datasource.ds.connection.password);

                    protectedDataSources.push(datasource);
                }

                return res.status(200).json({ ok: true, ds: protectedDataSources });
            });
        } catch (err) {
            next(err);
        }
    }

    static async GetDataSourcesNames(req: Request, res: Response, next: NextFunction) {
        DataSource.find({}, '_id ds.metadata.model_name', (err, ds) => {
            if (!ds) {
                return next(new HttpException(500, 'Error loading DataSources'));
            }

            const names = JSON.parse(JSON.stringify(ds));

            const output = [];

            for (let i = 0, n = names.length; i < n; i += 1) {
                const e = names[i];
                output.push({ _id: e._id, model_name: e.ds.metadata.model_name })
            }

            return res.status(200).json({ ok: true, ds: output });
        });
    }

    static async GetDataSourceById(req: Request, res: Response, next: NextFunction) {
        try {
            DataSource.findById({ _id: req.params.id }, (err, dataSource) => {
                if (err) {
                    return next(new HttpException(404, 'Datasouce not found'));
                }

                dataSource.ds.connection.password = EnCrypterService.decode(dataSource.ds.connection.password);

                return res.status(200).json({ ok: true, dataSource });
            });
        } catch (err) {
            next(err);
        }
    }

    static async UpdateDataSource(req: Request, res: Response, next: NextFunction) {
        try {
            // Validation request
            const body = req.body;

            DataSource.findById(req.params.id, (err, dataSource: IDataSource) => {
                if (err) {
                    return next(new HttpException(500, 'Datasouce not found'));
                }

                if (!dataSource) {
                    return next(new HttpException(400, 'DataSource not exist with id'));
                }

                body.ds.connection.password = EnCrypterService.encrypt(body.ds.connection.password);

                dataSource.ds = body.ds;

                const iDataSource = new DataSource(dataSource);

                iDataSource.save((err, dataSource) => {
                    if (err) {
                        next(new HttpException(500, 'Error updating dataSource'));
                    }

                    return res.status(200).json({ ok: true, message: 'Modelo actualizado correctamente' });
                })
            });

        } catch (err) {
            next(err);
        }
    }

    static async DeleteDataSource(req: Request, res: Response, next: NextFunction) {
        try {
            Dashboard.find({}, (err, dashboards) => {
                const dbds = dashboards.filter(d => d.config.ds._id === req.params.id);
                let stopLoop = false;

                for (let i = 0; i < dbds.length; i++) {
                    if (stopLoop) {
                        return false;
                    }

                    Dashboard.findByIdAndDelete(dbds[i]._id, (err, dashboard) => {
                        if (err) {
                            stopLoop = true;
                            return next(new HttpException(500, 'Error removing dashboard'));
                        }
                    });
                }

                DataSource.findByIdAndDelete(req.params.id, (err, dataSource) => {
                    if (err) {
                        return next(new HttpException(500, 'Error removing dataSource'));
                    }

                    return res.status(200).json({ ok: true, dataSource });
                });
            });
        } catch (err) {
            next(err);
        }
    }

    static async CheckConnection(req: IUserRequest, res: Response, next: NextFunction) {

        if (!['postgres','mysql', 'vertica'].includes(req.query.type)) {
            next(new HttpException(404, 'Only postgres, MySQL and Vertica are accepted'));
        } else {
            try {
                const cn = new ConnectionModel(req.query.user, req.query.host, req.query.database, req.query.password, req.query.port, req.query.type, req.body.schema);
                const manager = await ManagerConnectionService.testConnection(cn);
                await manager.tryConnection();
                return res.status(200).json({ ok: true });
            } catch (err) {
                next(new HttpException(500, `Can't connect to database`));
            }

        }
    }

    static async GenerateDataModel(req: Request, res: Response, next: NextFunction) {
        try {
            const cn = new ConnectionModel(req.body.user, req.body.host, req.body.database, req.body.password, req.body.port, req.body.type, req.body.schema);
            const manager = await ManagerConnectionService.testConnection(cn);
            const tables = await manager.generateDataModel();
            const datasource: IDataSource = new DataSource({
                ds: {
                    connection: {
                        type: req.body.type,
                        host: req.body.host,
                        port: req.body.port,
                        database: req.body.database,
                        schema: req.body.schema,
                        searchPath: req.body.schema,
                        user: req.body.user,
                        password: EnCrypterService.encrypt(req.body.password)
                    },
                    metadata: {
                        model_name: req.body.name,
                        model_id: '',
                        model_granted_roles: []
                    },
                    model: {
                        tables: tables
                    }
                }
            });

            datasource.save((err, data_source) => {
                if (err) {
                    return next(new HttpException(500, `Error saving the datasource`));
                }

                return res.status(201).json({ ok: true, data_source_id: data_source._id });
            });
        } catch (err) {
            next(err);
        }
    }

    static async RefreshDataModel(req: Request, res: Response, next: NextFunction) {
        try {
            const cn = new ConnectionModel(req.body.user, req.body.host, req.body.database, req.body.password, req.body.port, req.body.type, req.body.schema);
            const manager = await ManagerConnectionService.testConnection(cn);
            const tables = await manager.generateDataModel();
            const datasource: IDataSource = new DataSource({
                ds: {
                    connection: {
                        type: req.body.type,
                        host: req.body.host,
                        port: req.body.port,
                        database: req.body.database,
                        schema: req.body.schema,
                        searchPath: req.body.schema,
                        user: req.body.user,
                        password: EnCrypterService.encrypt(req.body.password)
                    },
                    metadata: {
                        model_name: req.body.name,
                        model_id: '',
                        model_granted_roles: []
                    },
                    model: {
                        tables: tables
                    }
                }
            });

            const ds = await manager.getDataSource(req.params.id);
            const storedDataModel = JSON.parse(JSON.stringify(ds));

            const out = DataSourceController.FindAndUpdateDataModel(datasource.ds.model.tables, storedDataModel.ds.model.tables);
            datasource.ds.model.tables = DataSourceController.FindAndDeleteDataModel(datasource.ds.model.tables, out);


            DataSource.findById(req.params.id, (err, dataSource: IDataSource) => {
                if (err) {
                    return next(new HttpException(500, `Error updating the datasource`));
                }

                dataSource.ds.model.tables = datasource.ds.model.tables;

                const iDataSource = new DataSource(dataSource);

                iDataSource.save((err, saved) => {
                    if (err) {
                        return next(new HttpException(500, `Error updating the datasource`));
                    }

                    if (!saved) {
                        return next(new HttpException(500, `Error in the save datasource`));
                    }

                    return res.status(200).json({ ok: true, message: out });
                });

            });
        } catch (err) {
            next(err);
        }
    }

    static FindAndUpdateDataModel(referenceModel, updatedDataModel) {
        referenceModel.forEach(rTable => {
            const uTable = updatedDataModel.filter(t => t.table_name === rTable.table_name);
            if (uTable.length) {
                let column = [];
                rTable.columns.forEach(r_column => {
                    column = uTable[0].columns.filter(c => {
                        return c.column_name === r_column.column_name;
                    });
                    if (!column.length) {

                        uTable[0].columns.push(r_column);
                    }
                });
                //uTable[0].relations = rTable.relations;
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
            let rTable = referenceModel.filter(t => t.table_name === uTable.table_name);
            if (rTable.length) {
                let column = [];
                uTable.columns.forEach(uColumn => {
                    column = rTable[0].columns.filter(c => c.column_name === uColumn.column_name);
                    if (!column.length) {
                        uTable.columns = uTable.columns.filter(c => c.column_name !== uColumn.column_name);
                    }
                });
            } else {
                toDelete.push(uTable.table_name);
            }
        });
        return out.filter(t => !toDelete.includes(t.table_name));

    }

}
