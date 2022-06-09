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
        HttpClientModule
    ],
    providers: [ ],
    bootstrap: [AppComponent]
})
export class AppModule { }
