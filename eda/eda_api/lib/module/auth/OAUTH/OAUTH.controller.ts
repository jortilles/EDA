import { NextFunction, Request, Response } from 'express';
import { HttpException } from '../../global/model/index';
import axios from 'axios';
import qs from 'qs';

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

            // return res.redirect(302, redirectTo);
            return res.json({ url: base.toString() });

        } catch (error) {
            console.log('Error: no se pudo construir la URL: ', error);
            next(error);
        }
    }

    static async metadata(req: Request, res: Response, next: NextFunction) {
        try {
            // Recibir metadata desde la URL (query params)

            const code = req.qs?.code || req.query?.code;
            const state = req.qs?.state || req.query?.state;

            console.log('codeeeee: ',code)
            console.log('stateeee: ',state)

            // O si quieres params definidos en la ruta:
            // const { id } = req.params; // /oauth/metadata/123

            if (!code) {
                throw new HttpException(400, "Perdida de código de autorización");
            }

            // Intercambiar code por token
            const response = await exchangeCodeForToken(code, state);

            console.log('response VALIdAP: ', response);
            // access_token
            // refresh_token
            // expires_in
            // token_type

            // Respuesta básica
            return res.status(200).json({
                ok: true,
                response: response,
            });

            // // Respuesta básica
            // return res.status(200).json({
            //     ok: true,
            //     received: metadata,
            // });

        } catch (error) {
            next(error);
        }
    }


}

async function exchangeCodeForToken(code: any, state: any) {

    try {
        const tokenUrl = OAUTHconfig.tokenUrl;
    
        const data = qs.stringify({
            code: code,
            client_id: OAUTHconfig.client_id,
            client_secret: OAUTHconfig.client_secret,
            redirect_uri: OAUTHconfig.redirect_uri,
            grant_type: state,
        });

        const response =  await axios.post(tokenUrl, data, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })

        return response.data;
        
    } catch (error: any) {
        if(axios.isAxiosError(error)) {
            console.error('Error OAuth:', error.response?.data);
            throw new HttpException(
                error.response?.status || 500,
                'Fallo en Intercambio de token OAuth'
            );
        }
        throw error;
    }
}