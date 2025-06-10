
import express from 'express';
import UserRouter from './users/user.router';
import GroupsRouter from './groups/groups.router';
import LogRouter from './log/log.router';

const router = express.Router();

router.use('/user', UserRouter);

router.use('/groups', GroupsRouter);

router.use('/groups', GroupsRouter);

router.use('/log', LogRouter);



export default router;