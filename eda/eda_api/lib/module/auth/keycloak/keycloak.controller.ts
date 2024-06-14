import { NextFunction, Request, Response } from 'express';
// import { HttpException } from '../../global/model/index';
// import { ActiveDirectoryService } from '../../../services/active-directory/active-directory.service';
// // import User, { IUser } from './model/user.model';
// // import Group, { IGroup } from '../groups/model/group.model';
// import ServerLogService from '../../../services/server-log/server-log.service';
// import * as path from 'path';
// import * as fs from 'fs';
// import { QueryOptions } from 'mongoose';

// const jwtmod = require('jsonwebtoken');
// const bcrypt = require('bcryptjs');
// const SEED = require('../../../../config/seed').SEED;
// const crypto = require('crypto');


export class KeycloakController {

    static async keycloakLogin(req: Request, res: Response, next: NextFunction) {

        const decoded = req.decoded;

        try {
            res.status(200).json({
                ok: true,
                decoded,
            })
        } catch (error) {
            console.log(error)
        }

    }

}


