import passport from 'passport';
import { Strategy as SamlStrategy, type Profile, type SamlConfig, type VerifiedCallback } from '@node-saml/passport-saml';

const idpCertValue = `-----BEGIN CERTIFICATE-----
MIICmzCCAYMCBgGZTZZemTANBgkqhkiG9w0BAQsFADARMQ8wDQYDVQQDDAZ1bml6YXIwHhcNMjUw
OTE1MTMzMzQ0WhcNMzUwOTE1MTMzNTI0WjARMQ8wDQYDVQQDDAZ1bml6YXIwggEiMA0GCSqGSIb3
DQEBAQUAA4IBDwAwggEKAoIBAQCqnvblq+kpqdyPChRhh55bzyfhS348P5bl5iMyWITgBye8Vss6
m8vO1cUfYzBb+dftqRycM0H2Ne9hr+yCxytAbnYn2a4+htoJoAYwl1rp8/XAozSRaZYs08Y91c3a
5FJPxFo2wzxjDTd40ns1Sd9N2Hsmktgc1Lce8HVdGv//lZVVMECcDIx7vNex6kqui+7Dzz5elhg+
yVbBS+eg8v9Daw0N0ndMP+Q2CnA0tkV/YhTcpbq5+XTkH6a5Uz6W6rp4yzVPBeNmh5LmWawr2RLT
QT6lxWIeQ3ZA4PKz2RkdDa0+yqqxU8AlTxppwIof9QMQnaT/G9aTOrUCwbex3CE9AgMBAAEwDQYJ
KoZIhvcNAQELBQADggEBAH+lmvzR2cI2nzZsPd08IPN7iy5D9MqdIOyAei9Yw7hvebYpYa8tyi0F
AVPV86rN7QETPSP6awDug06cd/aTKMaGeF+wVBKRXda4O5Ip0lNPDvyntL8gUrU9Vm1P9rYkItgf
BxEFSHo7+3JqAClC3Lg2+dp6seixKGqQnLu0xttumWZkI1QZBNdtGwrGoqUq+Tr1hWmLX23gHVkv
wu4VSBe38nnZx7/BkvIk8/uqu1l8/8/fabYC7/t0iQbZUn7Ga00pRErSHf+qe7y09sPKe1FSjwL+
cq7HqbKbxVg0clcwuo4lE3XdF5zrXvoUJoY2uxZxRhhlmjlmby0XM8z8Ol4=
-----END CERTIFICATE-----`;

const entryPointValue = 'http://localhost:8080/realms/unizar/protocol/saml';

const samlConfig: SamlConfig = {
  issuer: process.env.SAML_SP_ENTITY_ID || 'edalitics',
  callbackUrl: process.env.SAML_ACS_URL || 'http://localhost:8666/auth/saml/acs',
  entryPoint: entryPointValue,
  idpCert: idpCertValue,
  identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
  wantAssertionsSigned: true,
  wantAuthnResponseSigned: false,
  acceptedClockSkewMs: 3 * 60 * 1000,
  // passReqToCallback: true,
};

// new Strategy(options, signonVerify, logoutVerify)
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
  (_profile: Profile | null, done: VerifiedCallback) => {
    // Para vetar el logout, hacer: done(null, false)
    done(null, true as unknown as Record<string, unknown>);
  }
);

passport.use('saml', samlStrategy);

// usando sesiones
passport.serializeUser((user: any, done) => done(null, user));
passport.deserializeUser((user: any, done) => done(null, user));

export default passport;