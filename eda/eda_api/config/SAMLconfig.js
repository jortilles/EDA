const applyConfigOverwrite = require('./apply-config-overwrite');

module.exports = applyConfigOverwrite('saml_config', {
    // Para un nuevo cliente se debe agregar el nuevo certificado a continuación del ultimo certificado

    issuer: 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
    callbackUrl: 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
    entryPointValue: 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
    idpCert: `-----BEGIN CERTIFICATE-----
xxxxxxxxxxxxxxxxxxxxxxxxxx
-----END CERTIFICATE-----`,
    privateKey: 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
    publicCert: 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
    logoutUrl: 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
    identifierFormat: 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
    wantAssertionsSigned: false,
    wantAuthnResponseSigned: false,
    acceptedClockSkewMs: 3*6*9,
    urlRedirection: 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
});