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
 *         in: Email
 *         required: true
 *         type: string
 *       - name: password
 *         in: Password
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: App user login successful.
 *       400:
 *         description: App user not found or wrong parameters.
 *       500:
 *         description: Server error.
 */
router.post('/login', UserController.login);
router.get('/fake-login/:usermail/:token', originGuard, UserController.provideToken );
router.post('/sso', UserController.singleSingnOn)


// User Routes // Role Guard
// router.get('', authGuard, roleGuard, UserController.getUsers);

/**
 * @openapi
 * /admin/user/:
 *   get: 
 *     description: Gets all the users of the database found by the api.
 *     responses:
 *       200:
 *         description: Retrieved all the users stored in the database found by the api.
 *       500: 
 *         description: Server error trying to retrieve all the users.
 */
router.get('', authGuard,  UserController.getUsers);


router.get('/profile-img/:img', authGuard, UserController.findProfileImg);

router.get('/refresh-token', authGuard, UserController.refreshToken);

/**
 * @openapi
 * /admin/user/is-admin/:id:
 *   get: 
 *     description: Return a boolean checking if the user found by the database is administrator.
 *     parameters: 
 *       - name: id
 *         in: User id
 *         required: true
 *         type: integer
 *     responses:
 *       200:
 *         description: Returns true and the user is marked as admin. 
 *       500:
 *         description: User not found with this id or error waiting for other groups.
 */
router.get('/is-admin/:id', authGuard, UserController.getIsAdmin);

/**
 * @openapi
 * /admin/user/is-datasource-creator/:id:
 *   get: 
 *     description: Return a boolean checking if the user found by the database is a datasource creator.
 *     parameters:
 *       - name: id
 *         in: User id
 *         required: true
 *         type: integer 
 *     responses:
 *       200:
 *         description: Returns true and the user is marked as datasource creator 
 *       500:
 *         description: User not found with this id or error waiting for other groups
 */
router.get('/is-datasource-creator/:id', authGuard, UserController.getIsDataSourceCreator);

/**
 * @openapi
 * /admin/user/:
 *   post: 
 *     description: Creates the user with the request parameters, if this already exists then it's updated with that information.
 *     parameters:
 *       - name: name
 *         in: Username
 *         required: true
 *         type: string
 *       - name: email
 *         in: Email
 *         required: true
 *         type: string
 *       - name: password
 *         in: Password
 *         required: true
 *         type: string
 *       - name: img
 *         in: Image
 *         type: string
 *       - name: role
 *         in: Roles
 *         type: string array
 *     responses:
 *       201:
 *         description: Returns true, creation/updating process successful. 
 *       400:
 *         description: An error occurred trying to update nor create. 
 */
router.post('', authGuard, UserController.create);

// Role Guard
/**
 * @openapi
 * /admin/user/:id:
 *   get: 
 *     description: Retrieves a user from the database found by it's id.
 *     parameters:
 *       - name: id
 *         in: User id
 *         required: true
 *         type: integer 
 *     responses:
 *       200:
 *         description: Returns true, the process of returning the user has been successful.
 *       500:
 *         description: Can not find the user or role.
 */
router.get('/:id', authGuard,  roleGuard,  UserController.getUser);

/**
 * @openapi
 * /admin/user/me/:id:
 *   put: 
 *     description: Updates the user with the request parameters. Needs an existing id.
 *     parameters:
 *       - name: id
 *         in: User id
 *         required: true
 *         type: integer
 *       - name: name
 *         in: Username
 *         required: true
 *         type: string
 *       - name: email
 *         in: Email
 *         required: true
 *         type: string
 *       - name: password
 *         in: Password
 *         required: true
 *         type: string
 *       - name: img
 *         in: Image
 *         type: string
 *       - name: role
 *         in: Roles
 *         type: string array
 *     responses:
 *       200:
 *         description: Returns true and saves the user.
 *       500:
 *         description: Can not find the user/role.
 */
router.put('/me/:id', authGuard, UserController.update);

// Role Guard
/**
 * @openapi
 * /admin/user/management/:id:
 *   put: 
 *     description: At management page, update the user with the request parameters. Needs an existing id.
 *     parameters:
 *       - name: id
 *         in: User id
 *         required: true
 *         type: integer
 *       - name: name
 *         in: Username
 *         required: true
 *         type: string
 *       - name: email
 *         in: Email
 *         required: true
 *         type: string
 *       - name: password
 *         in: Password
 *         required: true
 *         type: string
 *       - name: img
 *         in: Image
 *         type: string
 *       - name: role
 *         in: Roles
 *         type: string array
 *     responses:
 *       200:
 *         description: Returns true and saves the user.
 *       500:
 *         description: Can not find the user/role.
 */
router.put('/management/:id', authGuard, roleGuard, UserController.update);

/**
 * @openapi
 * /admin/user/:id:
 *   delete: 
 *     description: Deletes the user by the requested id.
 *     parameters:
 *       - name: id
 *         in: User id
 *         required: true
 *         type: integer
 *     responses:
 *       200:
 *         description: Returns true meaning the successful deletion of the user.
 *       400:
 *         description: User has not been found.
 *       500:
 *         description: Can't delete this user.
 */
router.delete('/:id', authGuard, roleGuard, UserController.delete);


export default router;
