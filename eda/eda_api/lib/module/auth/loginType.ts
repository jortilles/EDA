
import { NextFunction, Request, Response } from "express";
import { HttpException } from "../global/model/index";


// EDA API Configuración
const EDA_API_CONFIG = require('../../../config/eda_api_config');


export class loginType {

static loginTypeSelection(req: Request, res: Response, next: NextFunction) {
    console.log('>>> /typeLogin request recibida en el servidor');
    console.log('req.qs:', req.qs);
    console.log('req.headers:', req.headers); 

    try {
        const authentication_type = EDA_API_CONFIG.authentication_type;

        res.status(200).json({
            ok: true,
            response: authentication_type
        });

    } catch (error) {
        console.log('Error en loginTypeSelection:', error);
        next(new HttpException(400, 'Some error occurred with the authentication type configuration'));
    }
}


}