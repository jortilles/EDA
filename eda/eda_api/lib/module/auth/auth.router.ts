
import express from 'express';
import GoogleRouter from './google/google.router';
import MicrosoftRouter from './microsoft/microsoft.router';

const router = express.Router();

router.use('/google', GoogleRouter);
router.use('/microsoft', MicrosoftRouter);

export default router;