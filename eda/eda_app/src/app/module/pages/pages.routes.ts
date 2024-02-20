import { Routes, RouterModule } from '@angular/router';

// Components
import { HomeComponent } from './home/home.component';
import { ProfileComponent } from './profile/profile.component';
import { AccountSettingsComponent } from './account-settings/account-settings.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { UsersLlistaComponent } from './users-management/users-list/users-list.component';
import { DsConfigWrapperComponent } from './data-sources/dsconfig-wrapper.component'
import { DataSourceListComponent } from './data-sources/data-source-list/data-source-list.component';
import { ModelSettingsComponent } from './model-settings/model-settings.component';
// SDA CUSTOM
import { AboutComponent } from './about/about.component';
// END SDA CUSTOM


// Guard
import { VerifyTokenGuard } from '../../services/guards/verify-token.guard';
import { GroupListComponent } from './groups-management/group-list/group-list.component';
import { AlertsManagementComponent } from './alerts-management/alerts-management.component';
import { MailManagementComponent } from './mail-management/mail-management.component';


const pagesRoutes: Routes = [

    { path: 'home', component: HomeComponent, canActivate: [VerifyTokenGuard] },
    { path: 'dashboard/:id', component: DashboardComponent, canActivate: [VerifyTokenGuard] },
    { path: 'account-settings', component: AccountSettingsComponent, canActivate: [VerifyTokenGuard] },
    { path: 'profile', component: ProfileComponent, canActivate: [VerifyTokenGuard] },
    { path: 'data-source', component: DsConfigWrapperComponent, canActivate: [VerifyTokenGuard] },
    { path: 'data-source/:id', component: DataSourceListComponent, canActivate: [VerifyTokenGuard], runGuardsAndResolvers: 'paramsChange' },

    { path: 'groups-management', component: GroupListComponent, canActivate: [VerifyTokenGuard] },
    { path: 'users-management', component: UsersLlistaComponent, canActivate: [VerifyTokenGuard]},
    { path: 'models-management', component: ModelSettingsComponent, canActivate:[VerifyTokenGuard]},
    { path: 'alerts-management', component: AlertsManagementComponent, canActivate:[VerifyTokenGuard]},
    { path: 'mail-management', component: MailManagementComponent, canActivate:[VerifyTokenGuard]},
    // SDA CUSTOM
    { path: 'about', component: AboutComponent, canActivate: [VerifyTokenGuard] },
    // END SDA CUSTOM
    { path: '', redirectTo: 'home', pathMatch: 'full' }
];

export const PAGES_ROUTES = RouterModule.forChild( pagesRoutes );
