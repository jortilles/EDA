import { Routes } from '@angular/router';
import { PagesV2Component } from './pages-v2';
import { DataSourceListComponent } from '../data-sources/data-source-list/data-source-list.component';
import { VerifyTokenGuard } from '@eda/services/service.index';

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
        path: 'about',
        loadComponent: () => import('./about-eda/abaout-eda.page').then(c => c.AboutEdaPage)
      },
      {
        path: 'profile',
        loadComponent: () => import('./user-profile/user-profile.page').then(c => c.UserProfilePage)
      },
      {
        path: 'admin/users',
        loadComponent: () => import('./user-list/user-list.page').then(c => c.UserListPage)
      },
      {
        path: 'admin/groups',
        loadComponent: () => import('./group-list/group-list.page').then(c => c.GroupListPage)
      },
      {
        path: 'admin/models/import-export',
        loadComponent: () => import('./model-import-export/model-import-export.page').then(c => c.ModelImportExportPage)
      },
      {
        path: 'admin/email-settings',
        loadComponent: () => import('./email-settings/email-settings.page').then(c => c.EmailSettingsPage)
      },
      {
        path: 'dashboard/:id',
        loadComponent: () => import('./dashboard/dashboard.page').then(c => c.DashboardPageV2)
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