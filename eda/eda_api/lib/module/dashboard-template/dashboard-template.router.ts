import * as express from 'express';
import { authGuard } from '../../guards/auth-guard';
import { DashboardTemplateController } from './dashboard-template.controller';

const router = express.Router();

router.get('', authGuard, DashboardTemplateController.getTemplates);

router.get('/:id', authGuard, DashboardTemplateController.getTemplate);

router.post('/from-dashboard', authGuard, DashboardTemplateController.createTemplateFromDashboard);

router.post('', authGuard, DashboardTemplateController.createTemplateFromConfig);

router.put('/:id', authGuard, DashboardTemplateController.updateTemplate);

router.delete('/:id', authGuard, DashboardTemplateController.deleteTemplate);

router.post('/:id/create-dashboard', authGuard, DashboardTemplateController.createDashboardFromTemplate);

router.put('/:id/use', authGuard, DashboardTemplateController.updateTemplateUsage);

export default router;
