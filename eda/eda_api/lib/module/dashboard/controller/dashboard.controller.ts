import { NextFunction, Request, Response } from 'express';
import { IUserRequest } from '../../global/model/user-request.model';
import ManagerConnectionService from '../../../services/connection/manager-connection.service';
import Dashboard, { IDashboard } from '../model/dashboard.model';
import DataSource from '../../datasource/model/datasource.model';
import User from '../../admin/model/user.model';
import Group from '../../admin/model/group.model';
import HttpException from '../../global/model/http-exception.model';
import formatDate from '../../../services/dateFormats/date-format.service'

export class DashboardController {

    static async getDashboards(req: IUserRequest, res: Response, next: NextFunction) {
        try {
            let admin, privates, group, publics = [];
            const groups = await Group.find({ users: { $in: req.user._id } }).exec();
            const isAdmin = groups.filter(g => g.role === 'ADMIN_ROLE').length > 0;

            if (isAdmin) {
                admin = await DashboardController.getAllDashboardToAdmin();
                publics = admin[0];
                privates = admin[1];
                group = admin[2];
            } else {
                privates = await DashboardController.getPrivateDashboards(req);
                group = await DashboardController.getGroupsDashboards(req);
                publics = await DashboardController.getPublicsDashboards();
            }

            return res.status(200).json({ ok: true, dashboards: privates, group, publics, isAdmin });
        } catch (err) {
            next(new HttpException(400, 'Some error ocurred loading dashboards'));
        }

    }

    static async getPrivateDashboards(req: IUserRequest) {
        const dashboards = await Dashboard.find({ 'user': req.user._id }, 'config.title config.visible').exec();
        const privates = [];
        for (const dashboard of dashboards) {
            if (dashboard.config.visible === 'private') {
                privates.push(dashboard);
            }
        }
        return privates;
    }

    static async getGroupsDashboards(req: IUserRequest) {
        const groups = await Group.find({ users: { $in: req.user._id } }).exec();
        const dashboards = await Dashboard.find({ group: { $in: groups.map(g => g._id) } }, 'config.title config.visible group').exec();
        for (const dashboard of dashboards) {
            dashboard.group = groups.find(g => JSON.stringify(g._id) === JSON.stringify(dashboard.group));
        }

        return dashboards;
    }

    static async getPublicsDashboards() {
        const dashboards = await Dashboard.find({}, 'config.title config.visible').exec();
        const publics = [];
        for (const dashboard of dashboards) {
            if (dashboard.config.visible === 'public') {
                publics.push(dashboard);
            }
        }
        return publics;
    }

    static async getAllDashboardToAdmin() {
        const dashboards = await Dashboard.find({}, 'user config.title config.visible group').exec();
        const publics = [];
        const privates = [];
        const groups = [];

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
                    dashboard.group = await Group.findById({ _id: dashboard.group }).exec();
                    groups.push(dashboard);
                    break;
            }
        }

        return [publics, privates, groups];
    }

    static async getDashboard(req: Request, res: Response, next: NextFunction) {
        Dashboard.findOne({ _id: req.params.id }, (err, dashboard) => {
            if (err) {
                next(new HttpException(500, 'Dashboard not found with this id'));
            }
            try {
                DataSource.findById({ _id: dashboard.config.ds._id }, (err, datasource) => {
                    if (err) {
                        next(new HttpException(500, 'Error searching the DataSource'));
                    }

                    if (!datasource) {
                        next(new HttpException(400, 'Datasouce not found with id'));
                    }

                    const toJson = JSON.parse(JSON.stringify(datasource));
                    const ds = { _id: datasource._id, model: toJson.ds.model };

                    return res.status(200).json({ ok: true, dashboard, datasource: ds });
                });
            }
            catch(err){
                next(new HttpException(500, 'Dashboard not found with this id'));
            }
        })
    }

    static async create(req: IUserRequest, res: Response, next: NextFunction) {
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
                next(new HttpException(400, 'Some error ocurred while creating the dashboard'));
            }

            return res.status(201).json({ ok: true, dashboard });
        });
    }

    static async update(req: Request, res: Response, next: NextFunction) {
        const body = req.body;

        Dashboard.findById(req.params.id, (err, dashboard: IDashboard) => {

            if (err) {
                next(new HttpException(500, 'Error searching the dashboard'));
            }

            if (!dashboard) {
                next(new HttpException(400, 'Dashboard not exist with this id'));
            }

            dashboard.config = body.config;
            dashboard.group = body.group;


            dashboard.save((err, dashboard) => {

                if (err) {
                    next(new HttpException(400, 'Error updating dashboard'));
                }

                return res.status(200).json({ ok: true, dashboard });
            })

        });
    }

    static async delete(req: Request, res: Response, next: NextFunction) {
        Dashboard.findByIdAndDelete(req.params.id, (err, dashboard) => {

            if (err) {
                next(new HttpException(500, 'Error removing dashboard'));
            }

            if (!dashboard) {
                next(new HttpException(400, 'Not exists dahsboard with this id'));
            }

            return res.status(200).json({ ok: true, dashboard });
        });
    }

    static async execQuery(req: IUserRequest, res: Response, next: NextFunction) {
        const connection = await ManagerConnectionService.getConnection(req.body.model_id);
        const dataModel = await connection.getDataSource(req.body.model_id);
        const dataModelObject = JSON.parse(JSON.stringify(dataModel));
        try {
            const query = await connection.getQueryBuilded(req.body.query, dataModelObject, req.user._id);

            console.log('\x1b[32m%s\x1b[0m', `${formatDate(new Date())} Dashboard:${req.body.dashboard.dashboard_id} Panel:${req.body.dashboard.panel_id} Your query:\n`, query);
            
            const getResults = await connection.execQuery(query);
            const results = [];

            // Normalize data
            getResults.forEach(r => {
                const output = Object.keys(r).map(i => r[i]);
                results.push(output);
            });

            const output = [req.body.output.labels, results];

            console.log('\x1b[32m%s\x1b[0m', `${formatDate(new Date())} Dashboard:${req.body.dashboard.dashboard_id} Panel:${req.body.dashboard.panel_id} DONE\n`);
            return res.status(200).json(output);
        } catch (err) {
            next(new HttpException(500, 'Error quering database'));
        }
    }
}
