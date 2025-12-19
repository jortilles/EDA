import { Routes } from '@angular/router';
import { PagesV3Component } from './pages-v3';
import { DataSourceListComponent } from './data-sources/data-source-list/data-source-list.component';
import { VerifyTokenGuard } from '@eda/services/service.index';
import { RoleGuard } from '@eda/services/guards/role-guard.guard';
export const pagesV3Routes: Routes = [
  {
    path: '',
    component: PagesV3Component,  // Wrapper que contiene el layout principal
    children: [
      {
        path: '',
        loadComponent: () => import('./home/home.page').then(c => c.HomePage)
      },
      {
        path: 'home',
        loadComponent: () => import('./home/home.page').then(c => c.HomePage)
      },
      {
        path: 'about',
        loadComponent: () => import('./about/about-eda.page').then(c => c.AboutEdaPage)
        },
      {
        path: 'profile',
        loadComponent: () => import('./user-profile/user-profile.page').then(c => c.UserProfilePage)
      },
      {
        path: 'admin/users',
        data: { admin: true },
        canActivate: [RoleGuard],
        loadComponent: () => import('./users-management/users-list/user-list.page').then(c => c.UserListPage)
      },
      {
        path: 'admin/groups',
        data: { admin: true },
        canActivate: [RoleGuard],
        loadComponent: () => import('./groups-management/group-list/group-list.page').then(c => c.GroupListPage)
      },
      {
        path: 'admin/models/import-export',
        data: { admin: true },
        canActivate: [RoleGuard],
        loadComponent: () => import('./model-settings/model-import-export.page').then(c => c.ModelImportExportPage)
      },
      {
        path: 'admin/data-source',
        data: { admin: false, datasource: true },
        canActivate: [RoleGuard],
        loadComponent: () => import('./data-sources/datasources-list/datasources-list.page').then(c => c.DataSourceListPage)
      },
      {
        path: 'admin/data-source/new',
        data: { admin: false, datasource: true },
        canActivate: [RoleGuard],
        loadComponent: () => import('./data-sources/datasource-connection-detail/datasource-connection-detail.page').then(c => c.DataSourceConnectionDetailPage)
      },
      {
        path: 'admin/email-settings',
        data: { admin: true },
        canActivate: [RoleGuard],
        loadComponent: () => import('./mail-management/email-settings.page').then(c => c.EmailSettingsPage)
      },
      {
        path: 'dashboard/:id',
        loadComponent: () => import('./dashboard/dashboard.page').then(c => c.DashboardPage)
      },
      {
        path: 'logs',
        loadComponent: () => import('./logs/logs.component').then(c => c.LogsComponent)
      },
      {
        path: 'data-source/:id',
        component: DataSourceListComponent,
        canActivate: [VerifyTokenGuard],
        runGuardsAndResolvers: 'paramsChange'
      },
    ]
  }
];