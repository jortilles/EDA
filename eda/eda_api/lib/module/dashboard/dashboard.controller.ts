import { NextFunction, Request, Response } from 'express';
import { HttpException } from '../global/model/index';
import ManagerConnectionService from '../../services/connection/manager-connection.service';
import Dashboard, { IDashboard } from './model/dashboard.model';
import DataSource from '../datasource/model/datasource.model';
import User from '../admin/users/model/user.model';
import Group from '../admin/groups/model/group.model';
import formatDate from '../../services/date-format/date-format.service';
import { CachedQueryService } from '../../services/cache-service/cached-query.service'
import { QueryOptions } from 'mongoose';
import ServerLogService from '../../services/server-log/server-log.service';
const cache_config = require('../../../config/cache.config');


export class DashboardController {

    static async getDashboards(req: Request, res: Response, next: NextFunction) {

        try {
            let admin, privates, group, publics, shared = [];
            const groups = await Group.find({ users: { $in: req.user._id } }).exec();
            const isAdmin = groups.filter(g => g.role === 'EDA_ADMIN_ROLE').length > 0;

            if (isAdmin) {
                admin = await DashboardController.getAllDashboardToAdmin();
                publics = admin[0];
                privates = admin[1];
                group = admin[2];
                shared = admin[3];
            } else {
                privates = await DashboardController.getPrivateDashboards(req);
                group = await DashboardController.getGroupsDashboards(req);
                publics = await DashboardController.getPublicsDashboards();
                shared = await DashboardController.getSharedDashboards();
            }
            return res.status(200).json({ ok: true, dashboards: privates, group, publics, shared, isAdmin });
        } catch (err) {
            console.log(err);
            next(new HttpException(400, 'Some error ocurred loading dashboards'));
        }

    }

    static async getPrivateDashboards(req: Request) {
        try {
            const dashboards = await Dashboard.find({ 'user': req.user._id }, 'config.title config.visible config.tag config.onlyIcanEdit').exec();
            const privates = [];
            for (const dashboard of dashboards) {
                if (dashboard.config.visible === 'private') {
                    privates.push(dashboard);
                }
            }
            return privates;
        } catch (err) {
            throw new HttpException(400, 'Error loading privates dashboards');
        }
    }

    static async getGroupsDashboards(req: Request) {
        try {
            const userGroups = await Group.find({ users: { $in: req.user._id } }).exec();
            const dashboards = await Dashboard.find({ group: { $in: userGroups.map(g => g._id) } }, 'config.title config.visible group config.tag config.onlyIcanEdit').exec();
            const groupDashboards = [];
            for (let i = 0, n = dashboards.length; i < n; i += 1) {
                const dashboard = dashboards[i];
                for (const dashboardGroup of dashboard.group) {
                    //dashboard.group = groups.filter(g => JSON.stringify(g._id) === JSON.stringify(group));
                    for( const userGroup of userGroups ){
                        if( JSON.stringify(userGroup._id) === JSON.stringify(dashboardGroup) ){
                            groupDashboards.push(dashboard)
                        }
                    }


                }
            }
            return groupDashboards;
        } catch (err) {
            console.log(err);
            throw new HttpException(400, 'Error loading groups dashboards');
        }
    }

    static async getPublicsDashboards() {
        try {
            const dashboards = await Dashboard.find({}, 'config.title config.visible config.tag config.onlyIcanEdit').exec();
            const publics = [];

            for (const dashboard of dashboards) {
                if (dashboard.config.visible === 'public') {
                    publics.push(dashboard);
                }
            }
            return publics;
        } catch (err) {
            throw new HttpException(400, 'Error loading public dashboards');
        }
    }

    static async getSharedDashboards() {
        try {
            const dashboards = await Dashboard.find({}, 'config.title config.visible config.tag config.onlyIcanEdit').exec();
            const shared = [];
            for (const dashboard of dashboards) {
                if (dashboard.config.visible === 'shared') {
                    shared.push(dashboard);
                }
            }
            return shared;
        } catch (err) {
            throw new HttpException(400, 'Error loading shared dashboards');
        }
    }

    static async getAllDashboardToAdmin() {
        try {
            const dashboards = await Dashboard.find({}, 'user config.title config.visible group config.tag config.onlyIcanEdit').exec();
            const publics = [];
            const privates = [];
            const groups = [];
            const shared = [];

            for (const dashboard of dashboards) {
                switch (dashboard.config.visible) {
                    case 'public':
                        publics.push(dashboard);
                        break;
                    case 'private':
                        dashboard.user = await User.findById({ _id: dashboard.user }, 'name').exec();
                        privates.push(dashboard);
                        break;
                    case 'group':
                        dashboard.group = await Group.find({ _id: dashboard.group }).exec();
                        groups.push(dashboard);
                        break;
                    case 'shared':
                        shared.push(dashboard);
                        break;
                }
            }

            return [publics, privates, groups, shared];
        } catch (err) {
            throw new HttpException(400, 'Error loading dashboards for admin');
        }
    }

    static async getDashboard(req: Request, res: Response, next: NextFunction) {
        try {
            const user = req['user']._id;
            const userGroups = req['user'].role;
            const userRoles = (await Group.find({ _id: { $in: userGroups } }).exec()).map(group => group.name);
            const userGroupDashboards = (await Dashboard.find({ group: { $in: userGroups } }, 'config.title config.visible group')
                .exec())
                .map(dashboard => dashboard._id).filter(id => id.toString() === req.params.id);

            Dashboard.findOne({ _id: req.params.id }, (err, dashboard) => {
                if (err) {
                    console.log('Dashboard not found with this id:' +  req.params.id );
                    return next(new HttpException(500, 'Dashboard not found with this id'));
                }

                const visibilityCheck = !['shared', 'public'].includes(dashboard.config.visible);
                const roleCheck = !userRoles.includes('ADMIN') && (userGroupDashboards.length === 0) && (dashboard.user.toString() !== user);

                if (visibilityCheck && roleCheck) {
                    console.log('You don\'t have permission ' +  user + ' for dashboard ' + req.params.id );
                    return next(new HttpException(500, "You don't have permission"));
                }

                DataSource.findById({ _id: dashboard.config.ds._id }, (err, datasource) => {
                    if (err) {
                        return next(new HttpException(500, 'Error searching the DataSource'));
                    }

                    if (!datasource) {
                        return next(new HttpException(400, 'Datasouce not found with id'));
                    }


                    


                    const toJson = JSON.parse(JSON.stringify(datasource));
    

                    // si tinc filtres de seguretat....
                    /*  NO HO IMPLEMENTO ENCARA DEGUT ALS DUBTES SOBRE EL FUNCIONAMENT. 
                    SI OCULTO COLUMNES QUE PASSA AMB ELS INFORMES QUE FAN SERVIR AQUESTA COLUMNA.
                    CAL PENSARO UNA MICA MES. PER QUE EN REALITAT ES OCULTAR I NO FILTRAR
                    
                    let filteredModel =  toJson.ds.model;
                    let filteredTable :any;
                    let filteredTables:any= [];
                    const hiddenColumns = toJson.ds.metadata.model_granted_roles.filter( d => d.none == true);
                    hiddenColumns.forEach( c => {
                       // console.log(c);
                        toJson.ds.model.tables.forEach(table => {
                            filteredTable = table;
                            // Trec la taula que modificare...  
                            filteredModel.tables.filter(obj=> obj!== table);
                            table.columns.forEach(col => {
                                if( col.column_name == c.column && table.table_name == c.table){
                                    filteredTable.columns  = filteredTable.columns.filter( x=> x.column_name !== c.column);
                                
                                }
                            });
                            //console.log(filteredTable);
                            filteredModel.tables.push(filteredTable);
                        });
                    }       
                    );
                    const ds = { _id: datasource._id, model: filteredModel, name: toJson.ds.metadata.model_name };
                    */
                    const ds = { _id: datasource._id, model: toJson.ds.model, name: toJson.ds.metadata.model_name };


                    insertServerLog(req, 'info', 'DashboardAccessed', req.user.name , ds._id + '--' + ds.name );
                    return res.status(200).json({ ok: true, dashboard, datasource: ds });
                });
            });
        } catch (err) {
            next(err);
        }
    }

    static async create(req: Request, res: Response, next: NextFunction) {
        try {
            const body = req.body;

            const dashboard: IDashboard = new Dashboard({
                config: body.config,
                user: req.user._id,
            });

            if (body.config.visible === 'group') {
                dashboard.group = body.group;
            }

            //Save dashboard in db
            dashboard.save((err, dashboard) => {

                if (err) {
                    return next(new HttpException(400, 'Some error ocurred while creating the dashboard'));
                }

                return res.status(201).json({ ok: true, dashboard });
            });
        } catch (err) {
            next(err);
        }
    }

    static async update(req: Request, res: Response, next: NextFunction) {
        try {
            const body = req.body;

            Dashboard.findById(req.params.id, (err, dashboard: IDashboard) => {

                if (err) {
                    return next(new HttpException(500, 'Error searching the dashboard'));
                }

                if (!dashboard) {
                    return next(new HttpException(400, 'Dashboard not exist with this id'));
                }

                dashboard.config = body.config;
                dashboard.group = body.group;


                dashboard.save((err, dashboard) => {

                    if (err) {
                        return next(new HttpException(500, 'Error updating dashboard'));
                    }

                    return res.status(200).json({ ok: true, dashboard });
                });

            });
        } catch (err) {
            next(err);
        }
    }

    static async delete(req: Request, res: Response, next: NextFunction) {
        let options:QueryOptions = {};
        try {
            Dashboard.findByIdAndDelete(req.params.id, options, (err, dashboard) => {

                if (err) {
                    return next(new HttpException(500, 'Error removing dashboard'));
                }

                if (!dashboard) {
                    return next(new HttpException(400, 'Not exists dahsboard with this id'));
                }

                return res.status(200).json({ ok: true, dashboard });
            });
        } catch (err) {
            next(err);
        }
    }

    static async execQuery(req: Request, res: Response, next: NextFunction) {
        try {

            const connection = await ManagerConnectionService.getConnection(req.body.model_id);
            const dataModel = await connection.getDataSource(req.body.model_id);


            /**Security check */
            const allowed = DashboardController.securityCheck(dataModel, req.user);
            if (!allowed) {
                return next(new HttpException(500, `Sorry, this DataModel has security activated: you are not allowed here, contact your administrator`));
            }

            const dataModelObject = JSON.parse(JSON.stringify(dataModel));
            const query = await connection.getQueryBuilded(req.body.query, dataModelObject, req.user);

            console.log('\x1b[32m%s\x1b[0m', `QUERY for user ${req.user.name}, with ID: ${req.user._id},  at: ${formatDate(new Date())} `);
            console.log(query);
            console.log('\n-------------------------------------------------------------------------------\n');

            /**cached query */
            let cacheEnabled = dataModelObject.ds.metadata.cache_config && dataModelObject.ds.metadata.cache_config.enabled === true;
            const cachedQuery = cacheEnabled ? await CachedQueryService.checkQuery(req.body.model_id, query) : null;

            if (!cachedQuery) {
                connection.client = await connection.getclient();
                const getResults = await connection.execQuery(query);
                let numerics = [];
               /** si es oracle haig de fer una merda per tornar els numeros normals. */
               if(dataModel.ds.connection.type == 'oracle'){
                    req.body.query.fields.forEach((e,i) => {   
                        if(e.column_type == 'numeric'){
                            numerics.push('true');
                        }else{
                            numerics.push('false');
                        }
                    });
                
               }
                const results = [];

                // Normalize data here i also transform oracle numbers who come as strings to real numbers
                for (let i = 0, n = getResults.length; i < n; i++) {
                    const r = getResults[i];
                    const output = Object.keys(r).map((i,ind) =>{
                        /** si es oracle haig de fer una merda per tornar els numeros normals. */
                        if(dataModel.ds.connection.type == 'oracle'){
                              if( numerics[ind] == 'true' ){
                                    const   res =  parseFloat( r[i] );
                                      if( isNaN(res) ){
                                          return null;
                                      }else{
                                          return res;
                                      }

                              }else{
                                   return r[i];
                              }                  
                        }else{
                            return r[i];
                        }
                       
                    });
                    results.push(output);
                }
                const output = [req.body.output.labels, results];


                if (output[1].length < cache_config.MAX_STORED_ROWS && cacheEnabled) {
                    CachedQueryService.storeQuery(req.body.model_id, query, output);
                }

                /**SUMA ACUMULATIVA -> 
                 * Si hay fechas agregadas por mes o dia 
                 * y el flag cumulative está activo se hace la suma acumulativa en todos los campos numéricos
                 */
                DashboardController.cumulativeSum(output, req.body.query);

                console.log('\x1b[32m%s\x1b[0m', `Date: ${formatDate(new Date())} Dashboard:${req.body.dashboard.dashboard_id} Panel:${req.body.dashboard.panel_id} DONE\n`);
                return res.status(200).json(output);

                /**
                 * La consulta és a la caché
                 */
            } else {
                /**SUMA ACUMULATIVA -> 
                * Si hay fechas agregadas por mes o dia 
                * y el flag cumulative está activo se hace la suma acumulativa en todos los campos numéricos
                */
                console.log('\x1b[36m%s\x1b[0m', '💾 Chached query 💾');
                DashboardController.cumulativeSum(cachedQuery.cachedQuery.response, req.body.query);
                console.log('\x1b[32m%s\x1b[0m', `Date: ${formatDate(new Date())} Dashboard:${req.body.dashboard.dashboard_id} Panel:${req.body.dashboard.panel_id} DONE\n`);
                return res.status(200).json(cachedQuery.cachedQuery.response);
            }



        } catch (err) {
            console.log(err);
            next(new HttpException(500, 'Error quering database'));
        }
    }


    static async execSqlQuery(req: Request, res: Response, next: NextFunction) {
        try {

            const connection = await ManagerConnectionService.getConnection(req.body.model_id);
            const dataModel = await connection.getDataSource(req.body.model_id);

            /**Security check */
            const allowed = DashboardController.securityCheck(dataModel, req.user);
            if (!allowed) {
                return next(new HttpException(500, `Sorry, you are not allowed here, contact your administrator`));
            }

            const dataModelObject = JSON.parse(JSON.stringify(dataModel));
            const query = connection.BuildSqlQuery(req.body.query, dataModelObject, req.user);

            /**If query is in format select foo from a, b queryBuilder returns null */
            if (!query) {
                return next(new HttpException(500, 'Queries in format "select x from A, B" are not suported'));
            }

            console.log('\x1b[32m%s\x1b[0m', `QUERY for user ${req.user.name}, with ID: ${req.user._id},  at: ${formatDate(new Date())} `);
            console.log(query);
            console.log('\n-------------------------------------------------------------------------------\n');

            /**cached query */
            let cacheEnabled = dataModelObject.ds.metadata.cache_config && dataModelObject.ds.metadata.cache_config.enabled;
            const cachedQuery = cacheEnabled ? await CachedQueryService.checkQuery(req.body.model_id, query) : null;

            if (!cachedQuery) {
                connection.client = await connection.getclient();
                const getResults = await connection.execSqlQuery(query);
                const results = [];
                let labels: Array<string>;
                if (getResults.length > 0) {
                    labels = Object.keys(getResults[0]).map(i => i);
                } else {
                    labels = ['NoData'];
                }
                // Normalize data
                for (let i = 0, n = getResults.length; i < n; i++) {
                    const r = getResults[i];
                    const output = Object.keys(r).map(i => r[i]);
                    results.push(output);
                }

                const output = [labels, results];
                if (output[1].length < cache_config.MAX_STORED_ROWS && cacheEnabled) {
                    CachedQueryService.storeQuery(req.body.model_id, query, output);
                }

                console.log('\x1b[32m%s\x1b[0m', `Date: ${formatDate(new Date())} Dashboard:${req.body.dashboard.dashboard_id} Panel:${req.body.dashboard.panel_id} DONE\n`);
                return res.status(200).json(output);

            } else {
                console.log('\x1b[36m%s\x1b[0m', '💾 Chached query 💾');
                console.log('\x1b[32m%s\x1b[0m', `Date: ${formatDate(new Date())} Dashboard:${req.body.dashboard.dashboard_id} Panel:${req.body.dashboard.panel_id} DONE\n`);
                return res.status(200).json(cachedQuery.cachedQuery.response);
            }

        } catch (err) {
            console.log(err)
            next(new HttpException(500, 'Error quering database'));
        }

    }

    static securityCheck(dataModel: any, user: any) {
        if (dataModel.ds.metadata.model_granted_roles.length > 0) {

            const users = [];
            const roles = [];
            //Get users with permission
            dataModel.ds.metadata.model_granted_roles.forEach(permission => {
                switch (permission.type) {
                    case 'users':
                        permission.users.forEach(user => {
                            if (!users.includes(user)) users.push(user);
                        });
                        break;
                    case 'groups':
                        user.role.forEach(role => {
                            if (permission.groups.includes(role)) {
                                if (!roles.includes(role)) roles.push(role);
                            }
                        });
                }

            });

            if (!users.includes(user._id) && roles.length < 1) {
                return false;
            } else {
                return true;
            }

        }
        else return true;
    }

    /**
     * Get builded query
     * @param req 
     * @param res 
     * @param next 
     */
    static async getQuery(req: Request, res: Response, next: NextFunction) {

        try {

            const connection = await ManagerConnectionService.getConnection(req.body.model_id);
            const dataModel = await connection.getDataSource(req.body.model_id);
            const dataModelObject = JSON.parse(JSON.stringify(dataModel));
            const query = await connection.getQueryBuilded(req.body.query, dataModelObject, req.user);


            return res.status(200).json(query);

        } catch (err) {
            console.log(err);
            next(new HttpException(500, 'Error getting query'));
        }

    }

    static async execView(req: Request, res: Response, next: NextFunction) {
        try {
            const connection = await ManagerConnectionService.getConnection(req.body.model_id);
            const query = req.body.query
            console.log(query);

            connection.client = await connection.getclient();
            const getResults = await connection.execQuery(query);
            const results = [];
            let labels: Array<string>;
            if (getResults.length > 0) {
                labels = Object.keys(getResults[0]).map(i => i);
            } else {
                labels = ['NoData'];
            }
            // Normalize data
            for (let i = 0, n = getResults.length; i < n; i++) {
                const r = getResults[i];
                const output = Object.keys(r).map(i => r[i]);
                results.push(output);
            }
            const output = [labels, results];
            return res.status(200).json(output);

        } catch (err) {
            console.log(err)
            next(new HttpException(500, 'Error quering database'));
        }

    }

    static async cumulativeSum(data, query) {

        let shouldCompare = false;
        query.fields.forEach(field => {
            if (field.column_type === 'date' && ['month', 'week', 'day'].includes(field.format) && !!field.cumulativeSum) {
                shouldCompare = true;
            }
        })

        if (shouldCompare) {

            let types = query.fields.map(field => field.column_type);
            let dateIndex = types.indexOf('date');

            let prevValues = query.fields.map(_ => 0);
            let prevDate = 0;
            let prevHead = '';
            let newRows = [];

            data[1].forEach(row => {

                let currentDate = parseInt(row[dateIndex].slice(-2)); /**01, 02, 03 ...etc. */
                let currentHead = row[dateIndex].slice(0, -2); /** 2020-01, 2020-02 ...etc. */
                let newRow = [];

                types.forEach((type, index) => {
                    let value = row[index];

                    if (type === 'numeric' && currentDate >= prevDate && currentHead === prevHead) {
                        value = row[index] + prevValues[index]
                    }

                    prevValues[index] = value;
                    newRow.push(value)
                });

                prevDate = currentDate;
                prevHead = currentHead;
                newRows.push(newRow);

            });

            data[1] = newRows;

        }
    }

    static async cleanDashboardCache(req: Request, res: Response, next: NextFunction) {

        const connection = await ManagerConnectionService.getConnection(req.body.model_id);
        const dataModel = await connection.getDataSource(req.body.model_id);

        if (dataModel.ds.metadata.cache_config.enabled) {
            /**Security check */
            const allowed = DashboardController.securityCheck(dataModel, req.user);
            if (!allowed) {
                return next(new HttpException(500, `Sorry, you are not allowed here, contact your administrator`));
            }

            const dataModelObject = JSON.parse(JSON.stringify(dataModel));

            req.body.queries.forEach(async query => {
                let sqlQuery = await connection.getQueryBuilded(query, dataModelObject, req.user);
                let hashedQuery = CachedQueryService.build(req.body.model_id, sqlQuery);
                let res = await CachedQueryService.deleteQuery(hashedQuery);
            })
        }

        return res.status(200).json({ok:true});
    }



}



function insertServerLog(req: Request, level: string, action: string, userMail: string, type: string) {
    const ip = req.headers['x-forwarded-for'] || req.get('origin');
    var date = new Date();
    var month =date.getMonth()+1 ;
    var monthstr=month<10?"0"+month.toString(): month.toString();
    var day = date.getDate();
    var daystr=day<10?"0"+day.toString(): day.toString();
    var date_str = date.getFullYear() + "-" + monthstr + "-" + daystr + " " +  date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
    ServerLogService.log({ level, action, userMail, ip, type, date_str});
}
