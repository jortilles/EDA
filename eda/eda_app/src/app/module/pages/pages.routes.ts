import { Routes, RouterModule } from '@angular/router';

// Components
import { AccountSettingsComponent } from './account-settings/account-settings.component';


// Guard
import { VerifyTokenGuard } from '../../services/guards/verify-token.guard';
import { AlertsManagementComponent } from './alerts-management/alerts-management.component';


const pagesRoutes: Routes = [

    { path: 'account-settings', component: AccountSettingsComponent, canActivate: [VerifyTokenGuard] },

    { path: 'alerts-management', component: AlertsManagementComponent, canActivate:[VerifyTokenGuard]},
    { path: '', redirectTo: 'home', pathMatch: 'full' }
];

export const PAGES_ROUTES = RouterModule.forChild( pagesRoutes );
