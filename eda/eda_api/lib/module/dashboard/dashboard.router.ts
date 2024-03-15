import * as  express from 'express';
import { authGuard } from '../../guards/auth-guard';
import { DashboardController } from './dashboard.controller';

const router = express.Router();

/**
 * @openapi
 * /dashboard/:
 *   get:
 *     description: get all dashboards
 *     responses:
 *       200:
 *         description: retorns all dashboards
 *       400:
 *         description: retorns error to load dashboards
 */
router.get('', authGuard,  DashboardController.getDashboards);

router.post('/clean-refresh', authGuard, DashboardController.cleanDashboardCache)

/**
 * @openapi
 * /dashboard/:id:
 *   get:
 *     description: returns dashboard by parametro
 *     responses:
 *       200:
 *         description: retorns dashboard
 *       500:
 *         description: retorns error on load dashboard, being by permit or not existing 
 */
router.get('/:id', authGuard, DashboardController.getDashboard);

/**
 * @openapi
 * /dashboard/:
 *   post:
 *     description: create new dashboard
 *     responses:
 *       201:
 *         description: retorns ok and creates dashboard
 *       400:
 *         description: retorns error at creating dashboard
 */
router.post('', authGuard, DashboardController.create);

/**
 * @openapi
 * /dashboard/query:
 *   post:
 *     description: execute the query of the panel
 *     responses:
 *       200:
 *         description: returns ok 
 *       500:
 *         description: returns error at querying by permisos o by consult error
 *      
 */
router.post('/query', authGuard, DashboardController.execQuery);

/**
 * @openapi
 * /dashboard/getQuey:
 *   post:
 *     description: returns the panel query  
 *     responses:
 *       200:
 *         description: retorns ok 
 *       500:
 *         description: retorns error by permisos or query error
 *      
 */
router.post('/getQuey', authGuard, DashboardController.getQuery);

/**
 * @openapi
 * /dashboard/sql-query:
 *   post:
 *     description: executes a query from SQL mode 
 *     responses:
 *       200:
 *         description: retorns ok 
 *       500:
 *         description: retorns error by permisos or query error
 *      
 */
router.post('/sql-query', authGuard, DashboardController.execSqlQuery);

/**
 * @openapi
 * /dashboard/view-query:
 *   post:
 *     description: creates the SQL query from panel
 *     responses:
 *       200:
 *         description: returns ok 
 *       500:
 *         description: returns error  by permisos or query error
 *      
 */
router.post('/view-query', authGuard, DashboardController.execView)

/**
 * @openapi
 * /dashboard/:id :
 *   put:
 *     description: update / save dashboard
 *     responses:
 *       200:
 *         description: returns ok 
 *       400:
 *         description: dashboard non existenting
 *       500:
 *         description: returns error  by permisos or query error
 *      
 */
router.put('/:id', authGuard, DashboardController.update);

/**
 * @openapi
 * /dashboard/:id :
 *   delete:
 *     description: erase dashboard
 *     responses:
 *       200:
 *         description: retorns ok 
 *       400:
 *         description: dashboard non existenting
 *       500:
 *         description: returns error  by permisos or query error
 *      
 */
router.delete('/:id', authGuard, DashboardController.delete);

export default router;
