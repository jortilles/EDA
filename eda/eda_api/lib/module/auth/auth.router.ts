
import express from 'express';
import GoogleRouter from './google/google.router';

const router = express.Router();

router.use('/google', GoogleRouter);


export default router;