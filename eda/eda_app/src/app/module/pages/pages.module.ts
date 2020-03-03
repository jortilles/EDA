import { NgModule } from '@angular/core';

// Modules
import { GlobalModule } from '../global/global.module';
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
import { DataSourcesComponent } from './data-sources/data-sources.component';
import { DataSourceListComponent } from './data-sources/data-source-list/data-source-list.component';
import { DataSourceDetailComponent } from './data-sources/data-source-detail/data-source-detail.component';
import { AddDashboardComponent } from './home/add-dashboard/add-dashboard.component';
import { TableRelationsDialogComponent } from './data-sources/data-source-detail/table-relations-dialog/table-relations-dialog.component';
import { ColumnPermissionDialogComponent } from './data-sources/data-source-detail/column-permissions-dialog/column-permission-dialog.component';

// Routes
import { PAGES_ROUTES } from './pages.routes';

@NgModule({
    imports: [
        GlobalModule,
        GridsterModule.forRoot(),
        SharedModule,
        ComponentsModule,
        PAGES_ROUTES,
    ],
    declarations: [
        HomeComponent,
        AddDashboardComponent,
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
        ColumnPermissionDialogComponent
    ]
})
export class PagesModule { }
