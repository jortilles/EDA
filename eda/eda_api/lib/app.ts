import express from 'express';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import { NextFunction, Request, Response } from 'express';
import { callInterceptor } from './services/call-interceptor';
import errorMiddleware from './middleware/error.middleware';


import Router from './router';

const path = require('path');
/* SDA CUSTOM*/ // Show current node_modules folder 
/* SDA CUSTOM*/ console.log("NODE MODULES PATH",require.resolve('lodash'));
const database = require('../config/database.config');
const mongoose = require('mongoose');
const compression = require('compression');
import * as EdaScheduler from './EdaScheduler';

class App {
    public app: express.Application;
    public mongoUrl: string = database.url;

    constructor() {
        this.app = express();
        this.initApplication();
        this.mongoSetup();
        this.app.use(compression());
        this.app.use(callInterceptor);
        this.app.use(Router);
        this.app.use(errorMiddleware);
    }

    private initApplication(): void {
        // View Engine
        this.app.set('view', path.join(__dirname, 'views'));
        this.app.set('view engine', 'pug');

        // Body Parser
        this.app.use(express.json({ limit: '50mb' }));
        this.app.use(express.urlencoded({ limit: '50mb', extended: true, parameterLimit: 1000000 }));

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

        //jobs
        EdaScheduler.initJobs();
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
