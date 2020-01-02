import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

// Services
import {
    ApiService,
    UserService,
    GlobalService,
    DashboardService,
    SettingsService,
    FileUtiles,
    AlertService,
    SidebarService,
    LoginGuardGuard,
    VerifyTokenGuard,
    SpinnerService,
    DataSourceService,
    GlobalFiltersService,
    QueryBuilderService,
    ChartUtilsService,
    GroupService,
    ColumnUtilsService
} from './service.index';


@NgModule({
    declarations: [],
    imports: [
        CommonModule
    ],
    providers: [
        ApiService,
        UserService,
        GlobalService,
        LoginGuardGuard,
        VerifyTokenGuard,
        DashboardService,
        SettingsService,
        FileUtiles,
        ChartUtilsService,
        SidebarService,
        AlertService,
        SpinnerService,
        DataSourceService,
        GroupService,
        GlobalFiltersService,
        QueryBuilderService,
        ColumnUtilsService
    ]
})
export class ServicesModule { }

