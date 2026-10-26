import { Routes } from '@angular/router';

// Components
import { PageNotFoundComponent } from './404/page-not-found.component';
import { ConditionsComponent } from './conditions/conditions.component';
import { AnonymousLoginComponent } from '../../module/pages/anonimous-login/anonymous-login.component';
import { PagesComponent } from '../../module/pages/pages.component';

// Guards
import { LoginGuardGuard } from '../../services/guards/login-guard.guard'
import { pagesV3Routes } from 'app/module/pages/pages-v3.routes';

// Plugins
import { PLUGINS } from 'app/plugins/plugin-registry';
import { ILoginPlugin } from 'app/plugins/plugin.interface';

// A login plugin replaces the core login page and may add public routes (sign up, terms...)
const loginPlugin = PLUGINS.find((p): p is ILoginPlugin => p.type === 'login');
const loadLogin = loginPlugin?.loadComponent ?? (() => import('./login/login').then(c => c.LoginV2Component));

export const coreRoutes: Routes = [
    { path: '', loadComponent: loadLogin },
    // { path: 'login', component: LoginComponent },
    { path: 'old/login', loadComponent: loadLogin },
    { path: 'login', loadComponent: loadLogin },
    ...(loginPlugin?.routes ?? []),
    {path: 'portal',loadComponent: () => import('./customized-dashboard/customized-dashboard.component').then(c => c.CustomizedDashboardComponent)},
    { path: 'conditions', component: ConditionsComponent },
    { path: 'public/:dashboardID', component: AnonymousLoginComponent },
    {
        path: 'old',
        component: PagesComponent,
        canActivate: [LoginGuardGuard],
        loadChildren: () => import('../../module/pages/pages.module').then(m => m.PagesModule)
    },
    // Internal v2 routes protected by the guard
    {
        path: '',
        canActivate: [LoginGuardGuard],
        children: pagesV3Routes
    },
    { path: '**', component: PageNotFoundComponent }
];
