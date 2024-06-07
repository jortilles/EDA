import { NextFunction, Request, Response } from 'express';
import { HttpException } from '../../global/model/index';
import ServerLogService from '../../../services/server-log/server-log.service';
// import * as path from 'path';
// import * as fs from 'fs';
// import { QueryOptions } from 'mongoose';

// Importaciones necesarias
import User, { IUser } from '../../admin/users/model/user.model';
import { UserController } from '../../admin/users/user.controller';

// constantes necesarias
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const SEED = require('../../../../config/seed').SEED;

export class MicrosoftController {


    static async credentialMicrosoft(req: Request, res: Response, next: NextFunction) {

        const token = req.body.token;

        return res.status(200).json({
            ok: true,
            msg: token
        })
    }
}





