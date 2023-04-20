import { Request, response, Response, Router } from 'express';
import {welcome} from '../services/welcome';
import {model} from '../services/model';
import {deploy} from '../services/deploy';
import { MongoData } from '../database/EDA.mongoData';
import { reportLoader} from '../services/reports.loader';
import { report } from 'process';

const router = Router();

router.get('/welcome', welcome.welcome);

router.get('/updateModel', model.update);

//router.get('/deploy', deploy.execute)

//router.get('/senddashboard', (req, res) => {res.sendFile('C:\\Proyectos\\SinergiaCRM\\sinergiacrm\\orquestador\\src\\views\\postform.html', {title: "postJson"})})

router.post('/postddashboard', (req, res) => deploy.postDashboard(req, res))

router.get('/pushdashboards', (req, res) => reportLoader.reportLoader(req))

//router.get('/getDashboard/:user', (req, res) => {return res.status(200).send(new MongoData().getDashboardData(req))})

router.get('/syncroinform', (req,res) => reportLoader.syncroInforms(req, res)  )

export default router;