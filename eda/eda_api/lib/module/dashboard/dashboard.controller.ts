import { NextFunction, Request, Response } from 'express';
import { HttpException } from '../global/model/index';
import ManagerConnectionService from '../../services/connection/manager-connection.service';
import Dashboard, { IDashboard } from './model/dashboard.model';
import DataSource from '../datasource/model/datasource.model';
import User from '../admin/users/model/user.model';
import Group from '../admin/groups/model/group.model';
import formatDate from '../../services/date-format/date-format.service';

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
            next(new HttpException(400, 'Some error ocurred loading dashboards'));
        }

    }

    static async getPrivateDashboards(req: Request) {
        try {
            const dashboards = await Dashboard.find({ 'user': req.user._id }, 'config.title config.visible config.tag').exec();
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
            const groups = await Group.find({ users: { $in: req.user._id } }).exec();
            const dashboards = await Dashboard.find({ group: { $in: groups.map(g => g._id) } }, 'config.title config.visible group config.tag').exec();

            for (let i = 0, n = dashboards.length; i < n; i += 1) {
                const dashboard = dashboards[i];
                for (const group of dashboard[i].group) {
                    dashboard.group = groups.filter(g => JSON.stringify(g._id) === JSON.stringify(group));
                }
            }

            return dashboards;
        } catch (err) {
            throw new HttpException(400, 'Error loading groups dashboards');
        }
    }

    static async getPublicsDashboards() {
        try {
            const dashboards = await Dashboard.find({}, 'config.title config.visible config.tag').exec();
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
            const dashboards = await Dashboard.find({}, 'config.title config.visible config.tag').exec();
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
            const dashboards = await Dashboard.find({}, 'user config.title config.visible group config.tag').exec();
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
                .map(dashboard => dashboard._id).filter(id => id.toString() === req.params.id );
            
            Dashboard.findOne({ _id: req.params.id }, (err, dashboard) => {
                if (err) {
                    return next(new HttpException(500, 'Dashboard not found with this id'));
                }

                const visibilityCheck = !['shared', 'public'].includes(dashboard.config.visible);
                const roleCheck = !userRoles.includes('ADMIN') && (userGroupDashboards.length === 0) && (dashboard.user.toString() !== user);

                if(visibilityCheck && roleCheck){
    
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
                    const ds = { _id: datasource._id, model: toJson.ds.model, name:toJson.ds.metadata.model_name };

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
                        return next(new HttpException(400, 'Error updating dashboard'));
                    }

                    return res.status(200).json({ ok: true, dashboard });
                });

            });
        } catch (err) {
            next(err);
        }
    }

    static async delete(req: Request, res: Response, next: NextFunction) {
        try {
            Dashboard.findByIdAndDelete(req.params.id, (err, dashboard) => {

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
            const dataModelObject = JSON.parse(JSON.stringify(dataModel));
            const query = await connection.getQueryBuilded(req.body.query, dataModelObject, req.user._id);

            console.log('YOUR QUERY --');
            console.log(query);
            connection.pool =  await connection.getPool();
            const getResults = await connection.execQuery(query);
            const results = [];

            // Normalize data
            for (let i = 0, n = getResults.length; i < n; i++) {
                const r = getResults[i];
                const output = Object.keys(r).map(i => r[i]);
                results.push(output);
            }

            const output = [req.body.output.labels, results];

            console.log('\x1b[32m%s\x1b[0m', `${formatDate(new Date())} Dashboard:${req.body.dashboard.dashboard_id} Panel:${req.body.dashboard.panel_id} DONE\n`);
            return res.status(200).json(output);
        } catch (err) {
            console.log(err);
            next(new HttpException(500, 'Error quering database'));
        }
    }

    static async execSqlQuery(req: Request, res: Response, next: NextFunction){
        try{
            const connection = await ManagerConnectionService.getConnection(req.body.model_id);
            const dataModel = await connection.getDataSource(req.body.model_id);
            const dataModelObject = JSON.parse(JSON.stringify(dataModel));
            const query = await connection.BuildSqlQuery(req.body.query, dataModelObject, req.user._id);
            console.log(query);

            connection.pool =  await connection.getPool();
            const getResults = await connection.execQuery(query);
            const results = [];
            let labels : Array<string>;
            if(getResults.length > 0){     
                labels = Object.keys(getResults[0]).map(i => i);
            }else{
                labels = ['NoData'];
            }
            // Normalize data
            for (let i = 0, n = getResults.length; i < n; i++) {
                const r = getResults[i];
                const output = Object.keys(r).map(i => r[i]);
                results.push(output);
            }
            console.log(labels);
            const output = [labels, results];
            return res.status(200).json(output);

        } catch (err) {
            console.log(err)
            next(new HttpException(500, 'Error quering database'));
        }
        
    }

    static async execView(req: Request, res: Response, next: NextFunction){
        try{
            const connection = await ManagerConnectionService.getConnection(req.body.model_id);
            const query = req.body.query
            console.log(query);

            connection.pool =  await connection.getPool();
            const getResults = await connection.execQuery(query);
            const results = [];
            let labels : Array<string>;
            if(getResults.length > 0){     
                labels = Object.keys(getResults[0]).map(i => i);
            }else{
                labels = ['NoData'];
            }
            // Normalize data
            for (let i = 0, n = getResults.length; i < n; i++) {
                const r = getResults[i];
                const output = Object.keys(r).map(i => r[i]);
                results.push(output);
            }
            console.log(labels);
            const output = [labels, results];
            return res.status(200).json(output);

        } catch (err) {
            console.log(err)
            next(new HttpException(500, 'Error quering database'));
        }
        
    }

}
