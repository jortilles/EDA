import { NextFunction, Request, Response } from 'express';
import passport from './SAML.passport';
import { samlStrategy } from './SAML.passport';
import { parseStringPromise } from 'xml2js';


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

            const { SAMLResponse, RelayState } = req.body;

            if(!SAMLResponse) return res.status(400).json({error: 'Missing SAMLResponse'});
            
            // Parseo del xml
            const xml = Buffer.from(SAMLResponse, 'base64').toString('utf8');
            const doc = await parseStringPromise(xml, { explicitArray: true, tagNameProcessors: [ (n)=>n ] })

            // Extracción de los resultados
            const resp = doc['samlp:Response'] || doc.Response;
            const assertion = resp?.['saml:Assertion']?.[0] || resp?.Assertion?.[0];

            // console.log('resp::::: ',resp);
            // console.log('assertion::::: ',assertion);

            const nameIDNode = assertion?.['saml:Subject']?.[0]?.['saml:NameID']?.[0] || assertion?.Subject?.[0]?.NameID?.[0];
            const nameID = (typeof nameIDNode === 'string') ? nameIDNode : (nameIDNode?._ ?? '');

            // console.log('attrs::::: ',nameIDNode);
            // console.log('attrNodes::::: ',nameIDNode);

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
            console.log('nameID::::: ',nameID);

            
        } catch (error) {
            console.log('Error en la decodificación del SAML ... ', error);
        }


        return passport.authenticate('saml', (err, user, info) => {

        if (err) {
            console.error('SAML ACS error:', err);
            return res.status(401).json({ error: String(err) });
        }
        if (!user) {
            console.error('SAML ACS no user:', info);
            return res.status(401).json({ error: 'No user from SAML', info });
        }


        req.login(user, (loginErr) => {
            if (loginErr) return next(loginErr);

            console.log('user::::::::::::::: ', user);

            // éxito → usuario queda en req.user (vía sesión)
            return res.redirect('http://localhost:4200/#/home'); // ajusta a tu ruta de éxito
        });
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