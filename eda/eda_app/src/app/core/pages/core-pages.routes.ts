import { Routes } from '@angular/router';

// Components
import { LoginComponent } from './login/login.component';
import { PageNotFoundComponent } from './404/page-not-found.component';
import { ConditionsComponent } from './conditions/conditions.component';
import { AnonymousLoginComponent } from '../../module/pages/anonimous-login/anonymous-login.component';
import { PagesComponent } from '../../module/pages/pages.component';

// Guards
import { LoginGuardGuard } from '../../services/guards/login-guard.guard'
import { pagesV2Routes } from 'app/module/pages/v2/pages-v2.routes';

export const coreRoutes: Routes = [
    { path: '', loadComponent: () => import('./login_v2/login_v2').then(c => c.LoginV2Component) },
    { path: 'login', component: LoginComponent },
    { path: 'v2/login', loadComponent: () => import('./login_v2/login_v2').then(c => c.LoginV2Component) },
    { path: 'conditions', component: ConditionsComponent },
    { path: 'public/:dashboardID', component: AnonymousLoginComponent },
    {
        path: '',
        component: PagesComponent,
        canActivate: [LoginGuardGuard],
        loadChildren: () => import('../../module/pages/pages.module').then(m => m.PagesModule)
    },
    // Rutas internas v2 protegidas por el guard
    {
        path: 'v2',
        canActivate: [LoginGuardGuard],
        children: pagesV2Routes
    },
    { path: '**', component: PageNotFoundComponent }
];
