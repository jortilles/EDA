
import express from 'express';
const app = express();
import swaggerJsDoc from 'swagger-jsdoc'
import swaggerUI from 'swagger-ui-express'
//Swagger doc
const swaggerOptions = {
    swaggerDefinition: {
        info:{
            version: "1.0.0",
            title: 'EDA Documentation',
            description: "API documentation for use",
            contact: {
                name: "Jortilles",
                url: "https://www.jortilles.com/",
                mail: "info@jortilles.com"
            },
            servers: ["http://edalitics.com"]
            
        }
    },
    basePath: "/",
    apis: ['lib/module/admin/users/user.router.ts',
           'lib/module/admin/groups/groups.router.ts',
           'lib/module/dashboard/dashboard.router.ts',
           'lib/module/datasource/datasource.router.ts',
            ]
}

const swaggerDocs = swaggerJsDoc(swaggerOptions);
var router = express.Router();
app.use("/", router, swaggerUI.serve, swaggerUI.setup(swaggerDocs));
 
export default app ;

