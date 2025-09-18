import { NextFunction, Request, Response } from 'express';
import passport from './SAML.passport';
import { samlStrategy } from './SAML.passport';


export class SAMLController {


    static async login(req: Request, res: Response, next: NextFunction) {

        // Redirige al IdP
        return passport.authenticate('saml', {
        failureRedirect: '/login?error=saml',
        })(req, res, next);

    }

    static acs(req: Request, res: Response, next: NextFunction) {
        console.log('holaaaaa')

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
            // éxito → usuario queda en req.user (vía sesión)
            return res.redirect('/protected'); // ajusta a tu ruta de éxito
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