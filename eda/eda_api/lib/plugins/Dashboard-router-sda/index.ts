import { NextFunction, Request, Response } from 'express';
import { DashboardController } from '../../module/dashboard/dashboard.controller';
import Dashboard from '../../module/dashboard/model/dashboard.model';
import Group from '../../module/admin/groups/model/group.model';
import { HttpException } from '../../module/global/model/http-exception.model';

/**
 * SinergiaDA-only rule: "Público" dashboards (config.visible 'open', legacy name
 * 'shared') may only be seen, created, edited, cloned or deleted by EDA_ADMIN_ROLE
 * users.
 * Lives isolated in this folder (not wired into dashboard.router.ts) so it can be
 * dropped without touching shared code on non-SinergiaDA deployments.
 *
 * Hot-patches DashboardController's static methods as a side effect of being
 * required by the plugin auto-discovery (lib/plugins/index.ts). It deliberately
 * does not export a valid IEDAPlugin, so a harmless "no exporta un IEDAPlugin
 * válido" warning shows up on startup — that's expected.
 *
 * For the patch to actually intercept requests, dashboard.router.ts must resolve
 * DashboardController.<method> at request time (not capture it once at import time).
 *
 * The patching is deferred via setImmediate() because of a require cycle:
 * dashboard.controller.ts imports ManagerConnectionService, which imports this
 * plugins folder (for PluginRegistry), which requires this file again. At the
 * moment this module's code runs, dashboard.controller.ts is still mid-load and
 * hasn't reached `export class DashboardController` yet, so accessing it
 * synchronously here would read `undefined`. Waiting one tick lets the whole
 * synchronous module graph (including that cycle) finish loading first.
 */

const PUBLIC_VISIBLE_VALUES = ['open', 'shared'];

function isPublicVisibility(visible: any): boolean {
  return PUBLIC_VISIBLE_VALUES.includes(visible);
}

async function isRequestFromAdmin(req: Request): Promise<boolean> {
  if (!req.user?._id) return false;
  const groups = await Group.find({ users: { $in: req.user._id } }).exec();
  return groups.some((g: any) => g.role === 'EDA_ADMIN_ROLE');
}

async function getStoredVisibility(id: string): Promise<string | undefined> {
  try {
    const dashboard = await Dashboard.findById(id, 'config.visible').exec();
    return dashboard?.config?.visible;
  } catch {
    return undefined;
  }
}

setImmediate(() => {
  const originalGetDashboards = DashboardController.getDashboards;
  DashboardController.getDashboards = (async function (req: Request, res: Response, next: NextFunction) {
    const originalJson = res.json.bind(res);
    res.json = ((body: any) => {
      if (body?.ok && body.isAdmin !== true && Array.isArray(body.publics)) {
        body.publics = [];
      }
      return originalJson(body);
    }) as any;
    return originalGetDashboards.call(DashboardController, req, res, next);
  }) as any;

  const originalGetDashboard = DashboardController.getDashboard;
  DashboardController.getDashboard = (async function (req: Request, res: Response, next: NextFunction) {
    const visible = await getStoredVisibility(req.params.id);
    if (isPublicVisibility(visible) && !(await isRequestFromAdmin(req))) {
      return next(new HttpException(403, 'Solo un administrador puede ver informes públicos'));
    }
    return originalGetDashboard.call(DashboardController, req, res, next);
  }) as any;

  const originalCreate = DashboardController.create;
  DashboardController.create = (async function (req: Request, res: Response, next: NextFunction) {
    if (isPublicVisibility(req.body?.config?.visible) && !(await isRequestFromAdmin(req))) {
      return next(new HttpException(403, 'Solo un administrador puede crear informes públicos'));
    }
    return originalCreate.call(DashboardController, req, res, next);
  }) as any;

  const originalUpdate = DashboardController.update;
  DashboardController.update = (async function (req: Request, res: Response, next: NextFunction) {
    const admin = await isRequestFromAdmin(req);
    if (!admin) {
      if (isPublicVisibility(req.body?.config?.visible)) {
        return next(new HttpException(403, 'Solo un administrador puede convertir un informe en público'));
      }
      const current = await getStoredVisibility(req.params.id);
      if (isPublicVisibility(current)) {
        return next(new HttpException(403, 'No tienes permisos para modificar un informe público'));
      }
    }
    return originalUpdate.call(DashboardController, req, res, next);
  }) as any;

  const originalUpdateSpecific = DashboardController.updateSpecific;
  DashboardController.updateSpecific = (async function (req: Request, res: Response, next: NextFunction) {
    const admin = await isRequestFromAdmin(req);
    if (!admin) {
      const { key, newValue } = req.body?.data || {};
      if (key === 'config.visible' && isPublicVisibility(newValue)) {
        return next(new HttpException(403, 'Solo un administrador puede convertir un informe en público'));
      }
      const current = await getStoredVisibility(req.params.id);
      if (isPublicVisibility(current)) {
        return next(new HttpException(403, 'No tienes permisos para modificar un informe público'));
      }
    }
    return originalUpdateSpecific.call(DashboardController, req, res, next);
  }) as any;

  const originalDelete = DashboardController.delete;
  DashboardController.delete = (async function (req: Request, res: Response, next: NextFunction) {
    if (!(await isRequestFromAdmin(req))) {
      const current = await getStoredVisibility(req.params.id);
      if (isPublicVisibility(current)) {
        return next(new HttpException(403, 'No tienes permisos para eliminar un informe público'));
      }
    }
    return originalDelete.call(DashboardController, req, res, next);
  }) as any;

  const originalClone = DashboardController.clone;
  DashboardController.clone = (async function (req: Request, res: Response, next: NextFunction) {
    if (!(await isRequestFromAdmin(req))) {
      const current = await getStoredVisibility(req.params.id);
      if (isPublicVisibility(current)) {
        return next(new HttpException(403, 'No tienes permisos para clonar un informe público'));
      }
    }
    return originalClone.call(DashboardController, req, res, next);
  }) as any;
});
