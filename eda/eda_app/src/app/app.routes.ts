import { Routes, RouterModule } from '@angular/router';

// Components
import { LoginComponent } from './module/global/pages/login/login.component';
import { PageNotFoundComponent } from './module/global/pages/404/page-not-found.component';
import { RegisterComponent } from './module/global/pages/register/register.component';
import { PagesComponent } from './module/pages/pages.component';

// Guards
import { LoginGuardGuard } from './services/guards/login-guard.guard';
import {ConditionsComponent} from './module/global/pages/conditions/conditions.component';
import { AnonymousLoginComponent } from './module/pages/anonimous-login/anonymous-login.component';


export const appRoutes: Routes = [
    { path: '', component: LoginComponent },
    { path: 'login', component: LoginComponent },
    { path: 'conditions', component: ConditionsComponent },
    { path: 'public/:dashboardID', component: AnonymousLoginComponent },
    {
        path: '',
        component: PagesComponent,
        canActivate: [LoginGuardGuard],
        loadChildren: './module/pages/pages.module#PagesModule'
    },
    { path: '**', component: PageNotFoundComponent},
];

export const APP_ROUTES = RouterModule.forRoot( appRoutes, { useHash: true, onSameUrlNavigation: 'reload' } );
