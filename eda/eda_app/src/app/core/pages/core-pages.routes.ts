import { Routes, RouterModule } from '@angular/router';

// Components
import { LoginComponent } from './login/login.component';
import { PageNotFoundComponent } from './404/page-not-found.component';
import { ConditionsComponent } from './conditions/conditions.component';
import { AnonymousLoginComponent } from '../../module/pages/anonimous-login/anonymous-login.component';
import { PagesComponent } from '../../module/pages/pages.component';

// Guards
import { LoginGuardGuard } from '../../services/guards/login-guard.guard';


export const coreRoutes: Routes = [
    { path: '', component: LoginComponent },
    { path: 'login', component: LoginComponent },
    { path: 'conditions', component: ConditionsComponent },
    { path: 'public/:dashboardID', component: AnonymousLoginComponent },
    {
        path: '',
        component: PagesComponent,
        canActivate: [LoginGuardGuard],
        loadChildren: () => import('../../module/pages/pages.module').then(m => m.PagesModule)
    },
    { path: '**', component: PageNotFoundComponent},
];

export const CORE_ROUTES = RouterModule.forRoot( coreRoutes, { useHash: false, onSameUrlNavigation: 'reload', relativeLinkResolution: 'legacy' } );