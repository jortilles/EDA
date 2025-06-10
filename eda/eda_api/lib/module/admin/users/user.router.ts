
import * as  express from 'express';
import { authGuard } from '../../../guards/auth-guard';
import { roleGuard } from '../../../guards/role-guard';
import {originGuard} from '../../../guards/origin-guard';
import { UserController } from './user.controller';
const router = express.Router();

// Login routes

/**
 * @openapi
 * /admin/user/login:
 *   post:
 *     description: Post login with user and password within the request of the form.
 *     parameters:
 *       - name: email
 *         in: formData
 *         required: true
 *         type: string
 *       - name: password
 *         in: formData
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: App user login successful.
 *       400:
 *         description: App user not found or wrong parameters.
 *       500:
 *         description: Server error.
 *     tags:
 *       - User Routes
 */
router.post('/login', UserController.login);
router.get('/fake-login/:usermail/:token', originGuard, UserController.provideToken );
router.post('/sso', UserController.singleSingnOn)


// User Routes // Role Guard
// router.get('', authGuard, roleGuard, UserController.getUsers);

/**
 * @openapi
 * /admin/user/{idarray}:
 *   get: 
 *     description: Retrieve users by their IDs 
 *     parameters:
 *       - name: id array
 *         in: path
 *         required: true
 *         type: array
 *     responses:
 *       200:
 *         description: Retrieved all the users stored in the database found by the api.
 *       500: 
 *         description: Server error trying to retrieve the user.
 *       401: 
 *         description: Server error, you are unauthorized.
 *     tags:
 *       - User Routes
 */

router.get('', authGuard,  UserController.getUsers);

router.get('/profile-img/:img', authGuard, UserController.findProfileImg);

router.get('/refresh-token', authGuard, UserController.refreshToken);

/**
 * @openapi
 * /admin/user/is-admin/{id}:
 *   get: 
 *     description: Return a boolean checking if the user found by the database is administrator.
 *     parameters: 
 *       - name: id
 *         in: path
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Returns true and the user is marked as admin. 
 *       500:
 *         description: User not found with this id or error waiting for other groups.
 *     tags:
 *       - User Routes
 */
router.get('/is-admin/:id', authGuard, UserController.getIsAdmin);

/**
 * @openapi
 * /admin/user/is-datasource-creator/{id}:
 *   get: 
 *     description: Return a boolean checking if the user found by the database is a datasource creator.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         type: string 
 *     responses:
 *       200:
 *         description: Returns true and the user is marked as datasource creator 
 *       500:
 *         description: User not found with this id or error waiting for other groups
 *     tags:
 *       - User Routes
 */
router.get('/is-datasource-creator/:id', authGuard, UserController.getIsDataSourceCreator);

/**
 * @openapi
 * /admin/user/:
 *   post: 
 *     description: Creates the user with the request parameters, if this already exists then it's updated with that information.
 *     parameters:
 *       - in: formData
 *         name: name
 *         description: User name
 *         required: true
 *         schema:
 *           type: string
 *       - in: formData
 *         name: email
 *         description: Email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *       - in: formData
 *         name: password
 *         description: Password
 *         required: true
 *         schema:
 *           type: string
 *       - in: formData
 *         name: img
 *         description: Image Route
 *         required: false
 *         schema:
 *           type: string
 *       - in: formData
 *         name: role
 *         description: Rol del usuario
 *         type: array
 *     responses:
 *       201:
 *         description: Returns true, creation/updating process successful. 
 *       400:
 *         description: An error occurred trying to update nor create.
 *     tags:
 *       - User Routes
 */
router.post('', authGuard, UserController.create);


/** 
 * @openapi
 * /admin/user/{id}:
 *   get: 
 *     description: Retrieves a user from the database found by it's id.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Returns true, the process of returning the user has been successful.
 *       500:
 *         description: Can not find the user or role.
 *     tags:
 *       - User Routes
 */
router.get('/:id', authGuard,  roleGuard,  UserController.getUser);

/**
 * @openapi
 * /admin/user/me/{id}:
 *   put: 
 *     description: Updates the user with the request parameters. Needs an existing id.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         type: string
 *       - in: formData
 *         name: name
 *         description: User name
 *         required: true
 *         schema:
 *           type: string
 *       - in: formData
 *         name: email
 *         description: Email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *       - in: formData
 *         name: password
 *         description: Password
 *         schema:
 *           type: string
 *       - in: formData
 *         name: img
 *         description: Image Route
 *         schema:
 *           type: string
 *       - in: formData
 *         name: role
 *         description: Roles
 *         type: array
 *     responses:
 *       200:
 *         description: Returns true and saves the user.
 *       500:
 *         description: Can not find the user/role.
 *     tags:
 *       - User Routes
 */
router.put('/me/:id', authGuard, UserController.update);

// Role Guard
/**
 * @openapi
 * /admin/user/management/{id}:
 *   put: 
 *     description: At management page, update the user with the request parameters. Needs an existing id.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         type: string
 *       - in: formData
 *         name: name
 *         description: User name
 *         required: true
 *         schema:
 *           type: string
 *       - in: formData
 *         name: email
 *         description: Email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *       - in: formData
 *         name: password
 *         description: Password
 *         schema:
 *           type: string
 *       - in: formData
 *         name: img
 *         description: Image Route
 *         schema:
 *           type: string
 *       - in: formData
 *         name: role
 *         description: Roles
 *         type: array
 *     responses:
 *       200:
 *         description: Returns true and saves the user.
 *       500:
 *         description: Can not find the user/role.
 *     tags:
 *       - User Routes
 */
router.put('/management/:id', authGuard, roleGuard, UserController.update);

/**
 * @openapi
 * /admin/user/{id}:
 *   delete: 
 *     description: Deletes the user by the requested id.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Returns true, meaning the successful deletion of the user
 *       400:
 *         description: The user was not found in the deleting process
 *       500:
 *         description: Can't delete this user
 *     tags:
 *       - User Routes
 */
router.delete('/:id', authGuard, roleGuard, UserController.delete);


export default router;
