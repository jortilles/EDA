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

            console.log('code: ', code);
            console.log('state: ', state);

            if (!code) {
                throw new HttpException(400, "Perdida de código de autorización");
            }
            
            // Respuesta de VALId AP con lo siguiente:
            
            // VALId AP - access_token
            // VALId AP - refresh_token
            // VALId AP - expires_in ==> Fijado en 1 hora = 3600 segundos
            // VALId AP - token_type

            const response = await exchangeCodeForToken(code);
            const {access_token} = response;

            // Agregar la configuracion de login
            console.log('VALIdAP RESPONSE: ', response);
            console.log('Primer access_token: ', access_token);

            // Llamadas en paralelo a los datos del usuario
            const [
                userDataValue,
                authenticationEvidenceValue,
                userPermissionsValue,
                userPermissionsRolesValue
            ] = await Promise.all([
                userData(access_token),
                authenticationEvidence(access_token),
                userPermissions(access_token),
                userPermissionsRoles(access_token)
            ])

            console.log('RECUPERANDO TODA LA INFORMACIÓN DEL USUARIO AUTENTICADO:::: ');
            console.log('userDataValue: ', userDataValue);
            console.log('authenticationEvidenceValue: ', authenticationEvidenceValue);
            console.log('userPermissionsValue: ', userPermissionsValue);
            console.log('userPermissionsRolesValue: ', userPermissionsRolesValue);


            // Aqui es donde ya se obtuvo toda la informacion y se debe redirigir a un ventana de que posee la opcion de seleccionar el rol
            // (hay autenticacion exitosa pero aun no esta hecho el login, porque necesita el rol para hacer login)


            
            // Respuesta
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

async function exchangeCodeForToken(code: any) {

    try {
        const tokenUrl = OAUTHconfig.tokenUrl;
    
        const data = qs.stringify({
            code: code,
            client_id: OAUTHconfig.client_id,
            client_secret: OAUTHconfig.client_secret,
            redirect_uri: OAUTHconfig.redirect_uri,
            grant_type: 'authorization_code',
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

async function userData(access_token: string) {
    console.log('>==== userData ====<');
    console.log('>=== access_token ===< ',access_token);

    try {
        const userDataUrlToken = OAUTHconfig.userDataUrlToken;
        const response = await axios.get(userDataUrlToken,
            {
                params: {
                    AccessToken: access_token, // access_token | único parametro
                },
                timeout: 5000 // 5 segundos
            }
        );

        console.log('userData ==> Response: ', response);

        return response.data; // VERIFICAR SI DEVOLVEMOS response.data

    } catch (error) {
        if(axios.isAxiosError(error)) {
            console.error('Error OAuth userData:', error.response?.data); // VERIFICAR SI DEVOLVEMOS response.data
            throw new HttpException(
                error.response?.status || 500,
                'No se pudieron obtener los datos del usuario a partir del access token (userData).'
            );
        }
        throw error;
    }
}

async function authenticationEvidence(access_token: string) {

    console.log('>==== authenticationEvidence ====<');
    console.log('>=== access_token ===< ', access_token);

    try {
        const authenticationEvidenceUrlToken = OAUTHconfig.authenticationEvidenceUrlToken;
        const response = await axios.get(authenticationEvidenceUrlToken,
            {
                params: {
                    AccessToken: access_token, // access_token | único parametro
                },
                timeout: 5000 // 5 segundos
            }
        );

        console.log('authenticationEvidence ==> Response: ', response);

        return response.data; // VERIFICAR SI DEVOLVEMOS response.data

    } catch (error) {
        if(axios.isAxiosError(error)) {
            console.error('Error OAuth authenticationEvidence:', error.response?.data); // VERIFICAR SI DEVOLVEMOS response.data
            throw new HttpException(
                error.response?.status || 500,
                'No se pudo obtener la evidencia de autenticación asociada al access token (authenticationEvidence).'
            );
        }
        throw error;
    }
}

async function userPermissions(access_token: string) {
    console.log('>==== userPermissions ====<');
    console.log('>=== access_token ===< ', access_token);

    try {
        const userPermissionsUrlToken = OAUTHconfig.userPermissionsUrlToken;
        const response = await axios.get(userPermissionsUrlToken, {
                params: {
                    AccessToken: access_token, // access_token | único parametro
                },
                timeout: 5000 // 5 segundos
            }
        )

	console.log('userPermissions Response => ', response);        

	return response.data; // VERIFICAR SI DEVOLVEMOS response.data

    } catch (error) {
        if(axios.isAxiosError(error)) {
            console.error('Error OAuth userPermissionsUrlToken:', error.response?.data); // VERIFICAR SI DEVOLVEMOS response.data
            throw new HttpException(
                error.response?.status || 500,
                'No se pudo obtener los permisos del usuario. Verifique el token de acceso (userPermissionsUrlToken).'
            );
        }
        throw error;
    }
}

async function userPermissionsRoles(access_token: string) {
        console.log('>==== userPermissionsRoles ====<');
        console.log('>=== access_token ===< ', access_token);    
	
    try {
        const { client_id, userPermissionsRolesUrlToken } = OAUTHconfig;
        const response = await axios.get(userPermissionsRolesUrlToken,
            {
                params: {
                    AccessToken: access_token, // access_token | único parametro
                    ApplicationCode: client_id,
                },
                timeout: 5000 // 5 segundos
            }  
        );

	    console.log('userPermissionsRoles Response => ', response);

        return response.data; // VERIFICAR SI DEVOLVEMOS response.data

    } catch (error) {
        if(axios.isAxiosError(error)) {
            console.error('Error OAuth userPermissionsRoles:', error.response?.data); // VERIFICAR SI DEVOLVEMOS response.data
            throw new HttpException(
                error.response?.status || 500,
                'No se pudo obtener los roles del usuario. Verifique el token de acceso (userPermissionsRoles).'
            );
        }
        throw error;
    }
}

