import express from 'express';
import AdminRouter from './module/admin/admin.router';
import DashboardRouter from './module/dashboard/dashboard.router';
import AddTableRouter from './module/addtabletomodel/addtable.router';
import DataSourceRouter from './module/datasource/datasource.router';
import UploadsRouter from './module/uploads/uploads.router';
import MailRouter from './module/mail/mail.router';

import updateModelRouter from './module/updateModel/updateModel.router';
// SDA CUSTOM
import getSdaInfoRouter from './module/getSdaInfo/getSdaInfo.router';
// END SDA CUSTOM

const router = express.Router();

router.use('/admin', AdminRouter);

router.use('/dashboard', DashboardRouter);

router.use('/datasource', DataSourceRouter);

router.use('/global/upload', UploadsRouter);

router.use('/addTable', AddTableRouter );

router.use('/mail', MailRouter);

// Router for SinergiaTIC update model
router.use('/updatemodel', updateModelRouter);

// SDA CUSTOM
router.use('/getsdainfo', getSdaInfoRouter);
// END SDA CUSTOM

export default router;
