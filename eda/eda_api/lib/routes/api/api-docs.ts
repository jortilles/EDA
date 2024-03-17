
import express from 'express';
const app = express();
import swaggerJsDoc from 'swagger-jsdoc'
import swaggerUI from 'swagger-ui-express'
//Swagger doc
const swaggerOptions = {
    swaggerDefinition: {
        info:{
            version: "2.0.1",
            title: 'Enterprise Data Analytics (EDA) Documentation',
            description: "API documentation for use",
            contact: {
                name: "Enterprise Data Analytics (EDA)",
                url: "https://eda.jortilles.com/",
                mail: "eda@jortilles.com"
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

