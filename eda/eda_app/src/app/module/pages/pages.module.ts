import { NgModule } from '@angular/core';

// Modules
import { CoreModule } from '../../core/core.module';
import { SharedModule } from '../../shared/shared.module';
import { ComponentsModule } from '../components/components.module';
import { GridsterModule } from 'angular2gridster';

// Component
import { HomeComponent } from './home/home.component';
import { ProfileComponent } from './profile/profile.component';
import { AccountSettingsComponent } from './account-settings/account-settings.component';
import { UsersLlistaComponent } from './users-management/users-list/users-list.component';
import { UsersFitxaComponent } from './users-management/users-detail/users-detail.component';
import { GroupListComponent } from './groups-management/group-list/group-list.component';
import { GroupDetailComponent } from './groups-management/group-detail/group-detail.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { DashboardFilterDialogComponent } from './dashboard/filter-dialog/dashboard-filter-dialog.component';
import { DataSourcesComponent } from './data-sources/datasource-configuration/data-sources.component';
import { DsConfigWrapperComponent } from './data-sources/dsconfig-wrapper.component'
import { DataSourceListComponent } from './data-sources/data-source-list/data-source-list.component';
import { DataSourceDetailComponent } from './data-sources/data-source-detail/data-source-detail.component';
import { TableRelationsDialogComponent } from './data-sources/data-source-detail/table-relations-dialog/table-relations-dialog.component';
import { ColumnPermissionDialogComponent } from './data-sources/data-source-detail/column-permissions-dialog/column-permission-dialog.component';
import { TablePermissionDialogComponent } from './data-sources/data-source-detail/table-permissions-dialog/table-permission-dialog.component';
import { ColumnValueListDialogComponent } from './data-sources/data-source-detail/column-value-list-dialog/column-value-list-dialog.component';
import { ModelPermissionDialogComponent } from './data-sources/data-source-detail/model-permissions-dialog/model-permission-dialog.component';
import { MapDialogComponent } from './data-sources/data-source-detail/mapsDialog/maps-dialog.component';
import { ViewDialogComponent } from './data-sources/data-source-detail/viewDialog/view-dialog.component';
import {AddCsvComponent} from './data-sources/data-source-list/addCSV/add-csv.component';
import { ModelSettingsComponent } from './model-settings/model-settings.component';
import {CacheDialogComponent} from './data-sources/data-source-detail/cache-dialog/cache-dialog.component';
import {SecurityDialogComponent} from './data-sources/data-source-detail/security-dialog/security-dialog.component';
import {AlertsManagementComponent} from './alerts-management/alerts-management.component';
import { MailManagementComponent } from './mail-management/mail-management.component';
import {DashboardMailDialogComponent} from './dashboard/email-dialog/dashboard-mail-dialog.component';

// Routes
import { PAGES_ROUTES } from './pages.routes';
import { CalculatedColumnDialogComponent } from './data-sources/data-source-detail/calculatedColumn-dialog/calculated-column-dialog.component';
import { UploadFileComponent } from './data-sources/data-source-detail/upload-file/upload-file.component';
import { SaveAsDialogComponent } from './dashboard/saveAsDialog/save-as-dialog.component';
import { EditStylesDialogComponent } from './dashboard/edit-styles-dialog/edit-styles.dialog.component';

@NgModule({
    imports: [
        CoreModule,
        GridsterModule.forRoot(),
        SharedModule,
        ComponentsModule,
        PAGES_ROUTES,
    ],
    declarations: [
        HomeComponent,
        DashboardComponent,
        AccountSettingsComponent,
        ProfileComponent,
        UsersLlistaComponent,
        UsersFitxaComponent,
        DataSourcesComponent,
        DataSourceListComponent,
        DataSourceDetailComponent,
        TableRelationsDialogComponent,
        GroupListComponent,
        GroupDetailComponent,
        DashboardFilterDialogComponent,
        ColumnPermissionDialogComponent,
        ColumnValueListDialogComponent,
        TablePermissionDialogComponent,
        ModelPermissionDialogComponent,
        CalculatedColumnDialogComponent,
        MapDialogComponent,
        UploadFileComponent,
        ViewDialogComponent,
        AddCsvComponent,
        DsConfigWrapperComponent,
        ModelSettingsComponent,
        CacheDialogComponent,
        SecurityDialogComponent,
        AlertsManagementComponent,
        MailManagementComponent,
        DashboardMailDialogComponent,
        SaveAsDialogComponent,
        EditStylesDialogComponent
    ]
})
export class PagesModule { }
