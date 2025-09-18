import passport from 'passport';
import { Strategy as SamlStrategy, type Profile, type SamlConfig, type VerifiedCallback } from '@node-saml/passport-saml';

// const idpCertValue = "-----BEGIN CERTIFICATE-----\nMIIEoTCCAokCBgGZTaQ3vjANBgkqhkiG9w0BAQsFADAUMRIwEAYDVQQDDAllZGFsaXRpY3MwHhcNMjUwOTE1MTM0ODUxWhcNMjgwOTE1MTM1MDMwWjAUMRIwEAYDVQQDDAllZGFsaXRpY3MwggIiMA0GCSqGSIb3DQEBAQUAA4ICDwAwggIKAoICAQDCbo3Mm5+FsQlw5eS26TJyuelafozWHxCb16zLtPH/2VyhhEi0T2WGnxCQx5ymliD12/zd3uzf3p7JXcm2DyjvkZWoQkLFVsFzZe7H2TcPdgU0ZXscw9I1wmjJFYg+e1+0Bogbdzu20+XXrHLdGMAaV7X2qKSjv3kHNa3c/THGYiT9yCqrHw9Awh90aHwUkyFZ0dkIiUDIPLvSO7CAvjpw3TL852p7brjovruPicKJbSe6OKuupA0CuVVY12DfC+iIzXFQhpalBJjqHIWyfvywNxsC7iOKJ6RyZoIbElPlvPkzFz+AwRHvVgS1ioMlMzxvQG+M4qci1ZEuIvunv5FexyF+Rp7KaXT+JBDzLaiw3J+lToKq3W75cLU8mXGxk5VhtewmpwrwLYLduDg/lJzwJkuar4X+ZASl5nVHbQx59E7yVkEis5oZNTY9cHFH26NFce/8es1ostOjtGfpYGXNrWjHPVRXYdFcVnB+YI8boTXNWcKA2oiRE+4JaIONBoX/vy5Ybq4PlX/DAsTMrchccLaaqWGq0AyeTM/mrF2F4/Sci6ON1o+9Zfy/JmYHkldQphKoI+5Raf1AE5S1pU9Ca2w2KV9Psf5H6J/xd4/m/+j2kbB1ZbKDiNc8BWZPjsuJXY7So0o3MguSZF1ucSZWScYG4Ep2t8ZrLYDd0q9Z5wIDAQABMA0GCSqGSIb3DQEBCwUAA4ICAQBLg4DaEkplUHstorPXlvCmR6fP6lkewdziTP11E8YVtZ4TPslkvnt7LNwN+ECHauiKTqSQhc3DvNatIvgrgaA/IsZ4PNlt/d6/Kyr7kmy1piJCdZ0WGii23W0wZHSWNHQUQpqjVYJdVK3La0X8Hn1j/gzxVWuJx9YQysULGSsKffg3UgzJSRwjjtMdAkTrln9sHbDYp8sK0qxjrhqBfVCi+JUgsHvUr7V69JN1it/HjtZ5Uc4eJWUoPHhkOTWRplJiJGqAnf7Sz4EN0tLTlXJ8tKHCkG6nUFt/lYTNfMiG6zDM8a3F6Xyrt56Ql7bzBLNwzI/6majMWiC24WKEND+l+b0XyVvgHIIAbrKcMZHmBBQks0H1z+gQf0eS+AKAxpv+V2EizCrtcenGzwxPZr3cPe9eatVcky4Vjfwnx0u/GnRZS1ExegQGbgb5fmAuVSoE/2ZJv+3/3CgYcdUwFJKb6wt7PklpmHHbUg5lmglpKvc7nQtUA6TvlwjvQ0C//IT4La76c8+BhlG0Kvc9bMDN4sreJA8mmpiTOCLErhzXjM+iKrU67v6M7h9ehSf49UBjXlLVEE16WeAI1/bcj/+f1KnAr8soMcIPRro/rbpT517CYED3jQN7rvbuzn3QaYnp8e6nWpYOLzWIwR6fidk/eygXagVf9EhxIKz7cp3BjA==\n-----END CERTIFICATE-----";
// const entryPointValue = 'http://localhost:8080/realms/unizar/protocol/saml/descriptor';

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
    // Si quisieras vetar el logout, podrías hacer: done(null, false)
    done(null, true as unknown as Record<string, unknown>);
  }
);

passport.use('saml', samlStrategy);

// Si usas sesiones
passport.serializeUser((user: any, done) => done(null, user));
passport.deserializeUser((user: any, done) => done(null, user));

export default passport;