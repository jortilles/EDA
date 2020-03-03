import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as cors from 'cors';
import * as fileUpload from 'express-fileupload';
import { NextFunction, Request, Response } from 'express';
import errorMiddleware from './middleware/error.middleware';
import RoutesLoader from './module/global/routes/RoutesLoader';

const path = require('path');
const database = require('../config/database.config');
const mongoose = require('mongoose');


class App {
    public app: express.Application;
    public mongoUrl: string = database.url;

    constructor() {
        this.app = express();
        this.initApplication();
        this.mongoSetup();
        RoutesLoader(this.app);
        this.initErrorHandling();
    }

    private initErrorHandling() {
        this.app.use(errorMiddleware);
    }

    private initApplication(): void {
        // View Engine
        this.app.set('view', path.join(__dirname, 'views'));
        this.app.set('view engine', 'pug');

        // Body Parser
        this.app.use(bodyParser.json({limit: '50mb'}));
        this.app.use(bodyParser.urlencoded({limit: '50mb', extended: true, parameterLimit: 1000000}));

        // Cors
        this.app.use(cors());
        this.app.use((req: Request, res: Response, next: NextFunction) => {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            res.header("Acces-Controll-Allow-Methods", "POST, GET, PUT, DELETE, OPTIONS");
            next();
        });
      

        // File Upload
        this.app.use(fileUpload());
    }

    private mongoSetup(): void {
        mongoose.Promise = global.Promise;
        mongoose.connect(this.mongoUrl, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        }).then(() => {
            console.log('\n\x1b[34m=====\x1b[0m \x1b[32mSuccessfully connected to the database \x1b[0m \x1b[34m=====\x1b[0m\n');
        }).catch((err: any) => {
            console.log('\n\x1b[34m=====\x1b[0m \x1b[31mCould not connect to the database. Exiting now... \x1b[0m \x1b[34m=====\x1b[0m\n', err);
            process.exit();
        });
        mongoose.set('useCreateIndex', true);
    }
}

export default new App().app;
