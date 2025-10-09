import passport from 'passport';
import { Strategy as SamlStrategy, type Profile, type SamlConfig, type VerifiedCallback } from '@node-saml/passport-saml';


const idpCertValue = [
`-----BEGIN CERTIFICATE-----
MIIE/zCCA2egAwIBAgIUN3HaijMeBkhkXL1k8WQ9a9FlJLcwDQYJKoZIhvcNAQEL
BQAwgY4xCzAJBgNVBAYTAkVTMQ8wDQYDVQQIDAZBUkFHT04xETAPBgNVBAcMCFph
cmFnb3phMQ8wDQYDVQQKDAZVbmlaYXIxDjAMBgNVBAsMBXNpY3V6MRYwFAYDVQQD
DA1zaXIudW5pemFyLmVzMSIwIAYJKoZIhvcNAQkBFhNkaXJzaWNyZWRAdW5pemFy
LmVzMB4XDTI1MDMxMTEwMjAzNloXDTQ0MDUxMDEwMjAzNlowgY4xCzAJBgNVBAYT
AkVTMQ8wDQYDVQQIDAZBUkFHT04xETAPBgNVBAcMCFphcmFnb3phMQ8wDQYDVQQK
DAZVbmlaYXIxDjAMBgNVBAsMBXNpY3V6MRYwFAYDVQQDDA1zaXIudW5pemFyLmVz
MSIwIAYJKoZIhvcNAQkBFhNkaXJzaWNyZWRAdW5pemFyLmVzMIIBojANBgkqhkiG
9w0BAQEFAAOCAY8AMIIBigKCAYEAtTy8ktBBN3XCcVif/jxsoeu1yJiVZyuwWYt6
ljqFBTP9dQL+q/OTDleI6+x5Y+vbc/kbtNI/hEGbI6YU/MenAcvbt8e9MZv1eLNR
fqrJ/2Q0WOXmYMO3yQuxILUFdemhaqfNBxgxyEuDHbQhDujRoTgyurLl2ndX+Xrp
ZtwcEBP8VvqEoKMkF0qTYDDNp7wybLMK2T+5P/AYbb8CSKae5Ff07XTgfFGEmt5w
OgTZuJAK4yf8kLVOLm+2J92PW3TtZgGb2/xxnm6QBpW7QZGg5+7x4qWTXtC2gtvD
OMAG1IJPrr0FlSWrTCeH0wjR3ZtdXki1cE4zT96VSM9TO89zO3nrBnAmdibqj93r
4IUpBsFhEsbhMmY6M1v/Uiz9R1TtI3fLG/x7M3unPPfepCYcq8prXWj/SXL6br0P
0eDYHxbIqnptnnpj+Mr/pIPvfLL1C0POr0QMSq2c6SK53LlncEjGqIDzB6kNwaBK
dkvQi2gEIzeJucX1eZTtZ/UDXY6zAgMBAAGjUzBRMB0GA1UdDgQWBBSPT4NyCwDm
LjbDwOVoCMq52qNJmTAfBgNVHSMEGDAWgBSPT4NyCwDmLjbDwOVoCMq52qNJmTAP
BgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3DQEBCwUAA4IBgQBnTYO+MMe4v8nzQleY
UnbT8nrxvyUU272XZzqMzv9LZ+qNzH75xOkN+oeFBLuaKyrifLNXb4DYy8A2Hn/we
rtr1lbIkLL0ZeZHLzUK0fumWcoX9fYOxV4jWB/yhgyQZaEHZrafkc0yKRpIeQbOo3
5dv5ZZlETnLvzNGtiCMumgO65HUfk6LmgnI1gwIvNZTnSAcWtT3sApGCLKRKssdIR
tqxMOlA+0vY2N0Bch9UVnRMXnGuoooLVKaqA+5xFo+IlNEM9fphOBFQf/AmUu2weE
0OvbExWy11nQaFjaVJufgAsUBz2kjX+uOpHc94FVrK7UQXp9Qwi+IDIWCBxSPWOdL
w+VlXAqAzpiC3aMuOO08C4o1Lcdoc8IPsNaftom+CCJIH6nKDTLArqbq1k5S7VHw
CPDdEUleInV32iVjK7YrVtAUnJY+r4wcxHcWFGDLCv6+kS+jxFKkDPIFISBxi5bv
6h9UAqoCPxmiuv4/d5QY2JdRhd93WqIIPKW/TbpMiU=
-----END CERTIFICATE-----`,

`-----BEGIN CERTIFICATE-----

MIIDzTCCArUCFAr2vM+dI0StgD6GT7YNh8UHxwK8MA0GCSqGSIb3DQEBCwUAMIGi
MQswCQYDVQQGEwJFUzERMA8GA1UECAwIWmFyYWdvemExETAPBgNVBAcMCFphcmFn
b3phMSAwHgYDVQQKDBdVbml2ZXJzaWRhZCBkZSBaYXJhZ296YTEOMAwGA1UECwwF
U0lDVVoxGTAXBgNVBAMMEHNpcmZvci51bml6YXIuZXMxIDAeBgkqhkiG9w0BCQEW
EWFkbW1haWxAdW5pemFyLmVzMB4XDTIxMDMxMTE5MDYyMVoXDTI1MDMxMDE5MDYy
MVowgaIxCzAJBgNVBAYTAkVTMREwDwYDVQQIDAhaYXJhZ296YTERMA8GA1UEBwwI
WmFyYWdvemExIDAeBgNVBAoMF1VuaXZlcnNpZGFkIGRlIFphcmFnb3phMQ4wDAYD
VQQLDAVTSUNVWjEZMBcGA1UEAwwQc2lyZm9yLnVuaXphci5lczEgMB4GCSqGSIb3
DQEJARYRYWRtbWFpbEB1bml6YXIuZXMwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAw
ggEKAoIBAQCmk6Ylaxmfpq0MbKinbyfOqEbl/h7x6zKQ9TFdJZjAdVu7ngyxx9cN
1D9yQqXxOMUMAS/I73k03pXrEqEPNuAB7yO1TT54kxUnrFd8m0xaRDi05djdiokP
U1Z4m2tqww8/TrtXByjhQoLM8yN/l9Pa5DqsBCDFnFAcLx4yZupsMmYpuJPn156l
Mf7pk5ylTNEP80cYFpmXVOYnouNa3O1DwXZuhfRtYysv2C7LyTYIqRlU/E/A4sKh
Ulpy36A5p4kbnF8xs07FWUDzR5htneFaMwVn8nHvj09t2w/j3Gio6CqifF1fwzVo
GWaWhqFSSqnRhztraJvOK419piUuiCvbAgMBAAEwDQYJKoZIhvcNAQELBQADggEB
AJWFF+OepVLjaf2iICEEttlL4Sq3FTGPH/nnJ3V913rFg2Z63BttRlZxZPrzKk+6
HE3XtJCocE+kMrzplqWACfQj0j6L1WvpPVe3fE+g+edriVhPxyfiI3/8AWvO5w/0
vvUk9TSSyh/1iEXAAbg8NmAvJ7vCSP+7fezkkzcMOwbUi1m1okeyMx7m9DuX6eD1
Go+wruwrmlqiE9ArCyX3YquoVxH4Elanl6dWdPw7LnnoYySXB9Nj35LZn1k8bqXa
NjqI+y3/94I1qJrN8tkIhXzyAwxNrggiRfsItwdm6nzhzPcgi9iIdOkDayBfWVX+
aWb+KxAgC3roAM3sNyIYHaY=
-----END CERTIFICATE-----`
];


const entryPointValue = 'https://sir3.unizar.es/simplesamlphp/saml2/idp/metadata.php';

const samlConfig: SamlConfig = {
  issuer: process.env.SAML_SP_ENTITY_ID || 'edalitics',
  callbackUrl: process.env.SAML_ACS_URL || 'https://edalitics.com/unizarapi/auth/saml/acs',  // https://edalitics.com/unizarapi/auth/saml/acs
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