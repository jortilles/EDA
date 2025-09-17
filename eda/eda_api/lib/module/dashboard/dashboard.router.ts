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
 *         description: returns all dashboards
 *       400:
 *         description: returns error to load dashboards
 *     tags:
 *       - Dashboard Routes
 */
router.get('', authGuard,  DashboardController.getDashboards);

router.post('/clean-refresh', authGuard, DashboardController.cleanDashboardCache)

/**
 * @openapi
 * /dashboard/{id}:
 *   get:
 *     description: returns dashboard by parameter
 *     parameters:
 *     - in: query
 *       name: token
 *       required: true 
 *       description: authorization token
 *     - in: path
 *       name: id
 *       required: true 
 *       description: dashboard id
 *     - in: query
 *       name: cnproperties
 *       type: object
 *       required: false
 *       description: Properties to be pushed to the database connection
 *     - in: query
 *       name: hideWheel
 *       type: boolean
 *       required: false
 *       description: booolean (true/false) to inform to hide the control wheel
 *     - in: query
 *       name: panelMode
 *       type: boolean
 *       required: false
 *       description: booolean (true/false) to inform show only panels
 *     - in: query
 *       name: cnproperties
 *       type: object
 *       required: false
 *       description: Properties to be pushed to the database connection
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
 *                     example: "INTRODUCE VALID DATASOURCE _id"
 *               external:
 *                 type: object
 *                 example: {}
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
 */
router.post('', authGuard, DashboardController.create);

/**
* @openapi
* /dashboard/query:
*   post:
*     description: execute the query of the panel
*     parameters: 
*       - name: token
*         in: query
*         description: Authentication token
*         type: string 
*       - name: query
*         in: body
*         required: true
*         type: object
*         description: Query configuration
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
 *     parameters: 
 *       - name: token
 *         in: query
 *         description: Authentication token
 *         type: string 
 *       - name: query
 *         in: body
 *         required: true
 *         type: object
 *         description: Query configuration
 *     responses:
 *       200:
 *         description: returns ok 
 *       500:
 *         description: returns error by permisos or query error      
 *     tags:
 *       - Dashboard Routes
 */
router.post('/getQuery', authGuard, DashboardController.getQuery);

/**
 * @openapi
 * /dashboard/sql-query:
 *   post:
 *     description: executes a query from SQL mode 
 *     parameters: 
 *       - name: token
 *         in: query
 *         description: Authentication token
 *         type: string 
 *       - name: query
 *         in: body
 *         required: true
 *         type: object
 *         description: Query configuration
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
 *     parameters: 
 *       - name: token
 *         in: query
 *         description: Authentication token
 *         type: string 
 *       - name: query
 *         in: body
 *         required: true
 *         type: object
 *         description: Query configuration
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

/*SDA CUSTOM*/ router.put('/:id/updateSpecific', authGuard, DashboardController.updateSpecific);

/*SDA CUSTOM*/ router.post('/:id/clone', authGuard, DashboardController.clone);

export default router;
