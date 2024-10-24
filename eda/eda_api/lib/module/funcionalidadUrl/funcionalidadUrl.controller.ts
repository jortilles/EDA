import { NextFunction, Request, Response } from 'express';
import { HttpException } from '../global/model/index';


export class FuncionalidadUrlController {


    static async checkUrl(req: Request, res: Response, next: NextFunction) {

        try {
            const response = await req.body
            const {url} = response;            

            // Hacemos un fetch a la url solicitada por el frontend
            fetch(url)
              .then( r => {
                res.status(200).json({ 
                  ok: true,
                  msg: 'Respuesta correcta',
                });
              })
              .catch(error => {
                console.error('Error fetching data', error);
                res.status(500).json({ 
                  ok: false,
                  msg: 'Error en la petición o en la URL',
                });
              });

        } catch (err) {
          return next(new HttpException(501, 'Error in SMPT configuration file'));
        }
    
      }

}