import { Request, Response, NextFunction } from 'express';
import { HttpException } from '../module/global/model/index';



export const updateModelGuard = async function (req: Request, res: Response, next: NextFunction) {
    let updateToken:String = 'xx';
    try{
        updateToken = req.qs.tks.toString();
    }catch(e){
        console.log(e);
        return next(new HttpException(403, 'valid authentication is requiered'));
    }
    // aqui tenemos que implemetar una validación
    if ( updateToken == 'x1' ) {
            next();
    } else {
        return next(new HttpException(403, 'valid authentication required'));
    }
};
