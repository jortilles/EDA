import * as  express from 'express';
import { authGuard } from '../../guards/auth-guard';
import { roleGuard } from '../../guards/role-guard';
import { DataSourceController } from './datasource.controller';
import { DashboardController } from '../dashboard/dashboard.controller';

const router = express.Router();

router.get('', authGuard, DataSourceController.GetDataSources);

router.get('/names', authGuard,  DataSourceController.GetDataSourcesNames);

router.get('/check-connection', authGuard, roleGuard, DataSourceController.CheckConnection);

router.get('/check-connection/:id', authGuard, roleGuard, DataSourceController.CheckStoredConnection);

router.get('/:id', authGuard, roleGuard, DataSourceController.GetDataSourceById);

router.post('/add-data-source/:optimize', authGuard, roleGuard, DataSourceController.GenerateDataModel);

router.post('/query', authGuard, roleGuard, DashboardController.execQuery);

router.post('/reload/:id', authGuard, roleGuard, DataSourceController.RefreshDataModel);

router.put('/:id', authGuard, roleGuard, DataSourceController.UpdateDataSource);

router.delete('/:id', authGuard, roleGuard, DataSourceController.DeleteDataSource);

export default router;
