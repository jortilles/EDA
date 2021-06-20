import * as  express from 'express';
import { authGuard } from '../../guards/auth-guard';
import { DashboardController } from './dashboard.controller';

const router = express.Router();

router.get('', authGuard,  DashboardController.getDashboards);

router.post('/clean-refresh', authGuard, DashboardController.cleanDashboardCache)

router.get('/:id', authGuard, DashboardController.getDashboard);

router.post('', authGuard, DashboardController.create);

router.post('/query', authGuard, DashboardController.execQuery);

router.post('/getQuey', authGuard, DashboardController.getQuery);

router.post('/sql-query', authGuard, DashboardController.execSqlQuery);

router.post('/view-query', authGuard, DashboardController.execView)

router.put('/:id', authGuard, DashboardController.update);

router.delete('/:id', authGuard, DashboardController.delete);

export default router;
