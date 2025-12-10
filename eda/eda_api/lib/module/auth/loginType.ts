
import { NextFunction, Request, Response } from "express";
import { HttpException } from "../global/model/index";


// EDA API Configuración
const EDA_API_CONFIG = require('../../../config/eda_api_config');


export class loginType {

    static loginTypeSelection(req: Request, res: Response, next: NextFunction) {
        // Funcion que seguramente tendra que ser estatica
        try {
            const authentication_type = EDA_API_CONFIG.authentication_type;

            res.status(200).json({
                ok: true,
                response: authentication_type
            })
            
        } catch (error) {
            console.log(error);
            next(new HttpException(400, 'some Error occurred with the authentication type configuration'))
        }

    }


}