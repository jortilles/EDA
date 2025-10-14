import passport from 'passport';
import { Strategy as SamlStrategy, type Profile, type SamlConfig, type VerifiedCallback } from '@node-saml/passport-saml';

const idpCertValue = [
`-----BEGIN CERTIFICATE-----
MIICmzCCAYMCBgGZTZZemTANBgkqhkiG9w0BAQsFADARMQ8wDQYDVQQDDAZ1bml6YXIwHhcNMjUwOTE1MTMzMzQ0WhcNMzUwOTE1MTMzNTI0WjARMQ8wDQYDVQQDDAZ1bml6YXIwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCqnvblq+kpqdyPChRhh55bzyfhS348P5bl5iMyWITgBye8Vss6m8vO1cUfYzBb+dftqRycM0H2Ne9hr+yCxytAbnYn2a4+htoJoAYwl1rp8/XAozSRaZYs08Y91c3a5FJPxFo2wzxjDTd40ns1Sd9N2Hsmktgc1Lce8HVdGv//lZVVMECcDIx7vNex6kqui+7Dzz5elhg+yVbBS+eg8v9Daw0N0ndMP+Q2CnA0tkV/YhTcpbq5+XTkH6a5Uz6W6rp4yzVPBeNmh5LmWawr2RLTQT6lxWIeQ3ZA4PKz2RkdDa0+yqqxU8AlTxppwIof9QMQnaT/G9aTOrUCwbex3CE9AgMBAAEwDQYJKoZIhvcNAQELBQADggEBAH+lmvzR2cI2nzZsPd08IPN7iy5D9MqdIOyAei9Yw7hvebYpYa8tyi0FAVPV86rN7QETPSP6awDug06cd/aTKMaGeF+wVBKRXda4O5Ip0lNPDvyntL8gUrU9Vm1P9rYkItgfBxEFSHo7+3JqAClC3Lg2+dp6seixKGqQnLu0xttumWZkI1QZBNdtGwrGoqUq+Tr1hWmLX23gHVkvwu4VSBe38nnZx7/BkvIk8/uqu1l8/8/fabYC7/t0iQbZUn7Ga00pRErSHf+qe7y09sPKe1FSjwL+cq7HqbKbxVg0clcwuo4lE3XdF5zrXvoUJoY2uxZxRhhlmjlmby0XM8z8Ol4=
-----END CERTIFICATE-----`,
`-----BEGIN CERTIFICATE-----
MIICpzCCAY8CBgGZlcYibzANBgkqhkiG9w0BAQsFADAXMRUwEwYDVQQDDAxDQVNBX01BUlFVRVMwHhcNMjUwOTI5MTM1ODM0WhcNMzUwOTI5MTQwMDE0WjAXMRUwEwYDVQQDDAxDQVNBX01BUlFVRVMwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDAAjLyea7B8rUVxsONeP5vLZf0Mmlbr5hLh8E8P+eq4OuZ6oMhShlCMZNWojE6qllSpvM2SFGvQXGMAooltsb5lJkeNMPJ2Xex8SokBNjE262QjNHUnTbT+GFA3GypGweUXXtKhxveR9rPDDBj5jCgc07BZc1gVpEAGlz/VCtIZu84c8j2pL99UWotxPGjJmpyI84+5KVKNyqf+0KiHI4y7ceBjEwauocxPXEtYiO4Q3Uq1PjJmFRAROG8HqaZpLtlKbYU1Lk+/89aRshNETdQNfk4lKgLzdxEmDFsAFtaIaRzqO6CfVfASv5yZcfsy/Yj5zBM/M6v7YV2xdInBowNAgMBAAEwDQYJKoZIhvcNAQELBQADggEBAAt78FJHjnyPb3VrYlnCL9RwcwqjYojZ63pThN0EwJzWC+2pmLyfu83bnFwPsdSWRy/UVzEpyKpC4nx9JFU4rVYldvSM8jvmyUi5kQol7jCuBjq7KVfzBuEaP/b87Yy91oaMysExpBffIjc8oC9iNSXAF7hIwLdeaI2QtoIrZ7B1nxiGG0LwcTw4LZE4cuOlHenPZChhcD2OCcacOpYH3CNj21zmTw/+kdrHOvuoT11yOeyUAWM0GDLw6aijWs90GRiO8eKW+/oVH0cyg1jfPBfGSxdmU0MAAZP3MBecSPgDOCPV+oYRcqJAOmnwItF5leWwj1nOIvcWnEOIMw1CyQ0=
-----END CERTIFICATE-----`
];

const entryPointValue = 'http://localhost:8080/realms/CASA_MARQUES/protocol/saml';
const singleLogoutUrl = 'https://edalitics.com/unizarapi/auth/samlorcl/logout'; 

const samlConfig: SamlConfig = {
  issuer: process.env.SAML_SP_ENTITY_ID || 'edalitics',
  callbackUrl: process.env.SAML_ACS_URL || 'http://localhost:8666/auth/samlorcl/acs',
  entryPoint: entryPointValue,
  idpCert: idpCertValue,
  logoutUrl: singleLogoutUrl,
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