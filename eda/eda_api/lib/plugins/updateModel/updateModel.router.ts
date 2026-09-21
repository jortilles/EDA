import express from 'express';
import {updateModel} from './updateModel.controller';
import {updateModelGuard} from './updateModel-guard';

const router = express.Router();

router.get('/update',  updateModelGuard,  updateModel.update);

export default router;
