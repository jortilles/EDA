import { NgModule } from '@angular/core';

// Modules
import { CoreModule } from '../core.module';
import { SharedModule } from '../../shared/shared.module';

// Components
import { LoginComponent } from './login/login.component';
import { PageNotFoundComponent } from './404/page-not-found.component';
import { LogoutComponent } from './logout/logout.component';
import { RegisterComponent } from './register/register.component';
import { ConditionsComponent } from './conditions/conditions.component';
import { AnonymousLoginComponent } from '../../module/pages/anonimous-login/anonymous-login.component';



@NgModule({
    declarations: [
        LoginComponent,
        RegisterComponent,
        LogoutComponent,
        PageNotFoundComponent,
        ConditionsComponent,
        AnonymousLoginComponent
    ],
    imports: [
        CoreModule,
        SharedModule,
    ],
    exports: [
        LoginComponent,
        RegisterComponent,
        LogoutComponent,
        PageNotFoundComponent,
        ConditionsComponent,
        AnonymousLoginComponent
    ]
})
export class CorePagesModule {}
