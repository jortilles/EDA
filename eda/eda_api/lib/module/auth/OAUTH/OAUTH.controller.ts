import { NextFunction, Request, Response } from 'express';
import { HttpException } from '../../global/model/index';
import axios from 'axios';
import qs from 'qs';
// import { userDataValue, authenticationEvidenceValue, userPermissionsValue, userPermissionsRolesValue } from './dataTest'
import ServerLogService from '../../../services/server-log/server-log.service';
import User, { IUser } from '../../admin/users/model/user.model';
import Group, { IGroup } from '../../admin/groups/model/group.model'
import { UserController } from '../../admin/users/user.controller';

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const SEED = require('../../../../config/seed').SEED;
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
            
            console.log('code: ', code);
            console.log('state: ', state);
            
            //=============================================================================================== */
            //=============================================================================================== */
            //=============================================================================================== */


            // //*************************************************************************** */

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

            //*************************************************************************** */
            
            //=============================================================================================== */
            //=============================================================================================== */
            //=============================================================================================== */

            // REDIRECION PARA EL INICIO DE SESION

            let token: string;
            let { identifier, companyName, name, email, companyId } = userDataValue
            let user: IUser = new User({name: '', email: '', password: '', img: '', role: []});

            insertServerLog(req, 'info', 'newLogin', email, 'attempt');

            // Verificamos al usuario
            if (!email) return next(new HttpException(400, 'Usuario no verificado'));

            const userEda = await UserController.getUserInfoByEmail(email, true);

            ////////////////////////////////////////////////////////
            /////////////// INICIO DE CREACION DE ROL //////////////
            ////////////////////////////////////////////////////////

            let role_id = []; // Variable role_id

            try {
                // Upsert: si existe devuelve el documento, si no, lo crea
                const groupDoc = await Group.findOneAndUpdate(
                    { role: companyId }, // criterio de búsqueda
                    {
                        $setOnInsert: {
                            name: companyName,
                            role: companyId,
                            users: [],
                            img: ''
                        }
                    },
                    {
                        new: true,    // devuelve el documento actualizado o recién insertado
                        upsert: true, // crea si no existe
                    }
                ).exec();

                if (groupDoc && groupDoc._id) {
                    role_id.push(groupDoc._id);
                }

            } catch (err: any) {
                console.error(`Error creando o actualizando grupo "${companyName}":`, err.message);
            }

            console.log('role_id: ', role_id);

            ////////////////////////////////////////////////////////
            //////////////// FIN DE CREACION DE ROL ////////////////
            ////////////////////////////////////////////////////////

            if(!userEda) {
                console.log('===> USUARIO NUEVO ===>');

                const userToSave: IUser = new User({
                    name: name,
                    email: email,
                    password: bcrypt.hashSync('no_serveix_de_re_pero_no_pot_ser_null', 10),
                    img: 'imagen', // Agregar la imagen
                    role: role_id,
                    creation_date: new Date()
                });
                
                const userSaved = await userToSave.save();
                Object.assign(user, userSaved);

            } else {

                console.log('===> USUARIO NO ES NUEVO ===>');

                console.log('userEda: ', userEda);

                userEda.name = name;
                userEda.email = email;
                userEda.password = bcrypt.hashSync('no_serveix_de_re_pero_no_pot_ser_null', 10); 
                userEda.role = role_id;
                const userSaved = await userEda.save(); 
                Object.assign(user, userSaved);
            }  

            user.password = ':)';

            const userPayload = {
                ...user.toObject(), // Todos los datos de usuario
                nameDG: name, 
                identifierDG: identifier,
                companyNameDG: companyName,
                companyIdDG: companyId
            };   

            console.log('userPayload ===> ', userPayload);

            token = await jwt.sign({ user: userPayload }, SEED, { expiresIn: 14400 });

            // Borramos todos los grupos del usuario actualizado
            await Group.updateMany({}, { $pull: { users: user._id } });
            // Introducimos de nuevo los grupos del usuario actualizado
            await Group.updateMany({ _id: { $in: role_id } }, { $push: { users: user._id } });


            // ----------------------------- REDIRECCIÓN AL LOGIN -----------------------------

            // const defaultRelay = `http://localhost:4200/#/login?next=%2Fhome`;
            const defaultRelay = `${OAUTHconfig.urlRedirection}/#/login?next=%2Fhome`;
            const relayRaw = (req.body as any)?.RelayState || defaultRelay;

            // (Opcional) Lista accesible de orígenes para evitar open redirect
            let relayState = relayRaw;
            try {
                const u = new URL(relayRaw);
                const allowed = [`${OAUTHconfig.urlRedirection}`]; // Dominio para producción
                if (!allowed.includes(u.origin)) relayState = defaultRelay;
            } catch {
                relayState = defaultRelay;
            }

            // Agregamos el Token en la redicción exitosa
            const sep = relayState.includes('?') ? '&' : '?';
            const redirectTo = `${relayState}${sep}token=${encodeURIComponent(token)}`;

            return res.redirect(302, redirectTo);

        } catch (error) {
            return next(error);
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

function insertServerLog(req: Request, level: string, action: string, userMail: string, type: string) {
    const ip = req.headers['x-forwarded-for'] || req.get('origin')
    var date = new Date();
    var month =date.getMonth()+1 ;
    var monthstr=month<10?"0"+month.toString(): month.toString();
    var day = date.getDate();
    var daystr=day<10?"0"+day.toString(): day.toString();
    var date_str = date.getFullYear() + "-" + monthstr + "-" + daystr + " " +  date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
    ServerLogService.log({ level, action, userMail, ip, type, date_str});
}
