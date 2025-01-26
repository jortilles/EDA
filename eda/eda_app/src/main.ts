import '@angular/localize/init';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

import localeEs from '@angular/common/locales/es';
import localeCa from '@angular/common/locales/ca';
import localePl from '@angular/common/locales/pl';
import localeEn from '@angular/common/locales/en';
import { registerLocaleData } from '@angular/common';

registerLocaleData(localeEs);
registerLocaleData(localeCa);
registerLocaleData(localePl);
registerLocaleData(localeEn);

bootstrapApplication(AppComponent, appConfig)
  .catch(err => console.error(err));
