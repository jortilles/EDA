
import * as  express from 'express';
import { authGuard } from '../../../guards/auth-guard';
import { roleGuard } from '../../../guards/role-guard';
import {originGuard} from '../../../guards/origin-guard';
import { GoogleController } from './google.controller';

const router = express.Router();
// express-validator
// const { check } = require('express-validator');

// Login routes

// router.get('/', GoogleController.loginGoogle);
// Falta validar si el token esta vacio o no 
router.post('/', GoogleController.credentialGoogle);

// router.post('/login', UserController.login);
// router.get('/fake-login/:usermail/:token', originGuard, UserController.provideToken );
// router.post('/sso', UserController.singleSingnOn)
// router.get('', authGuard,  UserController.getUsers);
// router.get('/profile-img/:img', authGuard, UserController.findProfileImg);
// router.get('/refresh-token', authGuard, UserController.refreshToken);
// router.get('/is-admin/:id', authGuard, UserController.getIsAdmin);
// router.get('/is-datasource-creator/:id', authGuard, UserController.getIsDataSourceCreator);
// router.post('', authGuard, UserController.create);
// router.get('/:id', authGuard,  roleGuard,  UserController.getUser);
// router.put('/me/:id', authGuard, UserController.update); 
// router.put('/management/:id', authGuard, roleGuard, UserController.update);
// router.delete('/:id', authGuard, roleGuard, UserController.delete);

export default router;
