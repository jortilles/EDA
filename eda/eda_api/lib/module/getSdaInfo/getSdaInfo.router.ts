import express from 'express';
import { getSdaInfo } from './getSdaInfo.controller';

const router = express.Router();

router.get("/getinfo", getSdaInfo.getinfo);

export default router;
