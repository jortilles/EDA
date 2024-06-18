import { NextFunction, Request, Response } from 'express';
import { HttpException } from '../../global/model/index';
import { ActiveDirectoryService } from '../../../services/active-directory/active-directory.service';
import User, { IUser } from '../../admin/users/model/user.model';
import Group, { IGroup } from '../../admin/groups/model/group.model';
import ServerLogService from '../../../services/server-log/server-log.service';
import * as path from 'path';
import * as fs from 'fs';
import { QueryOptions } from 'mongoose';




const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const SEED = require('../../../../config/seed').SEED;
const crypto = require('crypto');


export class UrlController {

    static async urlCheck(req: Request, res: Response, next: NextFunction) {

        try {
            const token = req.body.token;
            console.log('recepcion token: ',token);

            return res.status(200).json({
                ok: true,
                token: token
            })

        } catch (err) {
            console.log(err);
            next(err);
        }
    }


}
