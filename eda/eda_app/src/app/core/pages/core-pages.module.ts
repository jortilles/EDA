import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';

// Modules
import { CoreModule } from '../core.module';
import { SharedModule } from '../../shared/shared.module';

// Components
import { PageNotFoundComponent } from './404/page-not-found.component';
import { LogoutComponent } from './logout/logout.component';
import { RegisterComponent } from './register/register.component';
import { ConditionsComponent } from './conditions/conditions.component';
import { AnonymousLoginComponent } from '../../module/pages/anonimous-login/anonymous-login.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PrimengModule } from '../primeng.module';



@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        PrimengModule,
        CoreModule,
        SharedModule,
    ],
    declarations: [
        LogoutComponent,
        PageNotFoundComponent,
        AnonymousLoginComponent
    ],
    exports: [
        LogoutComponent,
        PageNotFoundComponent,
        AnonymousLoginComponent
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class CorePagesModule {}
