import { Request, Response, NextFunction } from 'express';
import { HttpException } from '../module/global/model/index';
const SEED = require('../../config/seed').SEED;
import crypto from 'crypto';

export const updateModelGuard = async function (req: Request, res: Response, next: NextFunction) {
    let updateToken:String = 'xx';
    try{
        updateToken = req.qs.tks.toString();
    }catch(e){
        console.log(e);
        return next(new HttpException(403, 'valid authentication is requiered'));
    }

    const dia =  new Date();
    let token = dia.getUTCFullYear( ) +  SEED +  dia.getUTCDate()  + dia.getUTCHours();    
    
    console.log('\x1b[33m=====\x1b[0m \x1b[1;34mStarting Update Model\x1b[0m \x1b[33m=====\x1b[0m');
    
    token = crypto.createHash('md5').update(token).digest("hex");
    console.log('MD5 token: ' +  token );
    
    if ( updateToken == token ) {
            next();
    } else {
        return next(new HttpException(403, 'valid authentication required'));
    }
};
