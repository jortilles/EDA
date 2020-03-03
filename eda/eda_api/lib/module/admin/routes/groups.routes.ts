import * as  express from 'express';
import { authGuard } from '../../../guards/auth-guard';
import { roleGuard } from '../../../guards/role-guard';
import { GroupController } from '../controller/group.controller';
const router = express.Router();

router.get('', authGuard, roleGuard, GroupController.getGroups);

router.get('/mine', authGuard, GroupController.getMineGroups);

router.get('/:id', authGuard, roleGuard, GroupController.getGroup);

router.post('', authGuard, roleGuard, GroupController.createGroup);

router.put('/:id', authGuard, roleGuard, GroupController.updateGroup);

router.delete('/:id', authGuard, roleGuard, GroupController.deleteGroup);

export = router;
