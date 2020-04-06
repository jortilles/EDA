import { NgModule } from '@angular/core';

// Modules
import { GlobalModule } from './global.module';
import { SharedModule } from '../../shared/shared.module';

// Components
import { LoginComponent } from './pages/login/login.component';
import { PageNotFoundComponent } from './pages/404/page-not-found.component';
import { LogoutComponent } from './pages/logout/logout.component';
import { RegisterComponent } from './pages/register/register.component';
import { ConditionsComponent } from './pages/conditions/conditions.component';
import { AnonymousLoginComponent } from '../pages/anonimous-login/anonymous-login.component';



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
        GlobalModule,
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
export class InitModule {}
