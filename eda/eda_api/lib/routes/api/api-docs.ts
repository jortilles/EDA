import express from 'express';
import swaggerJsDoc from 'swagger-jsdoc';
import swaggerUI from 'swagger-ui-express';


const app = express();


const swaggerOptions = {
    swaggerDefinition: {
        info: {
            version: "3.0.2",
            title: 'Edalitics Documentation',
            description: "API documentation for use",
            contact: {
                name: "Edalitics",
                url: "https://www.edalitics.com/",
                mail: "info@edalitics.com"
            },
            servers: [ { "url": "http://edalitics.com/" }],
        }
    },
    basePath: "/",
    apis: [
        'lib/module/admin/users/user.router.ts',
        'lib/module/admin/groups/groups.router.ts',
        'lib/module/admin/log/log.router.ts',
        'lib/module/dashboard/dashboard.router.ts',
        'lib/module/datasource/datasource.router.ts',
        'lib/module/query/query.router.ts',
        'lib/module/excel/excel-sheet.router.ts',
        'lib/module/ai/ai.router.ts',
        'lib/module/mail/mail.router.ts',
        'lib/module/uploads/uploads.router.ts',
        'lib/module/predictions/predictions.router.ts',
        'lib/module/addtabletomodel/addtable.router.ts',
        'lib/module/customHTML/customHTML.router.ts',
        'lib/module/customActionCall/customActionCall.router.ts',
        'lib/module/mcp/mcp.router.ts',
        'lib/module/auth/auth.router.ts',
        'lib/module/auth/GOOGLE/GOOGLE.router.ts',
        'lib/module/auth/MICROSOFT/MICROSOFT.router.ts',
        'lib/module/auth/SAML/SAML.router.ts',
        'lib/module/thirdParty/url/url.router.ts',
    ]
}

const swaggerDocs = swaggerJsDoc(swaggerOptions);
const router = express.Router();

app.use("/", router, swaggerUI.serve, swaggerUI.setup(swaggerDocs));

export default app;
