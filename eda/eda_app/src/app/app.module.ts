import { NgModule } from '@angular/core';

// Rutas
import { APP_ROUTES } from './app.routes';

// Modules
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { GlobalModule } from './module/global/global.module';
import { InitModule } from './module/global/init.module';
import { SharedModule } from './shared/shared.module';
import { HttpClientModule } from '@angular/common/http';

// Components
import { AppComponent } from './app.component';
import { PagesComponent } from './module/pages/pages.component';

// Services
import { ServicesModule } from './services/services.module';


@NgModule({
    declarations: [AppComponent, PagesComponent],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        GlobalModule,
        InitModule,
        SharedModule,
        ServicesModule,
        APP_ROUTES,
        HttpClientModule
    ],
    providers: [],
    bootstrap: [AppComponent]
})
export class AppModule { }
