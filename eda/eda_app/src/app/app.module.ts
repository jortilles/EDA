import { NgModule } from '@angular/core';

// Rutas
import { CORE_ROUTES } from './core/pages/core-pages.routes';

// Modules
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CoreModule } from './core/core.module';
import { CorePagesModule } from './core/pages/core-pages.module';
import { SharedModule } from './shared/shared.module';
import { HttpClientModule } from '@angular/common/http';
// Components
import { AppComponent } from './app.component';
import { PagesComponent } from './module/pages/pages.component';

// Services
import { ServicesModule } from './services/services.module';

// Azure - Microsoft
import { MsalModule, MsalRedirectComponent } from "@azure/msal-angular";
import { PublicClientApplication } from "@azure/msal-browser";
import { MICROSOFT_ID, MICROSOFT_AUTHORITY, MICROSOFT_REDIRECT_URI } from '@eda/configs/config';



const isIE =
  window.navigator.userAgent.indexOf("MSIE ") > -1 ||
  window.navigator.userAgent.indexOf("Trident/") > -1;

@NgModule({
    declarations: [AppComponent, PagesComponent],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        CoreModule,
        CorePagesModule,
        SharedModule,
        ServicesModule,
        CORE_ROUTES,
        HttpClientModule,
        MsalModule.forRoot(
            new PublicClientApplication({
              auth: {
                clientId: MICROSOFT_ID, // Application (client) ID from the app registration
                authority: MICROSOFT_AUTHORITY, // The Azure cloud instance and the app's sign-in audience (tenant ID, common, organizations, or consumers)
                redirectUri: MICROSOFT_REDIRECT_URI, // This is your redirect URI
              },
              cache: {
                cacheLocation: "localStorage",
                storeAuthStateInCookie: isIE, // Set to true for Internet Explorer 11
              },
            }),
            null,
            null
          ), 
    ],
    providers: [ ],
    bootstrap: [AppComponent, MsalRedirectComponent ]
})
export class AppModule { }
