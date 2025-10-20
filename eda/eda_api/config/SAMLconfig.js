module.exports = {
    // Para un nuevo cliente se debe agregar el nuevo certificado a continuación del ultimo certificado
    CertValue: [
    `-----BEGIN CERTIFICATE-----
    xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    -----END CERTIFICATE-----`,
    `-----BEGIN CERTIFICATE-----
    xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    -----END CERTIFICATE-----`
    ],
    issuer: 'xxxxxxxxxx',
    callbackUrl: 'xxxxxxxxxx',
    entryPointValue: 'xxxxxxxxxx',
    idpCert: CertValue,
    logoutUrl: 'xxxxxxxxxx',
    identifierFormat: 'xxxxxxxxxx',
    wantAssertionsSigned: false,
    wantAuthnResponseSigned: false,
    acceptedClockSkewMs: 3*6*9,
    urlRedirection: 'xxxxxxxxxx'
};