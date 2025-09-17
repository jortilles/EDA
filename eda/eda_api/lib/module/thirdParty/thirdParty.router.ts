
import express from 'express';
import UrlRouter from './url/url.router';

const router = express.Router();

router.use('/url', UrlRouter);

export default router;