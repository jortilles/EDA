import { Routes } from '@angular/router';

// Components
import { PageNotFoundComponent } from './404/page-not-found.component';
import { ConditionsComponent } from './conditions/conditions.component';
import { AnonymousLoginComponent } from '../../module/pages/anonimous-login/anonymous-login.component';

// Guards
import { LoginGuardGuard } from '../../services/guards/login-guard.guard'
import { pagesRoutes } from 'app/module/pages/pages.routes';

export const coreRoutes: Routes = [
    { path: '', loadComponent: () => import('./login/login.component').then(c => c.LoginComponent) },
    { path: 'login', loadComponent: () => import('./login/login.component').then(c => c.LoginComponent) },
    {path: 'portal',loadComponent: () => import('./customized-dashboard/customized-dashboard.component').then(c => c.CustomizedDashboardComponent)},
    { path: 'conditions', component: ConditionsComponent },
    { path: 'public/:dashboardID', component: AnonymousLoginComponent },
    // Internal v2 routes protected by the guard
    {
        path: '',
        canActivate: [LoginGuardGuard],
        children: pagesRoutes
    },
    { path: '**', component: PageNotFoundComponent }
];
