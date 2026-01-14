import { Routes } from '@angular/router';

// Components
import { PageNotFoundComponent } from './404/page-not-found.component';
import { ConditionsComponent } from './conditions/conditions.component';
import { AnonymousLoginComponent } from '../../module/pages/anonimous-login/anonymous-login.component';
import { PagesComponent } from '../../module/pages/pages.component';

// Guards
import { LoginGuardGuard } from '../../services/guards/login-guard.guard'
import { pagesV3Routes } from 'app/module/pages/pages-v3.routes';

export const coreRoutes: Routes = [
    { path: '', loadComponent: () => import('./login/login').then(c => c.LoginV2Component) },
    // { path: 'login', component: LoginComponent },
    { path: 'old/login', loadComponent: () => import('./login/login').then(c => c.LoginV2Component) },
    { path: 'login', loadComponent: () => import('./login/login').then(c => c.LoginV2Component) },
    { path: 'selectedRole', loadComponent: () => import('./selectedRole/selectedRole').then(c => c.selectedRoleComponent) },
    {path: 'custom',loadComponent: () => import('./customized-dashboard/customized-dashboard.component').then(c => c.CustomizedDashboardComponent)},
    { path: 'conditions', component: ConditionsComponent },
    { path: 'public/:dashboardID', component: AnonymousLoginComponent },
    {
        path: 'old',
        component: PagesComponent,
        canActivate: [LoginGuardGuard],
        loadChildren: () => import('../../module/pages/pages.module').then(m => m.PagesModule)
    },
    // Rutas internas v2 protegidas por el guard
    {
        path: '',
        canActivate: [LoginGuardGuard],
        children: pagesV3Routes
    },
    { path: '**', component: PageNotFoundComponent }
];
