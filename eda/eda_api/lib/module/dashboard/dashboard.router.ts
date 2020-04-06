import * as  express from 'express';
import { authGuard } from '../../guards/auth-guard';
import { DashboardController } from './dashboard.controller';

const router = express.Router();

router.get('', authGuard,  DashboardController.getDashboards);

router.get('/:id', authGuard, DashboardController.getDashboard);

router.post('', authGuard, DashboardController.create);

router.post('/query', authGuard, DashboardController.execQuery);

router.put('/:id', authGuard, DashboardController.update);

router.delete('/:id', authGuard, DashboardController.delete);

export default router;
