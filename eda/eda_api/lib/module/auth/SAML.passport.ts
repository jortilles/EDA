import passport from 'passport';
import { Strategy as SamlStrategy, type Profile, type SamlConfig, type VerifiedCallback } from '@node-saml/passport-saml';
const SAMLconfig = require('../../../config/SAMLconfig');


const samlConfig: SamlConfig = {
  issuer: process.env.SAML_SP_ENTITY_ID || SAMLconfig.issuer,
  callbackUrl: process.env.SAML_ACS_URL || SAMLconfig.callbackUrl,
  entryPoint: SAMLconfig.entryPointValue,
  idpCert: SAMLconfig.idpCert,
  logoutUrl: SAMLconfig.logoutUrl,
  identifierFormat: SAMLconfig.identifierFormat,
  wantAssertionsSigned: SAMLconfig.wantAssertionsSigned,
  wantAuthnResponseSigned: SAMLconfig.wantAuthnResponseSigned,
  acceptedClockSkewMs: SAMLconfig.acceptedClockSkewMs,
  // passReqToCallback: true,
};

// new Strategy (options, signonVerify, logoutVerify)
export const samlStrategy = new SamlStrategy(
  samlConfig,

  // signonVerify (login)
  (profile: Profile | null, done: VerifiedCallback) => {
    if (!profile) return done(new Error('Empty SAML profile'));
    const user = {
      id: profile.nameID,
      email:
        (profile as any).email ||
        (profile as any).mail ||
        (profile as any)['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'],
      nameID: profile.nameID,
      nameIDFormat: (profile as any).nameIDFormat,
      attributes: profile,
    };
    done(null, user);
  },

  // logoutVerify (SLO) – mínimo viable
  (profile: Profile | null, done: VerifiedCallback) => {
    if (!profile) return done(new Error('Empty SAML logout profile'));

    // opcional: aquí podrías validar que nameID y sessionIndex existan en BD
    // const user = await User.findOne({ 'saml.nameID': profile.nameID });
    // if (!user) return done(new Error('User not found for SLO'));

    done(null, profile); // retorna el profile tal cual, para que passport-saml genere LogoutResponse correctamente
  }
);

passport.use('saml', samlStrategy);

// usando sesiones
passport.serializeUser((user: any, done) => done(null, user));
passport.deserializeUser((user: any, done) => done(null, user));

export default passport;