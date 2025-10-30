import { NextFunction, Request, Response } from 'express';
import { HttpException } from '../../global/model/index';
// import passport from './SAML_ORCL.passport';
import passport from '../SAML.passport';
import { samlStrategy } from '../SAML.passport';
import ServerLogService from '../../../services/server-log/server-log.service';
import { parseStringPromise } from 'xml2js';
import zlib from 'zlib';

// Importaciones necesarias 
import User, { IUser } from '../../admin/users/model/user.model';
import { UserController } from '../../admin/users/user.controller';

// Constantes necesarias 
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const SEED = require('../../../../config/seed').SEED;
const ORCL = require('../../../../config/bbdd_orcl').ORCL;
const SAMLconfig = require('../../../../config/SAMLconfig');

// Base de datos oracle
const oracledb = require("oracledb");
const origen = SAMLconfig.urlRedirection; // http://localhost:4200

// Grupos de Edalitics
import Group, { IGroup } from '../../admin/groups/model/group.model'

export class SAML_ORCL_Controller {

    static async login(req: Request, res: Response, next: NextFunction) {
        
        try {
            const rawReturn = (req.query as any)?.returnUrl
                        || (req.body as any)?.returnUrl
                        || `${req.headers.origin || (req.get('host') ? `http://${req.get('host')}` : `${origen}`)}/#/home`;

            // valida que sea una URL absoluta
            let relay: string;

            try {
                const u = new URL(String(rawReturn));
                // Lista de urls permitidas
                const allowed = [`${origen}`, 'https://tu-dominio.app'];
                if (!allowed.some(a => u.origin === a)) throw new Error('returnUrl no permitido');
                relay = u.toString();
            } catch {
                relay = `${origen}/#/home`;
            }

            const loginUrl = await (samlStrategy as any)._saml.getAuthorizeUrlAsync({
            additionalParams: { RelayState: relay, ForceAuthn: true  },
            });

            return res.json({ url: loginUrl });

        } catch (error: any) {
            console.error('loginUrl error:', error);
            return res.status(500).json({ status: 500, message: error?.message || 'Error generando URL de SSO' });
        }

    }

    static async acs(req: Request, res: Response, next: NextFunction) {
        return passport.authenticate('saml', async (err, user, info) => {
            if (err) {
            console.error('SAML ACS error:', err);
            return res.status(401).json({ error: String(err) });
            }
            if (!user) {
            console.error('SAML ACS no user:', info);
            return res.status(401).json({ error: 'No user from SAML', info });
            }

            try {
            let token: string;
            let userSAML: IUser = new User({ name: '', email: '', password: '', img: '', role: [] });

            insertServerLog(req, 'info', 'newLogin', user.email, 'attempt');

            const nameID = user.nameID
            const sessionIndex = user.attributes.sessionIndex;
        
            console.log('nameID: ', nameID);
            console.log('sessionIndex: ', sessionIndex);
            console.log('user: ', user);

            const email = user.email;
            const name = email.split('@')[0];
            const picture = '';

            if (!email) return next(new HttpException(400, 'Usuario no verificado por la Entidad SSO'));

            const userEda = await UserController.getUserInfoByEmail(email, true);

            console.log('================= CONEXION ORCL =================');
            // Recuperar los nombres de los roles de la conexion a Oracle
            // Entrar a la base de datos de EDALITICS y recuperar los id de los roles obtenido de la anterior conexion a Oracle
            // Una vez obtenido todos los ids de todos los roles, agregarlos al usuario en cuestion.

            console.log('name: ', name);
            console.log('email: ', email);

            // Obtencion de los roles de la base de datos Oracle    
            const roles = await getRoles(email);
            let roles_ids = []; // Variable de ids del usuario que esta haciendo login

            // Verificando en los grupos de edalitics
            const groups = await Group.find({}).exec();

            // agregando los ids de todos los roles que tiene el usuario
            roles.forEach((item) => roles_ids.push(groups.find((group) => String(group.name) == String(item.ROL))._id));
            console.log('roles_ids: ', roles_ids);
            
            if (!userEda) {
                // NUEVO USUARIO
                console.log('El USUARIO ES NUEVO...')
                const userToSave: IUser = new User({
                    name,
                    email,
                    password: bcrypt.hashSync('135792467811111111111115', 10),
                    img: picture,
                    role: roles_ids,
                });

                const userSaved = await userToSave.save();
                Object.assign(userSAML, userSaved);
            } else {
                // EL USUARIO YA EXISTE
                console.log('EL USUARIO YA EXISTE ...')
                userEda.name = name;
                userEda.email = email;
                userEda.password = bcrypt.hashSync('135792467811111111111115', 10);
                userEda.role = roles_ids;
                const userSaved = await userEda.save();
                Object.assign(userSAML, userSaved);
            }

            userSAML.password = ':)';
            console.log('userSAML ===> ', userSAML);

            const userPayload = {
                ...userSAML.toObject(),    // Todos los datos de usuario
                nameID: user.nameID,       // Se agrega nameID que proviene del IdP
                nameIDFormat: user.nameIDFormat, // Se agrega nameIDFormat que proviene del IdP
                sessionIndex: user.attributes?.sessionIndex  // Se agrega sessionIndex que proviene del IdP
            };        

            token = await jwt.sign({ user: userPayload }, SEED, { expiresIn: 14400 });

            // --- Sincronizar Grupos como en login normal ---
            await Group.updateMany({}, { $pull: { users: userSAML._id } });
            await Group.updateMany({ _id: { $in: roles_ids } }, { $push: { users: userSAML._id } }).exec();

            // --------- REDIRECCIÓN A ANGULAR CON JWT ---------
            // Utiliza el RelayState si viene, "se manda al iniciar el SSO" o un default a #/login
            const defaultRelay = `${origen}/#/login?next=%2Fhome`;
            const relayRaw = (req.body as any)?.RelayState || defaultRelay;

            // (Opcional) Lista accesible de orígenes para evitar open redirect
            let relayState = relayRaw;
            try {
                const u = new URL(relayRaw);
                const allowed = [`${origen}`]; // Dominio para producción
                if (!allowed.includes(u.origin)) relayState = defaultRelay;
            } catch {
                relayState = defaultRelay;
            }

            // Anexa ?token= al query del hash "#/login?token=..."
            const sep = relayState.includes('?') ? '&' : '?';
            const redirectTo = `${relayState}${sep}token=${encodeURIComponent(token)}`;


            return res.redirect(302, redirectTo);
            } catch (error) {
            return next(error);
            }
        })(req, res, next);
    }

    static metadata(_req: Request, res: Response) {
        const publicCert = (process.env.SAML_SP_PUBLIC_CERT || '').replace(/\\n/g, '\n') || undefined;
        const xml = samlStrategy.generateServiceProviderMetadata(
        /* decryptionCert */ undefined,
        /* signingCert    */ publicCert
        );
        res.type('application/xml').send(xml);
    }

    static async requestLogout(req: Request, res: Response, next: NextFunction) {
        try {

        console.log('req.user: ', req.user);
        const nameID = req.user.nameID;
        const nameIDFormat = req.user.nameIDFormat;
        const sessionIndex = req.user.sessionIndex;

        // Si no tenemos datos SAML: hacemos logout local (frontend) y redirect
        if (!nameID && !sessionIndex) return res.redirect(302, `${origen}/#/login`);

      // Construir "profile" para getLogoutUrlAsync (Sirve para la peticion de logout)
        const profile = {
            nameID,
            nameIDFormat,
            sessionIndex
        };

        // RelayState: a dónde volver en tu frontend cuando logout termine en IdP
        const relayState = `${origen}/#/login`;

        console.log('relayState: ', relayState);
        console.log('Logout profile:', profile);

        // Pedir URL de logout al saml implementation
        const saml: any = (samlStrategy as any)._saml;
        const logoutUrl = await saml.getLogoutUrlAsync(profile, relayState, {});

        console.log('logoutUrl: ', logoutUrl);

        // Redirigir navegador al IdP para completar el SLO
        return res.redirect(302, logoutUrl);
        } catch (error) {
        console.error('SAML logout error:', error);
        return next(error);
        }
    }

    static async logout(req: Request, res: Response, next: NextFunction) {
        try {
        const saml: any = (samlStrategy as any)._saml;
        let result;

        console.log(' ############################### CORRECTO ###############################');
        const samlResponse = req.body.SAMLResponse;
        const relayState = req.body.RelayState;

        // Si no se recibe respuesta del SAML
        if (!samlResponse) return res.status(400).send('No SAMLResponse received');

        try {
            result = await saml.validatePostResponseAsync(
            { SAMLResponse: String(samlResponse) },
            { skipSignatureValidation: false } // true solo para test; quitar en producción una vez tengas cert + cache ok
            );
            console.log('result', result);

        } catch (error) {
            console.warn('validatePostResponseAsync error, trying fallback parse:', error?.message || error);

            try {
            const xml = decodeBase64PossiblyDeflated(String(samlResponse));
            const parsedXml = await parseStringPromise(xml, { explicitArray: false });
            const logoutResp = parsedXml['samlp:LogoutResponse'] || parsedXml['LogoutResponse'] || parsedXml;
            const statusCode =
                logoutResp?.['samlp:Status']?.['samlp:StatusCode']?.['$']?.Value ||
                logoutResp?.Status?.StatusCode?.['$']?.Value;
            
            console.log('xml: ', xml)
            console.log('parsedXml: ', parsedXml)
            console.log('logoutResp: ', logoutResp)
            console.log('statusCode: ', statusCode)

            if(!statusCode) {
                console.warn('No StatusCode found in SAMLResponse fallback parse');
            } else if(String(statusCode).endsWith(':Success')) {
                return res.redirect(302, `${origen}`);
            } else {
                console.warn('SAMLResponse status not success:', statusCode);
                return res.status(400).send('Logout not successful');
            }

            } catch (error) {
            console.warn('SAMLResponse status not success:', error);
            return next(error);
            }
        }

        } catch (error) {
        console.error('SLS error:', error);
        return next(error);
        }

        // Helper para el Buffer
        function decodeBase64PossiblyDeflated(b64: string) {
        const buf = Buffer.from(b64, 'base64');
        try {
            return zlib.inflateRawSync(buf).toString();
        } catch {
            return buf.toString();
        }
        }

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

async function getRoles(email) {
    let connection;

    try {
        connection = await oracledb.getConnection({
            user: ORCL.bbdd_host,
            password: ORCL.bbdd_pass,
            connectString:  `${ORCL.bbdd_user}:${ORCL.bbdd_port}/${ORCL.bbdd_bbdd}`
        })

        const result = await connection.execute(
            ORCL.authorization_sql, 
            { email: { val: email, type: oracledb.STRING }},
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        return result.rows || [];

    } catch (error) {
        console.error("Error al consultar Oracle:", error);
        throw error;
    } finally{
        if(connection) {
            try {
                await connection.close();
            } catch (error) {
                console.error("Error cerrando conexión:", error);
            }
        }
    }
}