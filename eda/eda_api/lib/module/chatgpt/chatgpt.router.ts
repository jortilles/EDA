import * as express from 'express';
import { authGuard } from '../../guards/auth-guard';
import { ChatGptController } from './chatgpt.controller';

const router = express.Router();

router.post('/response', authGuard, ChatGptController.responseChatGpt);







export default router;