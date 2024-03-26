import * as  express from 'express';
import { authGuard } from '../../guards/auth-guard';
import { DashboardController } from './dashboard.controller';


const router = express.Router();

/**
 * @openapi
 * /dashboard/:
 *   get:
 *     description: Get all dashboards
 *     responses:
 *       200:
 *         description: Returns all dashboards
 *       400:
 *         description: Returns error trying to load all dashboards
 *     tags:
 *       - Dashboard Routes
 */
router.get('', authGuard,  DashboardController.getDashboards);

router.post('/clean-refresh', authGuard, DashboardController.cleanDashboardCache)

/**
 * @openapi
 * /dashboard/{id}:
 *   get:
 *     description: Returns a dashboard by it's ID
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Returns successfully the given dashboard
 *       500:
 *         description: Returns error trying to load the dashboard
 *     tags:
 *       - Dashboard Routes 
 */
router.get('/:id', authGuard, DashboardController.getDashboard);

/**
 * @openapi
 * /dashboard/:
 *   post:
 *     description: Create new dashboard
 *     parameters:
 *       - name: dashboard
 *         in: body
 *         required: true
 *         type: object
 *     responses:
 *       201:
 *         description: Returns ok and creates dashboard
 *       400:
 *         description: Returns error at creating dashboard
 *     tags:
 *       - Dashboard Routes
 */
router.post('', authGuard, DashboardController.create);

/**
 * @openapi
 * /dashboard/query:
 *   post:
 *     description: Execute the query of the current dashboard
 *     parameters:
 *       - name: query
 *         in: body
 *         required: false
 *         type: object
 *         readOnly: true
 *     responses:
 *       200:
 *         description: Returns ok, the query has been executed 
 *       500:
 *         description: Returns error trying to execute the query
 *     tags:
 *       - Dashboard Routes      
 */
router.post('/query', authGuard, DashboardController.execQuery);

/**
 * @openapi
 * /dashboard/getQuery:
 *   post:
 *     description: Creates the SQL query from the current panel (old)
 *     parameters:
 *       - name: query
 *         in: body
 *         required: false
 *         type: object
 *         readOnly: true
 *     responses:
 *       200:
 *         description: Returns ok, meaning the query has been successfully executed 
 *       500:
 *         description: Returns error, check your permissions and query syntax
 *     tags:
 *       - Dashboard Routes
 */
router.post('/getQuery', authGuard, DashboardController.getQuery);

/**
 * @openapi
 * /dashboard/sql-query:
 *   post:
 *     description: Executes a query from the SQL mode
 *     parameters:
 *       - name: query
 *         in: body
 *         required: false
 *         type: object
 *         readOnly: true
 *     responses:
 *       200:
 *         description: Returns ok, the query has been executed 
 *       500:
 *         description: Returns error, check your permissions and query syntax
 *     tags:
 *       - Dashboard Routes
 */
router.post('/sql-query', authGuard, DashboardController.execSqlQuery);

/**
 * @openapi
 * /dashboard/view-query:
 *   post:
 *     description: Creates the SQL query from the current panel
 *     parameters:
 *       - name: query
 *         in: body
 *         required: false
 *         type: object
 *         readOnly: true
 *     responses:
 *       200:
 *         description: Returns ok, SQL created 
 *       500:
 *         description: Returns error, check your permissions and query syntax
 *     tags:
 *       - Dashboard Routes
 */
router.post('/view-query', authGuard, DashboardController.execView)

/**
 * @openapi
 * /dashboard/{id} :
 *   put:
 *     description: Update or save a dashboard by its ID
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         type: string
 *       - name: dashboard
 *         in: body
 *         required: true
 *         type: object
 *     responses:
 *       200:
 *         description: Returns ok, saving complete 
 *       400:
 *         description: Dashboard does not exist
 *       500:
 *         description: Returns error, check your permissions and query syntax
 *     tags:
 *       - Dashboard Routes
 */
router.put('/:id', authGuard, DashboardController.update);

/**
 * @openapi
 * /dashboard/{id} :
 *   delete:
 *     description: Delete dashboard by it's ID
 *     parameters: 
 *       - name: id
 *         in: path
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Deleting process successfull 
 *       400:
 *         description: Dashboard does not exist
 *       500:
 *         description: Returns error, check your permissions and query syntax
 *     tags:
 *       - Dashboard Routes      
 */
router.delete('/:id', authGuard, DashboardController.delete);

export default router;
