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
 *     description: Post login with user and password
 *     responses:
 *       200:
 *         description: App user login ok
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
 *     description: get all users
 *     responses:
 *       200:
 *         description: return all users from api
 *       500: 
 *         description: error loading users
 */
router.get('', authGuard,  UserController.getUsers);


router.get('/profile-img/:img', authGuard, UserController.findProfileImg);

router.get('/refresh-token', authGuard, UserController.refreshToken);

/**
 * @openapi
 * /admin/user/is-admin/:id:
 *   get: 
 *     description: consult if user is admin
 *     responses:
 *       200:
 *         description: returns true 
 *       500:
 *         description: User not found with this id or error waiting for other groups
 */
router.get('/is-admin/:id', authGuard, UserController.getIsAdmin);

/**
 * @openapi
 * /admin/user/is-datasource-creator/:id:
 *   get: 
 *     description: consult if parameter user is datasource creator 
 *     responses:
 *       200:
 *         description: retorns true 
 *       500:
 *         description: user not found with this id or error waiting for other groups
 */
router.get('/is-datasource-creator/:id', authGuard, UserController.getIsDataSourceCreator);

/**
 * @openapi
 * /admin/user/:
 *   post: 
 *     description: save / update user
 *     responses:
 *       201:
 *         description: returns true 
 *       400:
 *         description: error at saving
 */
router.post('', authGuard, UserController.create);

// Role Guard
/**
 * @openapi
 * /admin/user/:id:
 *   get: 
 *     description: get user by parameter
 *     responses:
 *       200:
 *         description: retorns user
 *       500:
 *         description: can´t find user / user role
 */
router.get('/:id', authGuard,  roleGuard,  UserController.getUser);

/**
 * @openapi
 * /admin/user/me/:id:
 *   put: 
 *     description: update user by parameter
 *     responses:
 *       200:
 *         description: retorns true and save
 *       500:
 *         description: can´t find user / user role
 * 
 */
router.put('/me/:id', authGuard, UserController.update);

// Role Guard
/**
 * @openapi
 * /admin/user/management/:id:
 *   put: 
 *     description: update users by parameter at management page
 *     responses:
 *       200:
 *         description: retorns true and save
 *       400:
 *         description: user not found
 *       500:
 *         description: can´t update user
 */
router.put('/management/:id', authGuard, roleGuard, UserController.update);

/**
 * @openapi
 * /admin/user/:id:
 *   delete: 
 *     description: delete user by parameter
 *     responses:
 *       200:
 *         description: retorna true y salva
 *       400:
 *         description: user not found
 *       500:
 *         description: can´t delete user
 */
router.delete('/:id', authGuard, roleGuard, UserController.delete);


export default router;
