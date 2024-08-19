import { NextFunction, Request, Response } from 'express';

const jwt = require('jsonwebtoken');
const SEED = require('../../../../config/seed').SEED;


export class UrlController {

    static async urlCheck(req: Request, res: Response, next: NextFunction) {

        try {
            const token = req.body.token;
            let user;
            
            // verificacion del token y extracción del user
            user = await jwt.verify(token, SEED, (err, decoded) => {

                if (err) {
                    console.log(err);
                    return null
                }

                return decoded.user;    
            })

            if(user) {
                return res.status(200).json({ user, token: token, id: user._id });
            }
            
            else {
                return res.status(400).json({
                    ok: false,
                    token: 'Token invalido o caducado'
                })
            }
            
        } catch (err) {
            console.log(err);
            next(err);
        }
    }
}
