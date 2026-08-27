import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { coreRoutes } from './core/pages/core-pages.routes';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { PrimengModule } from './core/primeng.module';
import { CoreModule } from './core/core.module';
import { AppModule } from './app.module';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      coreRoutes,
      withHashLocation(), // Enable hash-based navigation
    ),
    provideHttpClient(),
    provideAnimations(),
    importProvidersFrom(PrimengModule),
    importProvidersFrom(AppModule)
  ]
};
