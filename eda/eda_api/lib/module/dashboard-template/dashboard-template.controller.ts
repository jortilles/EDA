import { NextFunction, Request, Response } from 'express';
import { HttpException } from '../global/model/index';
import DashboardTemplate, { IDashboardTemplate } from './model/dashboard-template.model';
import Dashboard from '../dashboard/model/dashboard.model';
import DataSource from '../datasource/model/datasource.model';
import User from '../admin/users/model/user.model';
import Group from '../admin/groups/model/group.model';
import _ from 'lodash';

export class DashboardTemplateController {

    static async getTemplates(req: Request, res: Response, next: NextFunction) {
        try {
            const user = req.user._id;
            const userGroups = req.user.role;
            const searchTerm = req.query.search as string;
            const sortBy = req.query.sortBy as string || 'lastUsedAt';
            const sortOrder = req.query.sortOrder as string || 'desc';
            const dataSourceId = req.query.dataSourceId as string;

            const isAdmin = userGroups.includes('135792467811111111111110');

            let filter: any = {};

            if (!isAdmin) {
                filter = {
                    $or: [
                        { user: user },
                        { isPublic: true },
                        { group: { $in: userGroups } }
                    ]
                };
            }

            if (searchTerm) {
                const searchRegex = new RegExp(searchTerm, 'i');
                filter.$and = filter.$and || [];
                filter.$and.push({
                    $or: [
                        { name: searchRegex },
                        { description: searchRegex },
                        { 'config.title': searchRegex }
                    ]
                });
            }

            if (dataSourceId) {
                filter.$and = filter.$and || [];
                filter.$and.push({
                    'config.ds._id': dataSourceId
                });
            }

            const sort: any = {};
            sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

            const templates = await DashboardTemplate.find(filter)
                .populate('user', 'name')
                .populate('group', 'name')
                .sort(sort)
                .exec();

            const templatesWithDataSourceInfo = await Promise.all(
                templates.map(async (template) => {
                    const templateObj = template.toObject();
                    if (template.config.ds?._id) {
                        const ds = await DataSource.findById(template.config.ds._id, 'ds.metadata.model_name ds.connection.type').exec();
                        if (ds) {
                            templateObj.config.ds.name = ds.ds?.metadata?.model_name ?? 'N/A';
                            templateObj.config.ds.type = ds.ds?.connection?.type ?? 'N/A';
                        }
                    }
                    return templateObj;
                })
            );

            return res.status(200).json({
                ok: true,
                templates: templatesWithDataSourceInfo
            });
        } catch (err) {
            console.log(err);
            next(new HttpException(400, 'Error loading templates'));
        }
    }

    static async getTemplate(req: Request, res: Response, next: NextFunction) {
        try {
            const templateId = req.params.id;
            const user = req.user._id;
            const userGroups = req.user.role;
            const isAdmin = userGroups.includes('135792467811111111111110');

            const template = await DashboardTemplate.findById(templateId)
                .populate('user', 'name')
                .populate('group', 'name')
                .exec();

            if (!template) {
                return next(new HttpException(404, 'Template not found'));
            }

            const hasAccess = isAdmin ||
                template.user._id.toString() === user.toString() ||
                template.isPublic ||
                (template.group && template.group.some((g: any) => userGroups.includes(g._id.toString())));

            if (!hasAccess) {
                return next(new HttpException(403, 'You do not have permission to access this template'));
            }

            return res.status(200).json({
                ok: true,
                template
            });
        } catch (err) {
            console.log(err);
            next(new HttpException(400, 'Error loading template'));
        }
    }

    static async createTemplateFromDashboard(req: Request, res: Response, next: NextFunction) {
        try {
            const { dashboardId, name, description, isPublic } = req.body;
            const user = req.user._id;

            if (!dashboardId || !name) {
                return next(new HttpException(400, 'Dashboard ID and name are required'));
            }

            const dashboard = await Dashboard.findById(dashboardId).exec();

            if (!dashboard) {
                return next(new HttpException(404, 'Dashboard not found'));
            }

            const templateConfig = {
                title: dashboard.config.title,
                ds: dashboard.config.ds,
                panel: _.cloneDeep(dashboard.config.panel || []),
                filters: _.cloneDeep(dashboard.config.filters || []),
                styles: _.cloneDeep(dashboard.config.styles || {}),
                applyToAllfilter: dashboard.config.applyToAllfilter,
                orderDependentFilters: _.cloneDeep(dashboard.config.orderDependentFilters || []),
                clickFiltersEnabled: dashboard.config.clickFiltersEnabled,
                refreshTime: dashboard.config.refreshTime
            };

            const template: IDashboardTemplate = new DashboardTemplate({
                name,
                description: description || '',
                config: templateConfig,
                user,
                group: dashboard.group,
                isPublic: isPublic || false,
                createdAt: new Date(),
                updatedAt: new Date(),
                lastUsedAt: new Date(),
                useCount: 0
            });

            const savedTemplate = await template.save();

            return res.status(201).json({
                ok: true,
                template: savedTemplate
            });
        } catch (err) {
            console.log(err);
            next(new HttpException(500, 'Error creating template from dashboard'));
        }
    }

    static async createTemplateFromConfig(req: Request, res: Response, next: NextFunction) {
        try {
            const { name, description, config, isPublic, group } = req.body;
            const user = req.user._id;

            if (!name || !config || !config.ds) {
                return next(new HttpException(400, 'Name, config and datasource are required'));
            }

            const templateConfig = {
                title: config.title || name,
                ds: config.ds,
                panel: _.cloneDeep(config.panel || []),
                filters: _.cloneDeep(config.filters || []),
                styles: _.cloneDeep(config.styles || {}),
                applyToAllfilter: config.applyToAllfilter,
                orderDependentFilters: _.cloneDeep(config.orderDependentFilters || []),
                clickFiltersEnabled: config.clickFiltersEnabled !== undefined ? config.clickFiltersEnabled : true,
                refreshTime: config.refreshTime
            };

            const template: IDashboardTemplate = new DashboardTemplate({
                name,
                description: description || '',
                config: templateConfig,
                user,
                group: group || [],
                isPublic: isPublic || false,
                createdAt: new Date(),
                updatedAt: new Date(),
                lastUsedAt: new Date(),
                useCount: 0
            });

            const savedTemplate = await template.save();

            return res.status(201).json({
                ok: true,
                template: savedTemplate
            });
        } catch (err) {
            console.log(err);
            next(new HttpException(500, 'Error creating template'));
        }
    }

    static async updateTemplate(req: Request, res: Response, next: NextFunction) {
        try {
            const templateId = req.params.id;
            const { name, description, isPublic, config } = req.body;
            const user = req.user._id;
            const userGroups = req.user.role;
            const isAdmin = userGroups.includes('135792467811111111111110');

            const template = await DashboardTemplate.findById(templateId).exec();

            if (!template) {
                return next(new HttpException(404, 'Template not found'));
            }

            const hasPermission = isAdmin || template.user._id.toString() === user.toString();
            if (!hasPermission) {
                return next(new HttpException(403, 'You do not have permission to update this template'));
            }

            if (name) template.name = name;
            if (description !== undefined) template.description = description;
            if (isPublic !== undefined) template.isPublic = isPublic;
            if (config) {
                template.config = {
                    ...template.config,
                    ...config
                };
            }
            template.updatedAt = new Date();

            const updatedTemplate = await template.save();

            return res.status(200).json({
                ok: true,
                template: updatedTemplate
            });
        } catch (err) {
            console.log(err);
            next(new HttpException(500, 'Error updating template'));
        }
    }

    static async deleteTemplate(req: Request, res: Response, next: NextFunction) {
        try {
            const templateId = req.params.id;
            const user = req.user._id;
            const userGroups = req.user.role;
            const isAdmin = userGroups.includes('135792467811111111111110');

            const template = await DashboardTemplate.findById(templateId).exec();

            if (!template) {
                return next(new HttpException(404, 'Template not found'));
            }

            const hasPermission = isAdmin || template.user._id.toString() === user.toString();
            if (!hasPermission) {
                return next(new HttpException(403, 'You do not have permission to delete this template'));
            }

            await DashboardTemplate.findByIdAndDelete(templateId).exec();

            return res.status(200).json({
                ok: true,
                message: 'Template deleted successfully'
            });
        } catch (err) {
            console.log(err);
            next(new HttpException(500, 'Error deleting template'));
        }
    }

    static async createDashboardFromTemplate(req: Request, res: Response, next: NextFunction) {
        try {
            const templateId = req.params.id;
            const { name, visible, group } = req.body;
            const user = req.user._id;
            const userGroups = req.user.role;
            const isAdmin = userGroups.includes('135792467811111111111110');

            const template = await DashboardTemplate.findById(templateId).exec();

            if (!template) {
                return next(new HttpException(404, 'Template not found'));
            }

            const hasAccess = isAdmin ||
                template.user._id.toString() === user.toString() ||
                template.isPublic ||
                (template.group && template.group.some((g: any) => userGroups.includes(g._id.toString())));

            if (!hasAccess) {
                return next(new HttpException(403, 'You do not have permission to use this template'));
            }

            template.lastUsedAt = new Date();
            template.useCount = (template.useCount || 0) + 1;
            await template.save();

            const dashboardConfig = {
                title: name || template.config.title,
                ds: template.config.ds,
                panel: _.cloneDeep(template.config.panel || []),
                filters: _.cloneDeep(template.config.filters || []),
                styles: _.cloneDeep(template.config.styles || {}),
                applyToAllfilter: template.config.applyToAllfilter,
                orderDependentFilters: _.cloneDeep(template.config.orderDependentFilters || []),
                clickFiltersEnabled: template.config.clickFiltersEnabled,
                refreshTime: template.config.refreshTime,
                visible: visible || 'private',
                tag: null,
                author: req.user.name,
                createdAt: new Date().toISOString(),
                modifiedAt: new Date().toISOString(),
                onlyIcanEdit: false,
                sendViaMailConfig: { enabled: false },
                urls: null
            };

            const dashboard = new Dashboard({
                config: dashboardConfig,
                user,
                group: group || []
            });

            const savedDashboard = await dashboard.save();

            return res.status(201).json({
                ok: true,
                dashboard: savedDashboard
            });
        } catch (err) {
            console.log(err);
            next(new HttpException(500, 'Error creating dashboard from template'));
        }
    }

    static async updateTemplateUsage(req: Request, res: Response, next: NextFunction) {
        try {
            const templateId = req.params.id;
            const user = req.user._id;
            const userGroups = req.user.role;
            const isAdmin = userGroups.includes('135792467811111111111110');

            const template = await DashboardTemplate.findById(templateId).exec();

            if (!template) {
                return next(new HttpException(404, 'Template not found'));
            }

            const hasAccess = isAdmin ||
                template.user._id.toString() === user.toString() ||
                template.isPublic ||
                (template.group && template.group.some((g: any) => userGroups.includes(g._id.toString())));

            if (!hasAccess) {
                return next(new HttpException(403, 'You do not have permission to access this template'));
            }

            template.lastUsedAt = new Date();
            template.useCount = (template.useCount || 0) + 1;
            await template.save();

            return res.status(200).json({
                ok: true,
                template
            });
        } catch (err) {
            console.log(err);
            next(new HttpException(500, 'Error updating template usage'));
        }
    }
}
