import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CoreModule } from './core/core.module';
import { CorePagesModule } from './core/pages/core-pages.module';
import { SharedModule } from './shared/shared.module';
import { ServicesModule } from './services/services.module';
import { AppComponent } from './app.component';
import { PagesComponent } from './module/pages/pages.component';
import { CommonModule } from '@angular/common';
import { PrimengModule } from './core/primeng.module';

@NgModule({
  declarations: [],
  imports: [CommonModule, PrimengModule, CoreModule, CorePagesModule, SharedModule, ServicesModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  bootstrap: [] // No necesitas bootstrap aquí si usas bootstrapApplication
})
export class AppModule {}
