import * as  express from 'express';
import { authGuard } from '../../guards/auth-guard';
import { roleGuard } from '../../guards/role-guard';
import { DataSourceController } from './datasource.controller';
import { DashboardController } from '../dashboard/dashboard.controller';

const router = express.Router();

/**
 * @openapi
 * /datasource/:
 *   get:
 *     description: get all datasources
 *     responses:
 *       200:
 *         description: returns all dashboards
 *       404:
 *         description: error loading datasources
 *     parameters:
 *     - in: path
 *       name: tags
 *       type: string
 *       required: false
 *       description: datasource tags

 */
router.get('', authGuard, roleGuard,  DataSourceController.GetDataSources);

/**
 * @openapi
 * /datasource/names:
 *   get:
 *     description: get all datasources
 *     responses:
 *       200:
 *         description: returns all dashboards names
 *       500:
 *         description: error loading datasources
 */
router.get('/names', authGuard,   roleGuard,  DataSourceController.GetDataSourcesNames);

/**
 * @openapi
 * /datasource/namesForDashboard:
 *   get:
 *     description: get all datasources names for dashboard, filtered by permits and users
 *     responses:
 *       200:
 *         description: returns all dashboards names available
 *       500:
 *         description: error loading datasources
 */
router.get('/namesForDashboard', authGuard,  DataSourceController.GetDataSourcesNamesForDashboard)

/**
 * @openapi
 * /datasource/namesForEdit:
 *   get:
 *     description: get all datasources names for dashboard, filtered by permits and users
 *     responses:
 *       200:
 *         description: returns all dashboards names available
 *       500:
 *         description: error loading datasources
 */
router.get('/namesForEdit', authGuard,  DataSourceController.GetDataSourcesNamesForEdit)

/**
 * @openapi
 * /datasource/check-connection:
 *   get:
 *     description: try connection with database
 *     responses:
 *       200:
 *         description: returns ok
 *       500:
 *         description: can´t connect to datasource
 */
router.get('/check-connection', authGuard,   roleGuard, DataSourceController.CheckConnection);

/**
 * @openapi
 * /datasource/check-connection:
 *   get:
 *     description: try connection with database for specific datasource
 *     responses:
 *       200:
 *         description: returns ok
 *       500:
 *         description: can´t connect to datasource
 */
router.get('/check-connection/:id', authGuard, roleGuard, DataSourceController.CheckStoredConnection);

/**
 * @openapi
 * /datasource/:id :
 *   get:
 *     description: get datasource by parameter
 *     responses:
 *       200:
 *         description: returns ok
 *       404:
 *         description: can´t find datasource
 */
router.get('/:id', authGuard,  roleGuard, DataSourceController.GetDataSourceById);

/**
 * @openapi
 * /datasource/add-data-source :
 *   post:
 *     description: add new datasource, adressing to bigquery type or any other
 *     responses:
 *       201:
 *         description: returns ok
 *       500:
 *         description: error saving the datasource
 */
router.post('/add-data-source/', authGuard,  roleGuard, DataSourceController.GenerateDataModel);

/**
 * @openapi
 * /datasource/query:
 *   post:
 *     description: execute the query of the panel
 *     responses:
 *       200:
 *         description: returns ok 
 *       500:
 *         description: returns error at querying by permits or by query error
 *      
 */
router.post('/query', authGuard,  roleGuard, DashboardController.execQuery);

/**
 * @openapi
 * /datasource/reload/:id:
 *   post:
 *     description: refresh datasource by id
 *     responses:
 *       200:
 *         description: returns ok 
 *       500:
 *         description: error updating or saving datasource
 *      
 */
router.post('/reload/:id', authGuard, roleGuard, DataSourceController.RefreshDataModel);

/**
 * @openapi
 * /datasource/remove-cache:
 *   post:
 *     description: remove cache from model
 *     responses:
 *       200:
 *         description: returns ok 
 *      
 */
router.post('/remove-cache', authGuard,  roleGuard, DataSourceController.removeCacheFromModel);

/**
 * @openapi
 * /datasource/:id:
 *   put:
 *     description: remove cache from model
 *     responses:
 *       200:
 *         description: datasource updated
 *       500:
 *         description: datasource not found
 *      
 */
router.put('/:id', authGuard,  roleGuard,DataSourceController.UpdateDataSource);

/**
 * @openapi
 * /datasource/:id:
 *   delete:
 *     description: remove datasource
 *     responses:
 *       200:
 *         description: datasource removed
 *       500:
 *         description: datasource not found, error removing datasource
 *      
 */
router.delete('/:id', authGuard,  roleGuard, DataSourceController.DeleteDataSource);

export default router;
