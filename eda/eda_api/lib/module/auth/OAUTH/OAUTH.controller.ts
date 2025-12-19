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
            const code = req.qs?.code || req.query?.code;
            const state = req.qs?.state || req.query?.state;

            if (!code) {
                throw new HttpException(400, "Perdida de código de autorización");
            }

            // Respuesta de VALId AP con lo siguiente:
            
            // VALId AP - access_token
            // VALId AP - refresh_token
            // VALId AP - expires_in ==> Fijado en 1 hora = 3600 segundos
            // VALId AP - token_type
            const response = await exchangeCodeForToken(code, state);
            const {access_token} = response;


            // Agregar la configuracion de login



            console.log('response VALIdAP: ', response);
            console.log('access_token: ', access_token);

            // Respuesta básica
            return res.status(200).json({
                ok: true,
                access_token: access_token,
            });

        } catch (error) {
            next(error);
        }
    }


}

// Funciones de interacción  con el servidor VALId AP

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

        // Petición POST Para recibir el Token de autenticación
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

async function userData(access_token: any) {

    try {
        const userDataUrlToken = OAUTHconfig.userDataUrlToken;

        const response = await axios.get(userDataUrlToken, {
            params: {
                access_token: access_token, // access_token como único parametro
            }
        })

        return response; // VERIFICAR SI DEVOLVEMOS response.data
    } catch (error) {
        if(axios.isAxiosError(error)) {
            console.error('Error OAuth:', error.response?.data); // VERIFICAR SI DEVOLVEMOS response.data
            throw new HttpException(
                error.response?.status || 500,
                'No se pudieron obtener los datos del usuario a partir del access token.'
            );
        }
        throw error;
    }
}

async function authenticationEvidence(access_token: any) {

    try {
        const authenticationEvidenceUrlToken = OAUTHconfig.authenticationEvidenceUrlToken;

        const response = await axios.get(authenticationEvidenceUrlToken, {
            params: {
                access_token: access_token, // access_token como único parametro
            }
        })

        return response; // VERIFICAR SI DEVOLVEMOS response.data
    } catch (error) {
        if(axios.isAxiosError(error)) {
            console.error('Error OAuth:', error.response?.data); // VERIFICAR SI DEVOLVEMOS response.data
            throw new HttpException(
                error.response?.status || 500,
                'No se pudo obtener la evidencia de autenticación asociada al access token.'
            );
        }
        throw error;
    }
}

async function userPermissions(access_token: any) {
    try {
        const userPermissionsUrlToken = OAUTHconfig.userPermissionsUrlToken;

        const response = await axios.get(userPermissionsUrlToken, {
            params: {
                access_token: access_token, // access_token como único parametro
            }
        })

        return response; // VERIFICAR SI DEVOLVEMOS response.data
    } catch (error) {
        if(axios.isAxiosError(error)) {
            console.error('Error OAuth:', error.response?.data); // VERIFICAR SI DEVOLVEMOS response.data
            throw new HttpException(
                error.response?.status || 500,
                'No se pudo obtener los permisos del usuario. Verifique el token de acceso..'
            );
        }
        throw error;
    }
}

async function userPermissionsRoles(access_token: any) {
    try {
        const userPermissionsRolesUrlToken = OAUTHconfig.userPermissionsRolesUrlToken;

        const response = await axios.get(userPermissionsRolesUrlToken, {
            params: {
                access_token: access_token, // access_token como único parametro
            }
        })

        return response; // VERIFICAR SI DEVOLVEMOS response.data
    } catch (error) {
        if(axios.isAxiosError(error)) {
            console.error('Error OAuth:', error.response?.data); // VERIFICAR SI DEVOLVEMOS response.data
            throw new HttpException(
                error.response?.status || 500,
                'No se pudo obtener los roles del usuario. Verifique el token de acceso.'
            );
        }
        throw error;
    }
}

