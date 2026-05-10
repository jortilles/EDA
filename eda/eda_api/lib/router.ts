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
import AiRouter from './module/ai/ai.router';
import ArimaRouter from './module/predictions/predictions.router';
import AuthRouter from './module/auth/auth.router';
import CustomHTMLRouter from './module/customHTML/customHTML.router';
import McpRouter from './module/mcp/mcp.router';
import NlToSqlRouter from './module/nl-to-sql/nl-to-sql.router';

const router = express.Router();

router.use('/admin', AdminRouter);

router.use('/dashboard', DashboardRouter);

router.use('/query', QueryRouter);

router.use('/datasource', DataSourceRouter);

router.use('/global/upload', UploadsRouter);

router.use('/addTable', AddTableRouter );

router.use('/mail', MailRouter);

router.use('/customActionCall', CustomActionCall);

router.use('/excel-sheets',ExcelRouter);

router.use('/tp', ThirdPartyRouter);

router.use('/assistant', AiRouter);

router.use('/arima', ArimaRouter);  

router.use('/auth', AuthRouter);

router.use('/customHTML', CustomHTMLRouter);

router.use('/ia', McpRouter);
router.use('/nl-to-sql', NlToSqlRouter);

/* ruta per documentació*/
router.use("/api-docs", DocuRouter);

export default router;
