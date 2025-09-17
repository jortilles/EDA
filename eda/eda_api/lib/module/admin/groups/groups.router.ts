import * as  express from 'express';
import { authGuard } from '../../../guards/auth-guard';
import { roleGuard } from '../../../guards/role-guard';
import { GroupController } from './group.controller';

const router = express.Router();

/**
 * @openapi
 * /admin/groups/:
 *   get: 
 *     description: Gets the list of all existing groups
 *     responses:
 *       200:
 *         description: Returns successfully the list of the groups.
 *       500:
 *         description: Server error trying to load the list of groups.
 *     tags:
 *       - Group Routes
 */
router.get('', authGuard, roleGuard, GroupController.getGroups);

/**
 * @openapi
 * /admin/groups/mine:
 *   get: 
 *     description: Gets all the groups where the logged user belongs
 *     responses:
 *       200:
 *         description: Returns the groups where the current user belongs
 *       500:
 *         description: Error trying to load the groups
 *     tags:
 *       - Group Routes
 */
router.get('/mine', authGuard, GroupController.getMineGroups);

/**
 * @openapi
 * /admin/groups/{id}: 
 *   get: 
 *     description: Get a group by its database id
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Returns the group by the given id
 *       400:
 *         description: Error trying to load the group, does the group exist? 
 *     tags:
 *       - Group Routes
 */
router.get('/:id', authGuard, roleGuard, GroupController.getGroup);

/**
 * @openapi
 * /admin/groups/ : 
 *   post: 
 *     description: Create a new security group by request parameters
 *     parameters:
 *       - name: group
 *         in: body
 *         required: true
 *         type: object
 *     responses:
 *       201:
 *         description: Group created successfully
 *       400:
 *         description: An error occurred trying to create the group
 *     tags:
 *       - Group Routes
 */
//Preguntar como considerar los arrays de _ids ya que son un ObjectId("string")
router.post('', authGuard, roleGuard, GroupController.createGroup);

/**
 * @openapi
 * /admin/groups/{id}: 
 *   put: 
 *     description: Modify an existing security group by request parameters
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         type: string
 *       - name: group
 *         in: body
 *         required: true
 *         type: object
 *     responses:
 *       200:
 *         description: Group saved successfully
 *       400:
 *         description: The id given was not found in the groups table
 *       500:
 *         description: Server error trying to find the group by the given id
 *     tags:
 *       - Group Routes
 */
router.put('/:id', authGuard, roleGuard, GroupController.updateGroup);

/**
 * @openapi
 * /admin/groups/{id}: 
 *   delete: 
 *     description: Delete a security group by its current database id
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         type: string     
 *     responses:
 *       200:
 *         description: Group has been successfully erased
 *       400:
 *         description: Group hasn't been found
 *       500:
 *         description: A server error occcurred trying to delete the group
 *     tags:
 *       - Group Routes
 */
router.delete('/:id', authGuard, roleGuard, GroupController.deleteGroup);

export default router;
