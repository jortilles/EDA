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
import { MsalModule } from '@azure/msal-angular';
import { PublicClientApplication } from '@azure/msal-browser';
import { MICROSOFT_ID, MICROSOFT_AUTHORITY, MICROSOFT_REDIRECT_URI } from '@eda/configs/config';


import { URL_SERVICES } from '../src/app/config/config';

registerLocaleData(localeEs);
registerLocaleData(localeCa);
registerLocaleData(localePl);
registerLocaleData(localeEn);

const isIE =
  window.navigator.userAgent.indexOf("MSIE ") > -1 ||
  window.navigator.userAgent.indexOf("Trident/") > -1;

const providers = [...(appConfig.providers || [])];


const API = URL_SERVICES;

async function controlMsal() {
  try {
    const resp = await fetch(`${API}/auth/typeLogin`);
    const data = await resp.json();
    const loginMethods = data?.response?.options?.elements || [];

    if(loginMethods.includes('microsoft')) {
      providers.push(
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
      );
    }
    
  } catch (error) {
    console.error('error: ', error);
  }
}

bootstrapApplication(AppComponent, {
  ...appConfig,
  providers

})
  .catch(err => console.error(err));

controlMsal();