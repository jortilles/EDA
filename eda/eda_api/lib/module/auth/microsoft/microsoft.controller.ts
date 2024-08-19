import { NextFunction, Request, Response } from 'express';
import { HttpException } from '../../global/model/index';
import ServerLogService from '../../../services/server-log/server-log.service';

// Importaciones necesarias
import User, { IUser } from '../../admin/users/model/user.model';
import { UserController } from '../../admin/users/user.controller';
import authConfig from '../../../guards/microsoft-authConfig';
import fetch from '../../../guards/microsoft-fetch';

// constantes necesarias
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const SEED = require('../../../../config/seed').SEED;

export class MicrosoftController {


    static async credentialMicrosoft(req: Request, res: Response, next: NextFunction) {

        try {
            // const respMicrosoft = req.body.respMicrosoft;
            const body = req.body;
            const {respMicrosoft} = body;
            let token: string;
            let user: IUser = new User({ name: '', email: '', password: '', img: '', role: [] });
            const {accessToken} = respMicrosoft
            let email:string;
            const oid = respMicrosoft.idTokenClaims.oid

            insertServerLog(req, 'info', 'newLogin', body.email, 'attempt');

            const { userPrincipalName, givenName, surname  } = await fetch(authConfig.GRAPH_ME_ENDPOINT, accessToken);
            
            email = userPrincipalName

            if(email!=null){
                
                const userEda = await UserController.getUserInfoByEmail(email, true);

                // usuario no resgistrado, es un usuario nuevo para hacer un nuevo registro
                if(!userEda) {
                    const userToSave: IUser = new User({
                        name: givenName,
                        email: email,
                        password: bcrypt.hashSync(oid, 10),
                        img: 'imagen', // Falta solucionar
                        role: '135792467811111111111110' // validar con Juanjo
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
                    userEda.name = givenName;
                    userEda.email = email;
                    userEda.password = bcrypt.hashSync(oid, 10); 
                    userEda.role = '135792467811111111111110';
                    userEda.save(async (err, userSaved) => {
                        if(err) return next(new HttpException(400, 'Some error ocurred while creating the User'));
                        Object.assign(user, userSaved);
                        user.password = ':)';
                        token = await jwt.sign({user}, SEED, {expiresIn: 14400});
                        return res.status(200).json({ user, token: token, id: user._id });
                    })
                }
            } else {
                return next(new HttpException(400, 'Usuario no verificado por Microsoft'));
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





