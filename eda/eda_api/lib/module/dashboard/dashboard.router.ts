import * as  express from 'express';
import { authGuard } from '../../guards/auth-guard';
import { DashboardController } from './dashboard.controller';

const router = express.Router();

/**
 * @openapi
 * /dashboard/:
 *   get:
 *     description: get all dashboards
 *     parameters:
 *     - in: query
 *       name: token
 *       required: true 
 *       description: authorization token
 *     - in: query
 *       name: tags
 *       type: string
 *       required: false
 *       description: dashboard tags
 *     - in: query
 *       name: external
 *       type: object
 *       required: false
 *       description: dashboard external tags
 *     responses:
 *       200:
 *         description: retrns all dashboards
 *       400:
 *         description: returns error to load dashboards
 *     tags:
 *       - Dashboard Routes
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
 *         description: returns dashboard
 *       500:
 *         description: returns error on load dashboard, being by permit or not existing 
 *     tags:
 *       - Dashboard Routes
 */
router.get('/:id', authGuard, DashboardController.getDashboard);

/**
 * @openapi
 * /dashboard/:
 *   post:
 *     description: create new dashboard
 *     parameters:
 *     - in: query
 *       name: token
 *       required: true 
 *       description: authorization token
 *     - in: body
 *       name: new dashboard
 *       description: introduce body for new dashboard
 *       schema:
 *         type: object
 *         properties:
 *           config: 
 *             type: object
 *             properties:
 *               ds: 
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                     example: "INTRODUCE VALID _id"
 *               external:
 *                 type: object
 *                 example: {"xxxx" : "xxxx"}
 *               refreshTime:
 *                 type: number
 *                 example: null
 *               styles:
 *                 type: object
 *                 properties:
 *                   backgroundColor:
 *                     type: string
 *                     example: "#f1f0f0"    
 *                   customCss:
 *                     type: string
 *                     example: ""     
 *                   filters:
 *                     type: object
 *                     properties:
 *                       fontColor: 
 *                         type: string
 *                         example: "#455a64"
 *                       fontSize: 
 *                         type: number
 *                         example: 0
 *                       fontFamily: 
 *                         type: string
 *                         example: "Questrial" 
 *                   panelColor:
 *                     type: string
 *                     example: "#ffffff"
 *                   panelContent:
 *                     type: object
 *                     properties:
 *                       fontColor: 
 *                         type: string
 *                         example: "#455a64"
 *                       fontSize: 
 *                         type: number
 *                         example: 0
 *                       fontFamily: 
 *                         type: string
 *                         example: "Questrial"    
 *                   panelTitle:
 *                     type: object
 *                     properties:
 *                       fontColor: 
 *                         type: string
 *                         example: "#455a64"
 *                       fontSize: 
 *                         type: number
 *                         example: 0
 *                       fontFamily: 
 *                         type: string
 *                         example: "Questrial"  
 *                   panelTitleAlign:
 *                     type: string
 *                     example: "left"
 *                   titleAlign:
 *                     type: string
 *                     example: "center"
 *                   title:
 *                     type: object
 *                     properties:
 *                       fontColor: 
 *                         type: string
 *                         example: "#455a64"
 *                       fontSize: 
 *                         type: number
 *                         example: 0
 *                       fontFamily: 
 *                         type: string
 *                         example: "Questrial"  
 *               title:
 *                 type: string
 *                 example: "new_dashboard"
 *               visible:
 *                 type: string
 *                 example: "private" 
 *     responses:
 *       201:
 *         description: returns ok and creates dashboard
 *       400:
 *         description: returns error at creating dashboard
 *     tags:
 *       - Dashboard Routes
 *definitions:
 *  styles:
 *    type: object
 *    properties:
 *      backgroundColor:
 *        example: #f1f0f0
 */
router.post('', authGuard, DashboardController.create);

/**
* @openapi
* /dashboard/query:
*   post:
*     description: execute the query of the panel
*     parameters:
*     - in: query
*       name: token
*       required: true 
*       description: authorization token
*     - in: query
*       name: properties
*       type: object
*       required: false 
*       description: properties tags JSON
*     responses:
*       200:
*         description: returns ok 
*       500:
*         description: returns error at querying by permisos o by consult error      
*     tags:
*       - Dashboard Routes
*/
router.post('/query', authGuard, DashboardController.execQuery);

/**
 * @openapi
 * /dashboard/getQuey:
 *   post:
 *     description: returns the panel query  
 *     responses:
 *       200:
 *         description: returns ok 
 *       500:
 *         description: returns error by permisos or query error      
 *     tags:
 *       - Dashboard Routes
 */
router.post('/getQuey', authGuard, DashboardController.getQuery);

/**
 * @openapi
 * /dashboard/sql-query:
 *   post:
 *     description: executes a query from SQL mode 
 *     responses:
 *       200:
 *         description: returns ok 
 *       500:
 *         description: returns error by permisos or query error
 *     tags:
 *       - Dashboard Routes
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
 *     tags:
 *       - Dashboard Routes
 */
router.post('/view-query', authGuard, DashboardController.execView)

/**
 *@openapi
 * /dashboard/:id :
*    put:
*      description: update / save dashboard
*      consumes:
*        - application/json
*      parameters:
*        - in: query
*          name: id
*          required: true
*          schema:
*          type: string
*          description: ID del deshaboard a actualizar
*      responses:
*        '200':
*          description: OK
*        '400':
*          description: Dashboard no existente
*        '500':
*          description: Error debido a permisos o error de consulta
*      tags:
*        - Dashboard Routes
 */     
router.put('/:id', authGuard, DashboardController.update);

/**
 * @openapi
 * /dashboard/:id :
 *   delete:
 *     description: erase dashboard
 *     responses:
 *       200:
 *         description: returns ok 
 *       400:
 *         description: dashboard non existenting
 *       500:
 *         description: returns error  by permisos or query error     
 *     tags:
 *       - Dashboard Routes
 */
router.delete('/:id', authGuard, DashboardController.delete);

export default router;
