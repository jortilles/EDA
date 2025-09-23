import { NextFunction, Request, Response } from 'express';
import { HttpException } from '../../global/model/index';
import passport from './SAML.passport';
import { samlStrategy } from './SAML.passport';
import ServerLogService from '../../../services/server-log/server-log.service';
import { parseStringPromise } from 'xml2js';

// Importaciones necesarias
import User, { IUser } from '../../admin/users/model/user.model';
import { UserController } from '../../admin/users/user.controller';

// constantes necesarias
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const SEED = require('../../../../config/seed').SEED;


export class SAMLController {


    static async login(req: Request, res: Response, next: NextFunction) {

        // Redirige al IdP
        return passport.authenticate('saml', {
        failureRedirect: '/login?error=saml',
        })(req, res, next);

    }

    static async acs(req: Request, res: Response, next: NextFunction) {
        

        // console.log('req.body: ', req.body);

        try {

            // const { SAMLResponse, RelayState } = req.body;

            // if(!SAMLResponse) return res.status(400).json({error: 'Missing SAMLResponse'});

            // // Parseo del xml
            // const xml = Buffer.from(SAMLResponse, 'base64').toString('utf8');
            // const doc = await parseStringPromise(xml, { explicitArray: true, tagNameProcessors: [ (n)=>n ] })

            // // Extracción de los resultados
            // const resp = doc['samlp:Response'] || doc.Response;
            // const assertion = resp?.['saml:Assertion']?.[0] || resp?.Assertion?.[0];

            // console.log('resp::::: ',resp);
            // console.log('assertion::::: ',assertion);
            // console.log('assertion.ID::::: ',assertion['$'].ID);

            // const nameIDNode = assertion?.['saml:Subject']?.[0]?.['saml:NameID']?.[0] || assertion?.Subject?.[0]?.NameID?.[0];
            // const nameID = (typeof nameIDNode === 'string') ? nameIDNode : (nameIDNode?._ ?? '');

            // console.log('nameIDNode::::: ',nameIDNode);
            // console.log('nameID::::: ',nameID);

            // const attrs: Record<string, string | string[]> = {};
            // const attrNodes = assertion?.['saml:AttributeStatement']?.[0]?.['saml:Attribute'] || assertion?.AttributeStatement?.[0]?.Attribute || [];

            // console.log('attrs::::: ',attrs);
            // console.log('attrNodes::::: ',attrNodes);


            // for (const a of attrNodes) {
            //     const name = a.$?.Name || a.$?.FriendlyName || 'unknown';
            //     const values = (a['saml:AttributeValue'] || a.AttributeValue || [])
            //         .map((v: any) => (typeof v === 'string' ? v : (v?._ ?? '')))
            //         .filter((v: string) => v !== '');
            //      attrs[name] = values.length <= 1 ? (values[0] ?? '') : values;
            // }

            // console.log('RelayState::::: ',RelayState);
            // console.log('nameID::::: ',nameID);

            
        } catch (error) {
            console.log('Error en la decodificación del SAML ... ', error);
        }


        return passport.authenticate('saml', async (err, user, info) => {

            console.log('err: ', err)
            console.log('user: ', user)
            console.log('info: ', info)

            if (err) {
                console.error('SAML ACS error:', err);
                return res.status(401).json({ error: String(err) });
            }
            if (!user) {
                console.error('SAML ACS no user:', info);
                return res.status(401).json({ error: 'No user from SAML', info });
            }

            try {

                let userSAML: IUser = new User({ name: '', email: '', password: '', img: '', role: [] }); 
                let token: string;
                
                insertServerLog(req, 'info', 'newLogin', user.nameID, 'attempt');

                // extraemos sessionIndex de la variable user para generar un password dinámico.
                const email_verified = user.nameID;
                const email = user.nameID;
                const name = user.nameID;
                const picture = '';
                const given_name = '';
                const family_name = '';
                const sessionIndex = user.sessionIndex;

                if(email_verified) {
                    
                    if(email=='edaanonim@jortilles.com') {
                        console.log('Este es el correo de edaanonim@jortilles.com'); 
                    }

                    const userEda = await UserController.getUserInfoByEmail(email, true);

                    // usuario no resgistrado, es un usuario nuevo para hacer un nuevo registro
                    if(!userEda) {

                            const userToSave: IUser = new User({
                                name: name,
                                email: email,
                                password: bcrypt.hashSync('135792467811111111111110', 10),
                                img: picture,
                                role: '135792467811111111111110' // validar con Juanjo
                            });
                        userToSave.save(async (err, userSaved) => {
                            if(err) return next(new HttpException(400, 'Some error ocurred while creating the User'));
                            Object.assign(userSAML, userSaved);
                            userSAML.password = ':)';
                            token = await jwt.sign({userSAML}, SEED, {expiresIn: 14400});
                            console.log('USUARIO NUEVO .... ', userSAML);
                            return res.status(200).json({userSAML, token: token, id: userSAML._id});
                        });
                    } else {
                        userEda.name = name;
                        userEda.email = email;
                        userEda.password = bcrypt.hashSync('135792467811111111111110', 10);
                        userEda.role = '135792467811111111111110';
                        userEda.save(async (err, userSaved) => {
                            if(err) return next(new HttpException(400, 'Some error ocurred while creating the User'));
                            Object.assign(userSAML, userSaved);
                            userSAML.password = ':)';
                            token = await jwt.sign({userSAML}, SEED, {expiresIn: 14400});
                            console.log('USUARIO YA CREADO .... ', userSAML);
                            return res.status(200).json({userSAML, token: token, id: userSAML._id})
                        });
                    }

                } else {
                    return next(new HttpException(400, 'Usuario no verificado por la Entidad SSO'));
                }
            } catch (error) {
                next(error)
            }



            // req.login(user, (loginErr) => {
            //     if (loginErr) return next(loginErr);

            //     console.log('user::::::::::::::: ', user);

            //     // éxito → usuario queda en req.user (vía sesión)
            //     return res.redirect('http://localhost:4200/#/home'); // ajusta a tu ruta de éxito
            // });
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