import { NextFunction, Request, Response } from 'express';
import { HttpException } from '../../global/model/index';
import { ActiveDirectoryService } from '../../../services/active-directory/active-directory.service';
import ServerLogService from '../../../services/server-log/server-log.service';
import * as path from 'path';
import * as fs from 'fs';
import { QueryOptions } from 'mongoose';

// Importaciones necesarias
import User, { IUser } from '../../admin/users/model/user.model';
import verify from '../../../helpers/google-verify';
// import * as googleVerify from '../../../helpers/google-verify.js';





const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const SEED = require('../../../../config/seed').SEED;
const crypto = require('crypto');

export class GoogleController {


    static async credentialGoogle(req: Request, res: Response, next: NextFunction) {

        try {
            
            const body = req.body
            const {respGoogle} = body;
            const {credential}:any = respGoogle;
            let token: string;
            let user: IUser = new User({ name: '', email: '', password: '', img: '', role: [] });

            insertServerLog(req, 'info', 'newLogin', body.email, 'attempt');
            
            const {email_verified, email, name, picture, given_name, family_name} = await verify(credential)
            
            // si el email esta verificado con google
            if(email_verified) {

                if(email=='edaanonim@jortilles.com') {
                    console.log('Este es el correo de edaanonim@jortilles.com');
                }
                
                
            }

            res.json({
                ok: true,
                email_verified: email_verified,
                email: email,
                name: name,
                given_name: given_name,
                family_name: family_name,
                picture: picture
            })

        } catch (error) {
            next(error);
        }
    }
}

function insertServerLog(req: Request, level: string, action: string, userMail: string, type: string) {
    const ip = req.headers['x-forwarded-for'] || req.get('origin')
    var date = new Date();
    var month =date.getMonth()+1 ;
    var monthstr=month<10?"0"+month.toString(): month.toString();
    var day = date.getDate();
    var daystr=day<10?"0"+day.toString(): day.toString();
    var date_str = date.getFullYear() + "-" + monthstr + "-" + daystr + " " +  date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
    ServerLogService.log({ level, action, userMail, ip, type, date_str});
}



