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

// Microsoft
import { MsalModule, MSAL_INSTANCE, MsalService } from '@azure/msal-angular';
import { PublicClientApplication, IPublicClientApplication } from '@azure/msal-browser';
import { MICROSOFT_ID, MICROSOFT_AUTHORITY, MICROSOFT_REDIRECT_URI } from '@eda/configs/config';

// Registrar locales
registerLocaleData(localeEs);
registerLocaleData(localeCa);
registerLocaleData(localePl);
registerLocaleData(localeEn);

// Detectar IE
const isIE =
  window.navigator.userAgent.indexOf('MSIE ') > -1 ||
  window.navigator.userAgent.indexOf('Trident/') > -1;

// Factory para crear la instancia de MSAL
export function MSALInstanceFactory(): IPublicClientApplication {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    throw new Error('MSAL no puede inicializarse: no hay Web Crypto.');
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

// Provider de MSAL para bootstrapApplication
const msalProvider: Provider = {
  provide: MSAL_INSTANCE,
  useFactory: MSALInstanceFactory
};

// Bootstrap de la app
bootstrapApplication(AppComponent, {
  ...appConfig,
  providers: [
    ...(appConfig.providers || []),

    // Importar MsalModule sin forRoot
    importProvidersFrom(MsalModule),

    // Proveer MSAL
    msalProvider,

    // Proveer el servicio
    MsalService
  ]
})
.catch(err => console.error(err));
