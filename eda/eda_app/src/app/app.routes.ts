import { Routes, RouterModule } from '@angular/router';

// Components
import { LoginComponent } from './module/global/pages/login/login.component';
import { PageNotFoundComponent } from './module/global/pages/404/page-not-found.component';
import { RegisterComponent } from './module/global/pages/register/register.component';
import { PagesComponent } from './module/pages/pages.component';

// Guards
import { LoginGuardGuard } from './services/guards/login-guard.guard';
import {ConditionsComponent} from './module/global/pages/conditions/conditions.component';


export const appRoutes: Routes = [
    { path: '', component: LoginComponent },
    { path: 'login', component: LoginComponent },
    // { path: 'register', component: RegisterComponent },
    { path: 'conditions', component: ConditionsComponent },
    {
        path: '',
        component: PagesComponent,
        canActivate: [LoginGuardGuard],
        loadChildren: './module/pages/pages.module#PagesModule'
    },
    { path: '**', component: PageNotFoundComponent},
];

export const APP_ROUTES = RouterModule.forRoot( appRoutes, { useHash: true, onSameUrlNavigation: 'reload' } );
