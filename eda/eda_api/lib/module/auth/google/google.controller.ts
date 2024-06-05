import { NextFunction, Request, Response } from 'express';
import { HttpException } from '../../global/model/index';
import { ActiveDirectoryService } from '../../../services/active-directory/active-directory.service';
import ServerLogService from '../../../services/server-log/server-log.service';
import * as path from 'path';
import * as fs from 'fs';
import { QueryOptions } from 'mongoose';

// Importaciones necesarias
import User, { IUser } from '../../admin/users/model/user.model';




const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const SEED = require('../../../../config/seed').SEED;
const crypto = require('crypto');

function AASingleSingnOn(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
  
    descriptor.value = async function (req: Request, res: Response, next: NextFunction) {
      console.log('Nueva lógica de Single Sign On', req.body);
      return res.status(200).json({ok: 'nuevo sign on'});
    };
}

export class GoogleController {


    static async credentialGoogle(req: Request, res: Response, next: NextFunction) {

        try {
            
            const body = req.body
            const {respGoogle} = body;
            const {credential} = respGoogle;
            let token: string;
            let user: IUser = new User({ name: '', email: '', password: '', img: '', role: [] });
    
            insertServerLog(req, 'info', 'newLogin', body.email, 'attempt');

            if(credential.length!==0) {
                console.log('Credential tiene datos')
                console.log('Verificación del credential con la llave secreta de google')
            }

            // console.log('respGoogle: ', respGoogle);
            // console.log('credential: ', credential);
            // console.log('token: ', token);
            // console.log('user: ', user);
    
    
            res.json({
                ok: true,
                respGoogle: respGoogle
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

