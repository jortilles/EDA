
import express from 'express';
import UserRouter from './users/user.router';
import GroupsRouter from './groups/groups.router';

const router = express.Router();

router.use('/user', UserRouter);

router.use('/groups', GroupsRouter);

export default router;