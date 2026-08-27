import '@angular/localize/init';
import { importProvidersFrom, Provider } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { registerLocaleData } from '@angular/common';

import localeEs from '@angular/common/locales/es';
import localeCa from '@angular/common/locales/ca';
import localePl from '@angular/common/locales/pl';
import localeEn from '@angular/common/locales/en';

// MSAL
import { MsalModule, MSAL_INSTANCE, MsalService } from '@azure/msal-angular';
import { PublicClientApplication, IPublicClientApplication } from '@azure/msal-browser';
import { MICROSOFT_ID, MICROSOFT_AUTHORITY, MICROSOFT_REDIRECT_URI } from '@eda/configs/config';

// API configuration
import { URL_SERVICES } from '../src/app/config/config';

// Register locales
registerLocaleData(localeEs);
registerLocaleData(localeCa);
registerLocaleData(localePl);
registerLocaleData(localeEn);

// Detect IE
const isIE =
  window.navigator.userAgent.indexOf('MSIE ') > -1 ||
  window.navigator.userAgent.indexOf('Trident/') > -1;

const API = URL_SERVICES;

// Factory for MSAL
export function MSALInstanceFactory(): IPublicClientApplication {
  if (!window.crypto?.subtle || !window.isSecureContext) {
    console.warn('MSAL no puede inicializarse: Web Crypto API no disponible o contexto no seguro.');
    throw new Error('MSAL no disponible en este entorno');
  }

  return new PublicClientApplication({
    auth: {
      clientId: MICROSOFT_ID,
      authority: MICROSOFT_AUTHORITY,
      redirectUri: MICROSOFT_REDIRECT_URI
    },
    cache: {
      cacheLocation: 'localStorage',
      storeAuthStateInCookie: isIE
    }
  });
}

// Conditional bootstrap function
async function bootstrap() {
  try {
    // Get the login type from the backend
    let loginMethods: string[] = [];
    
    try {
      const resp = await fetch(`${API}/auth/typeLogin`);
      if (resp.ok) {
        const data = await resp.json();
        loginMethods = data?.response?.options?.elements || [];
      }
    } catch (fetchError) {
      console.warn('No se pudo conectar a la API. Usando configuración por defecto.', fetchError);
      // Default value if the API does not respond
      loginMethods = [];
    }

    // Base providers
    const providers: Provider = [...(appConfig.providers || [])];

    // Only add MSAL if Microsoft is enabled
    if (loginMethods.includes('microsoft')) {
      providers.push(
        importProvidersFrom(MsalModule),
        { provide: MSAL_INSTANCE, useFactory: MSALInstanceFactory },
        MsalService
      );
    } else {
      // Optional: add a dummy provider to avoid NullInjectorError
      providers.push({
        provide: MsalService,
        useValue: null
      });
    }

    // Main bootstrap
    await bootstrapApplication(AppComponent, {
      ...appConfig,
      providers
    });

  } catch (error) {
    console.error('Error inicializando la app:', error);
  }
}

// Run bootstrap
bootstrap();
