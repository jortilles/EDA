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
    ColumnUtilsService,
    MapUtilsService,
    UploadFileService,
    DateUtils,
    AddTableService,
    StyleService,
    MailService,
    StyleProviderService
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
        ColumnUtilsService,
        MapUtilsService,
        UploadFileService,
        DateUtils,
        AddTableService,
        StyleService,
        MailService,
        StyleProviderService

    ]
})
export class ServicesModule { }

