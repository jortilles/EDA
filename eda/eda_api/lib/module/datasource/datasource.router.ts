import * as  express from 'express';
import { authGuard } from '../../guards/auth-guard';
import { roleGuard } from '../../guards/role-guard';
import { DataSourceController } from './datasource.controller';
import { DashboardController } from '../dashboard/dashboard.controller';

const router = express.Router();

router.get('', authGuard, roleGuard,  DataSourceController.GetDataSources);

router.get('/names', authGuard,   roleGuard,  DataSourceController.GetDataSourcesNames);

router.get('/namesForDashboard', authGuard,  DataSourceController.GetDataSourcesNamesForDashboard)

router.get('/namesForEdit', authGuard,  DataSourceController.GetDataSourcesNamesForEdit)

router.get('/check-connection', authGuard,   roleGuard, DataSourceController.CheckConnection);

router.get('/check-connection/:id', authGuard, roleGuard, DataSourceController.CheckStoredConnection);

router.get('/:id', authGuard,  roleGuard, DataSourceController.GetDataSourceById);

router.post('/add-data-source/', authGuard,  roleGuard, DataSourceController.GenerateDataModel);

router.post('/query', authGuard,  roleGuard, DashboardController.execQuery);

router.post('/reload/:id', authGuard, roleGuard, DataSourceController.RefreshDataModel);

router.post('/remove-cache', authGuard,  roleGuard, DataSourceController.removeCacheFromModel);

router.put('/:id', authGuard,  roleGuard,DataSourceController.UpdateDataSource);

router.delete('/:id', authGuard,  roleGuard, DataSourceController.DeleteDataSource);

export default router;
