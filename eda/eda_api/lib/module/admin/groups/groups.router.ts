import * as  express from 'express';
import { authGuard } from '../../../guards/auth-guard';
import { roleGuard } from '../../../guards/role-guard';
import { GroupController } from './group.controller';

const router = express.Router();

/**
 * @openapi
 * /admin/groups/:
 *   get: 
 *     description: get all groups
 *     responses:
 *       200:
 *         description: retorna grupos
 *       500:
 *         description: error loading groups
 */
router.get('', authGuard, roleGuard, GroupController.getGroups);

/**
 * @openapi
 * /admin/groups/mine:
 *   get: 
 *     description: get all groups of the ongoing user
 *     responses:
 *       200:
 *         description: retorn grupos 
 *       500:
 *         description: error loading groups
 */
router.get('/mine', authGuard, GroupController.getMineGroups);

/**
 * @openapi
 * /admin/groups/:id : 
 *   get: 
 *     description: get group by id
 *     responses:
 *       200:
 *         description: retorna group
 *       400:
 *         description: error loading group
 */
router.get('/:id', authGuard, roleGuard, GroupController.getGroup);

/**
 * @openapi
 * /admin/groups/ : 
 *   post: 
 *     description: create new security group
 *     responses:
 *       201:
 *         description: group created correctly
 *       400:
 *         description: some error ocurred while creating the group
 */
router.post('', authGuard, roleGuard, GroupController.createGroup);

/**
 * @openapi
 * /admin/groups/:id : 
 *   put: 
 *     description: modify security group
 *     responses:
 *       200:
 *         description: group saved correctly
 *       400:
 *         description: group with id not found
 *       500:
 *         description: group not found
 */
router.put('/:id', authGuard, roleGuard, GroupController.updateGroup);

/**
 * @openapi
 * /admin/groups/:id : 
 *   delete: 
 *     description: delete security group
 *     responses:
 *       200:
 *         description: group erased correctly
 *       400:
 *         description: group with id not found
 *       500:
 *         description: error erasing group
 */
router.delete('/:id', authGuard, roleGuard, GroupController.deleteGroup);

export default router;
