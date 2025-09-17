import express from 'express';
import AdminRouter from './module/admin/admin.router';
import DashboardRouter from './module/dashboard/dashboard.router';
import QueryRouter from './module/query/query.router';
import AddTableRouter from './module/addtabletomodel/addtable.router';
import DataSourceRouter from './module/datasource/datasource.router';
import UploadsRouter from './module/uploads/uploads.router';
import MailRouter from './module/mail/mail.router';
import CustomActionCall from './module/customActionCall/customActionCall.router';
import DocuRouter from './routes/api/api-docs'
import ExcelRouter from './module/excel/excel-sheet.router';
import ThirdPartyRouter from './module/thirdParty/thirdParty.router';

import updateModelRouter from './module/updateModel/updateModel.router';
/*SDA CUSTOM*/ import getSdaInfoRouter from './module/getSdaInfo/getSdaInfo.router';

const router = express.Router();

router.use('/admin', AdminRouter);

router.use('/dashboard', DashboardRouter);

router.use('/query', QueryRouter);

router.use('/datasource', DataSourceRouter);

router.use('/global/upload', UploadsRouter);

router.use('/addTable', AddTableRouter );

router.use('/mail', MailRouter);

//Router para update model de SinergiaTIC
/*SDA CUSTOM*/ router.use('/updatemodel', updateModelRouter);
router.use('/customActionCall', CustomActionCall);

router.use('/excel-sheets',ExcelRouter);

router.use('/tp', ThirdPartyRouter);

/*SDA CUSTOM*/ router.use('/getsdainfo', getSdaInfoRouter);
/* ruta per documentació*/
router.use("/api-docs", DocuRouter);

export default router;
