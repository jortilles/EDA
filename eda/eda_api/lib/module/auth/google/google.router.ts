
import * as  express from 'express';
import { GoogleController } from './google.controller';

const router = express.Router();


// router.get('/', GoogleController.loginGoogle);
// Falta validar si el token esta vacio o no 
router.post('/login', GoogleController.credentialGoogle);


export default router;
