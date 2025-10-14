
import express from 'express';

// Opciones de autenticaciones
import SAMLRouter from './SAML/SAML.router';
import GOOGLERouter from './GOOGLE/GOOGLE.router';
import SAML_ORCL_Router from './SAML_ORCL/SAML_ORCL.router';

// LoginType
import {loginType} from './loginType'

// EDA API Configuración
const EDA_API_CONFIG = require('../../../config/eda_api_config');

const router = express.Router();


// Crear un endpoint para entregar el valor de la configuracion de login
router.get('/typeLogin', loginType.loginTypeSelection);

if(EDA_API_CONFIG.authentication_type?.type === 'sso_mixto'){

    if(
        EDA_API_CONFIG.authentication_type.options.authentication === "saml" &&
        EDA_API_CONFIG.authentication_type.options.authorization === "bbdd_orcl" 
      ) 
    {
        // Autenticación con SAML y bbdd oracle para la autorización
        router.use('/samlorcl', SAML_ORCL_Router);
    }   

}

if(EDA_API_CONFIG.authentication_type?.type === 'sso'){

    if(
        EDA_API_CONFIG.authentication_type.options.authentication === "sso" &&
        EDA_API_CONFIG.authentication_type.options.authorization === "sso" 
      ) 
    {
        // Autenticación con SAML
        if(EDA_API_CONFIG.authentication_type.options.elements.some((item: any) => item === 'saml')) router.use('/saml', SAMLRouter);

        if(EDA_API_CONFIG.authentication_type.options.elements.some((item: any) => item === 'google')) router.use('/google', GOOGLERouter);

        // if(EDA_API_CONFIG.authentication_type.options.elements.some((item: any) => item === 'microsoft')) router.use('/microsoft', SAMLRouter);

        // ====> Falta agregar Microsoft ...

    }  

}






export default router;