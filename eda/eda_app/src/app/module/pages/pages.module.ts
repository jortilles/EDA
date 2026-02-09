import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';

// Modules
import { CoreModule } from '../../core/core.module';
import { SharedModule } from '../../shared/shared.module';
import { GridsterModule } from 'angular-gridster2';


// Component
import { AccountSettingsComponent } from './account-settings/account-settings.component';
import { AlertsManagementComponent } from './alerts-management/alerts-management.component';
import {DashboardMailDialogComponent} from './dashboard/email-dialog/dashboard-mail-dialog.component';
import { UrlsActionComponent } from './dashboard/urls-action/urls-action.component';


// Routes
import { PAGES_ROUTES } from './pages.routes';
import { SaveAsDialogComponent } from './dashboard/saveAsDialog/save-as-dialog.component';
import { PrimengModule } from 'app/core/primeng.module';



@NgModule({
    imports: [
        PrimengModule,
        CoreModule,
        // GridsterModule.forRoot(),
        GridsterModule,
        SharedModule,
        PAGES_ROUTES,
    ],
    declarations: [
        AccountSettingsComponent,
        AlertsManagementComponent,
        DashboardMailDialogComponent,
        SaveAsDialogComponent,
        UrlsActionComponent
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class PagesModule { }
