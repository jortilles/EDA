/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

const microsoftConfig = require('../../../../config/microsoft.config');


/**
 * Configuration object to be passed to MSAL instance on creation.
 * For a full list of MSAL Node configuration parameters, visit:
 * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-node/docs/configuration.md
 */
const msalConfig = {
    auth: {
        clientId: microsoftConfig.CLIENT_ID, // 'Application (client) ID' of app registration in Azure portal - this value is a GUID
        authority: microsoftConfig.CLOUD_INSTANCE + microsoftConfig.TENANT_ID, // Full directory URL, in the form of https://login.microsoftonline.com/<tenant>
        clientSecret: microsoftConfig.CLIENT_SECRET // Client secret generated from the app registration in Azure portal
    },
    system: {
        loggerOptions: {
            loggerCallback(loglevel, message, containsPii) {
            },
            piiLoggingEnabled: false,
            logLevel: 3,
        }
    }
}

const REDIRECT_URI = microsoftConfig.REDIRECT_URI;
const POST_LOGOUT_REDIRECT_URI = microsoftConfig.POST_LOGOUT_REDIRECT_URI;

const GRAPH_ME_ENDPOINT = microsoftConfig.GRAPH_API_ENDPOINT + "v1.0/me";

export = {
    msalConfig,
    REDIRECT_URI,
    POST_LOGOUT_REDIRECT_URI,
    GRAPH_ME_ENDPOINT
};