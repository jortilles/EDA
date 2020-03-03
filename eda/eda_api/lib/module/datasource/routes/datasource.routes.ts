import * as  express from 'express';
import { authGuard } from '../../../guards/auth-guard';
import { roleGuard } from '../../../guards/role-guard';
import { DataSourceController } from '../controller/datasource.controller';
import { DashboardController } from '../../dashboard/controller/dashboard.controller';
const router = express.Router();

router.get('', authGuard, DataSourceController.GetDataSources);

router.get('/names', authGuard,  DataSourceController.GetDataSourcesNames);

router.get('/check-connection', authGuard, roleGuard, DataSourceController.CheckConnection);

router.get('/:id', authGuard, roleGuard, DataSourceController.GetDataSourceById);

router.post('', authGuard, roleGuard, DataSourceController.GenerateDataModel);

router.post('/query', authGuard, roleGuard, DashboardController.execQuery);

router.post('/reload/:id', authGuard, roleGuard, DataSourceController.RefreshDataModel);

router.put('/:id', authGuard, roleGuard, DataSourceController.UpdateDataSource);

router.delete('/:id', authGuard, roleGuard, DataSourceController.DeleteDataSource);

export = router;
