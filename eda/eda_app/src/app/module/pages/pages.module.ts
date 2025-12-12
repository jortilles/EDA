import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';

// Modules
import { CoreModule } from '../../core/core.module';
import { SharedModule } from '../../shared/shared.module';
import { ComponentsModule } from '../components/components.module';
import { GridsterModule } from 'angular-gridster2';


// Component
import { AccountSettingsComponent } from './account-settings/account-settings.component';
import { DashboardFilterDialogComponent } from './dashboard/filter-dialog/dashboard-filter-dialog.component';
import { TableRelationsDialogComponent } from './data-sources/data-source-detail/table-relations-dialog/table-relations-dialog.component';
import { TableEditRelationsDialogComponent } from './data-sources/data-source-detail/table-edit-relations-dialog/table-edit-relations-dialog.component';
import { ColumnValueListDialogComponent } from './data-sources/data-source-detail/column-value-list-dialog/column-value-list-dialog.component';
import { AlertsManagementComponent } from './alerts-management/alerts-management.component';
import {DashboardMailDialogComponent} from './dashboard/email-dialog/dashboard-mail-dialog.component';
import { UrlsActionComponent } from './dashboard/urls-action/urls-action.component';


// Routes
import { PAGES_ROUTES } from './pages.routes';
import { CalculatedColumnDialogComponent } from './data-sources/data-source-detail/calculatedColumn-dialog/calculated-column-dialog.component';
import { UploadFileComponent } from './data-sources/data-source-detail/upload-file/upload-file.component';
import { SaveAsDialogComponent } from './dashboard/saveAsDialog/save-as-dialog.component';
import { EditStylesDialogComponent } from './dashboard/edit-styles-dialog/edit-styles.dialog.component';
import { PrimengModule } from 'app/core/primeng.module';



@NgModule({
    imports: [
        PrimengModule,
        CoreModule,
        // GridsterModule.forRoot(),
                ComponentsModule,

        GridsterModule,
        SharedModule,
        PAGES_ROUTES,
    ],
    declarations: [
        AccountSettingsComponent,
        TableRelationsDialogComponent,
        TableEditRelationsDialogComponent,
        DashboardFilterDialogComponent,
        ColumnValueListDialogComponent,
        CalculatedColumnDialogComponent,
        UploadFileComponent,
        AlertsManagementComponent,
        DashboardMailDialogComponent,
        SaveAsDialogComponent,
        EditStylesDialogComponent,
        UrlsActionComponent
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class PagesModule { }
