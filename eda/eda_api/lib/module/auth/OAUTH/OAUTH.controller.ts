import { NextFunction, Request, Response } from 'express';
import { HttpException } from '../../global/model/index';

const OAUTHconfig = require('../../../../config/OAUTHconfig');



export class OAUTHController {

    static async login(req: Request, res: Response, next: NextFunction) {
        try {
            // Metadata para el inicio de la sesión oauth2
            const { response_type, client_id, redirect_uri, scope, state, access_type, baseUrlAuthentication } = OAUTHconfig;

            // Usando la api nativa del navegador
            const base = new URL(baseUrlAuthentication);
            
            // Usando la api nativa del navegador
            const params = new URLSearchParams({
                response_type: response_type,
                client_id: client_id,
                redirect_uri: redirect_uri,
                scope: scope,
                state: state,
                access_type: access_type,
            })

            base.search = params.toString();

            const url = base.toString();
            const redirectTo = url

            return res.redirect(302, redirectTo);

        } catch (error) {
            console.log('Error: no se pudo construir la URL: ', error);
            next(error);
        }
    }

    static async metadata(req: Request, res: Response, next: NextFunction) {
        try {
            // Recibir metadata desde la URL (query params)
            const metadata = req.query; // /oauth/metadata?client_id=123&scope=read

            console.log('metadata: ', metadata);

            // O si quieres params definidos en la ruta:
            // const { id } = req.params; // /oauth/metadata/123

            if (!metadata || Object.keys(metadata).length === 0) {
                throw new HttpException(400, "No metadata received");
            }

            // Respuesta básica
            return res.status(200).json({
                ok: true,
                received: metadata,
            });

        } catch (error) {
            next(error);
        }
    }


}