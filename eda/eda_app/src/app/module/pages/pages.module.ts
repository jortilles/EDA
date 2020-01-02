import { NgModule } from '@angular/core';

// Modules
import { GlobalModule } from '../global/global.module';
import { SharedModule } from '../../shared/shared.module';
import { ComponentsModule } from '../components/components.module';
import { GridsterModule } from 'angular2gridster';

// Component
import { HomeComponent } from './home/home-page/home.component';
import { ProfileComponent } from './profile/profile.component';
import { AccountSettingsComponent } from './account-settings/account-settings.component';
import { UsersLlistaComponent } from './users-management/users-llista/users-llista.component';
import { UsersFitxaComponent } from './users-management/users-fitxa/users-fitxa.component';
import { GroupListComponent } from './groups-management/group-list/group-list.component';
import { GroupDetailComponent } from './groups-management/group-detail/group-detail.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { DashboardFilterDialogComponent } from './dashboard/filter-dialog/dashboard-filter-dialog.component';
import { DataSourcesComponent } from './data-sources/data-sources.component';
import { DataSourceListComponent } from './data-sources/data-source-list/data-source-list.component';
import { DataSourceDetailComponent } from './data-sources/data-source-detail/data-source-detail.component';
import { AddDashboardDialogComponent } from './home/add-dashboard-dialog/add-dashboard-dialog.component';
import { TableRelationsDialogComponent } from './data-sources/data-source-detail/table-relations-dialog/table-relations-dialog.component';

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
        AddDashboardDialogComponent,
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
        DashboardFilterDialogComponent
    ]
})
export class PagesModule { }
