import { Routes } from '@angular/router';
import { PagesV2Component } from './pages-v2';
import { DataSourceListComponent } from '../data-sources/data-source-list/data-source-list.component';
import { VerifyTokenGuard } from '@eda/services/service.index';
import { RoleGuard } from '@eda/services/guards/role-guard.guard';
export const pagesV2Routes: Routes = [
  {
    path: '',
    component: PagesV2Component,  // Wrapper que contiene el layout principal
    children: [
      {
        path: '',
        loadComponent: () => import('./home/home.page').then(c => c.HomePageV2)
      },
      {
        path: 'home',
        loadComponent: () => import('./home/home.page').then(c => c.HomePageV2)
      },
      {
        path: 'about',
        loadComponent: () => import('./about-eda/abaout-eda.page').then(c => c.AboutEdaPage)
      },
      {
        path: 'profile',
        loadComponent: () => import('./user-profile/user-profile.page').then(c => c.UserProfilePage)
      },
      {
        path: 'admin/users',
        data: { admin: true },
        canActivate: [RoleGuard],
        loadComponent: () => import('./user-list/user-list.page').then(c => c.UserListPage)
      },
      {
        path: 'admin/groups',
        data: { admin: true },
        canActivate: [RoleGuard],
        loadComponent: () => import('./group-list/group-list.page').then(c => c.GroupListPage)
      },
      {
        path: 'admin/models/import-export',
        data: { admin: true },
        canActivate: [RoleGuard],
        loadComponent: () => import('./model-import-export/model-import-export.page').then(c => c.ModelImportExportPage)
      },
      {
        path: 'admin/data-source',
        data: { admin: false, datasource: true },
        canActivate: [RoleGuard],
        loadComponent: () => import('./datasource-list/datasource-list.page').then(c => c.DataSourceListPage)
      },
      {
        path: 'admin/data-source/new',
        data: { admin: false, datasource: true },
        canActivate: [RoleGuard],
        loadComponent: () => import('./datasource-connection-detail/datasource-connection-detail.page').then(c => c.DataSourceConnectionDetailPage)
      },
      {
        path: 'admin/email-settings',
        data: { admin: true },
        canActivate: [RoleGuard],
        loadComponent: () => import('./email-settings/email-settings.page').then(c => c.EmailSettingsPage)
      },
      {
        path: 'dashboard/:id',
        loadComponent: () => import('./dashboard/dashboard.page').then(c => c.DashboardPageV2)
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