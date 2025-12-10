// main.ts (fragmento completo con mock)
import '@angular/localize/init';
import { importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

import localeEs from '@angular/common/locales/es';
import localeCa from '@angular/common/locales/ca';
import localePl from '@angular/common/locales/pl';
import localeEn from '@angular/common/locales/en';
import { registerLocaleData } from '@angular/common';

// Microsoft
import { MsalModule, MsalService } from '@azure/msal-angular';
import { PublicClientApplication } from '@azure/msal-browser';
import { MICROSOFT_ID, MICROSOFT_AUTHORITY, MICROSOFT_REDIRECT_URI } from '@eda/configs/config';

registerLocaleData(localeEs);
registerLocaleData(localeCa);
registerLocaleData(localePl);
registerLocaleData(localeEn);

const isIE =
  window.navigator.userAgent.indexOf("MSIE ") > -1 ||
  window.navigator.userAgent.indexOf("Trident/") > -1;

// Comprueba que estamos en un navegador y que la Web Crypto API está disponible
const canInitMsal = typeof window !== 'undefined' && !!(window as any).crypto && !!(window as any).crypto.subtle;

/**
 * MockMsalService mínimo para evitar NullInjectorError cuando no podemos inicializar MSAL.
 * Añade aquí métodos que tu app use. Esta implementación NO hace login ni maneja tokens.
 */
class MockMsalService {
  instance = {
    initialize: async () => { /* no-op */ }
  };

  loginPopup(request?: any) {
    // devolver un "observable-like" que no hace nada
    return {
      subscribe: (opts: any) => {
        if (opts && typeof opts.error === 'function') {
          opts.error(new Error('MSAL not available in this environment'));
        }
      }
    };
  }

  // Implementa otros métodos que uses (acquireTokenSilent, logout, etc.) como no-op si hace falta.
}

const msalProviders = canInitMsal ? [
  importProvidersFrom(
    MsalModule.forRoot(
      new PublicClientApplication({
        auth: {
          clientId: MICROSOFT_ID,
          authority: MICROSOFT_AUTHORITY,
          redirectUri: MICROSOFT_REDIRECT_URI
        },
        cache: {
          cacheLocation: 'localStorage',
          storeAuthStateInCookie: isIE
        }
      }),
      null,
      null
    )
  )
] : [
  // Si no podemos inicializar MSAL, registramos un provider mock para que la inyección funcione.
  { provide: MsalService, useClass: MockMsalService as any }
];

bootstrapApplication(AppComponent, {
  ...appConfig,
  providers: [
    ...(appConfig.providers || []),
    ...msalProviders
  ]
})
.catch(err => console.error(err));