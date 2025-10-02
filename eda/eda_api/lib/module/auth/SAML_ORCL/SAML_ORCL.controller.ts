import { NextFunction, Request, Response } from 'express';
import { HttpException } from '../../global/model/index';
import passport from './SAML_ORCL.passport';
import { samlStrategy } from './SAML_ORCL.passport';
import ServerLogService from '../../../services/server-log/server-log.service';
import { parseStringPromise } from 'xml2js';

// Importaciones necesarias
import User, { IUser } from '../../admin/users/model/user.model';
import { UserController } from '../../admin/users/user.controller';

// Constantes necesarias
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const SEED = require('../../../../config/seed').SEED;
const ORCL = require('../../../../config/bbdd_orcl').ORCL;

// Base de datos oracle
const oracledb = require("oracledb");

// Grupos de Edalitics
import Group, { IGroup } from '../../admin/groups/model/group.model'



export class SAML_ORCL_Controller {


    static async login(req: Request, res: Response, next: NextFunction) {
        
        try {
            const rawReturn = (req.query as any)?.returnUrl
                        || (req.body as any)?.returnUrl
                        || `${req.headers.origin || (req.get('host') ? `http://${req.get('host')}` : 'http://localhost:4200')}/#/home`;

            // valida que sea una URL absoluta
            let relay: string;

            try {
                const u = new URL(String(rawReturn));
                // Lista permitida
                const allowed = ['http://localhost:4200', 'https://tu-dominio.app'];
                if (!allowed.some(a => u.origin === a)) throw new Error('returnUrl no permitido');
                relay = u.toString();
            } catch {
                relay = 'http://localhost:4200/#/home';
            }

            const loginUrl = await (samlStrategy as any)._saml.getAuthorizeUrlAsync({
            additionalParams: { RelayState: relay },
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

            insertServerLog(req, 'info', 'newLogin', user.nameID, 'attempt');

            const email = user.nameID;
            const name = user.nameID;
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
            token = await jwt.sign({ user: userSAML }, SEED, { expiresIn: 14400 });

            // --- Sincronizar Grupos como en login normal ---
            await Group.updateMany({}, { $pull: { users: userSAML._id } });
            await Group.updateMany({ _id: { $in: roles_ids } }, { $push: { users: userSAML._id } }).exec();

            // --------- REDIRECCIÓN A ANGULAR CON JWT ---------
            // Utiliza el RelayState si viene, "se manda al iniciar el SSO" o un default a #/login
            const defaultRelay = 'http://localhost:4200/#/login?next=%2Fhome';
            const relayRaw = (req.body as any)?.RelayState || defaultRelay;

            // (Opcional) Lista accesible de orígenes para evitar open redirect
            let relayState = relayRaw;
            try {
                const u = new URL(relayRaw);
                const allowed = ['http://localhost:4200']; // Dominio para producción
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