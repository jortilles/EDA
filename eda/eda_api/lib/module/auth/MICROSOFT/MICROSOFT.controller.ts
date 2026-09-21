import { NextFunction, Request, Response } from 'express';
import { HttpException } from '../../global/model/index';
import { insertServerLog } from '../../../services/server-log/server-log.service';

// Importaciones necesarias
import User, { IUser } from '../../admin/users/model/user.model';
import { UserController } from '../../admin/users/user.controller';
import authConfig from './MICROSOFT.verify';
import fetch from './MICROSOFT.fetch';

// Constantes necesarias
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const SEED = require('../../../../config/seed').SEED;

export class MicrosoftController {


    static async login(req: Request, res: Response, next: NextFunction) {

        try {
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
                        role: [],
                        creation_date: new Date()
                    });
                    try {
                        const userSaved = await userToSave.save();                        
                        Object.assign(user, userSaved);
                        user.password = ':)';
                        token = await jwt.sign({user}, SEED, {expiresIn: 14400})
                        return res.status(200).json({ user, token: token, id: user._id });
                    } catch (error) {
                        return(new HttpException(400, 'Some error ocurred while creating the User'));
                    }
                } else {
                    // Si el usuario ya esta registrado, se actualiza algunos datos.
                    userEda.name = givenName;
                    userEda.email = email;
                    userEda.password = bcrypt.hashSync(oid, 10); 
                    
                    try {
                        const userSaved = await userEda.save(); 
                        Object.assign(user, userSaved);
                        user.password = ':)';
                        token = await jwt.sign({user}, SEED, {expiresIn: 14400});
                        return res.status(200).json({ user, token: token, id: user._id });
                    } catch (error) {
                        return (new HttpException(400, 'Some error ocurred while creating the User'));
                    }
                }
            } else {
                return next(new HttpException(400, 'Usuario no verificado por Microsoft'));
            }
        } catch (error) {
            next(error);
        }
    }
}






