import * as express from 'express';
import { authGuard } from '../../guards/auth-guard';
import { AiController } from './ai.controller';

const router = express.Router();

router.post('/response', authGuard, AiController.aIresponse);

router.get('/available', authGuard, AiController.aIavailable);

router.post('/prompt', authGuard, AiController.aIprompt);

router.get('/config', authGuard, AiController.aIgetConfig);

router.post('/config', authGuard, AiController.aIsaveConfig);


export default router;