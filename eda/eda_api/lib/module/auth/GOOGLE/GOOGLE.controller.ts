import { NextFunction, Request, Response } from 'express';
import { HttpException } from '../../global/model/index';
import ServerLogService from '../../../services/server-log/server-log.service';
// import * as path from 'path';
// import * as fs from 'fs';
// import { QueryOptions } from 'mongoose';

// Importaciones necesarias
import User, { IUser } from '../../admin/users/model/user.model';
import googleVerify from './GOOGLE.verify';
import { UserController } from '../../admin/users/user.controller';

// constantes necesarias
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const SEED = require('../../../../config/seed').SEED;

export class GoogleController {


    static async login(req: Request, res: Response, next: NextFunction) {

        try {            
            const body = req.body
            const {respGoogle} = body;
            const {credential} = respGoogle;
            let token: string;
            let user: IUser = new User({ name: '', email: '', password: '', img: '', role: [] });

            insertServerLog(req, 'info', 'newLogin', body.email, 'attempt');
            
            // Del payload de google extraemos el campo jti que es variable para generar un password dinámico
            const {email_verified, email, name, picture, given_name, family_name, jti} = await googleVerify(credential)

            // Si el email esta verificado con google
            if(email_verified) {

                if(email=='edaanonim@jortilles.com') {
                    console.log('Este es el correo de edaanonim@jortilles.com'); // validar con Juanjo
                }
                
                const userEda = await UserController.getUserInfoByEmail(email, true);
                
                // usuario no resgistrado, es un usuario nuevo para hacer un nuevo registro
                if(!userEda) {
                    const userToSave: IUser = new User({
                        name: name,
                        email: email,
                        password: bcrypt.hashSync(jti, 10),
                        img: picture,
                        role: []// validar con Juanjo
                    });
                    userToSave.save(async (err, userSaved) => {
                        if(err) return next(new HttpException(400, 'Some error ocurred while creating the User'));
                        Object.assign(user, userSaved);
                        user.password = ':)';
                        token = await jwt.sign({user}, SEED, {expiresIn: 14400})
                        return res.status(200).json({ user, token: token, id: user._id });
                    });
                } else {
                    // Si el usuario ya esta registrado, se actualiza algunos datos.
                    userEda.name = name;
                    userEda.email = email;
                    userEda.password = bcrypt.hashSync(jti, 10); // validar con Juanjo
                    userEda.role = [];
                    userEda.save(async (err, userSaved) => {
                        if(err) return next(new HttpException(400, 'Some error ocurred while creating the User'));
                        Object.assign(user, userSaved);
                        user.password = ':)';
                        token = await jwt.sign({ user }, SEED, { expiresIn: 14400 });
                        return res.status(200).json({ user, token: token, id: user._id });
                    });
                }
            } else {
                return next(new HttpException(400, 'Usuario no verificado por Google'));
            }
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