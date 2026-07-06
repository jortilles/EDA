import { Routes } from '@angular/router';
import { PagesV3Component } from './pages-v3';
import { DataSourceListComponent } from './data-sources/data-source-list/data-source-list.component';
import { VerifyTokenGuard } from '@eda/services/service.index';
import { RoleGuard } from '@eda/services/guards/role-guard.guard';
/**
* PLUGIN_ROUTES is automatically generated during build.

* Each page plugin registers its own route; if it shares a path with a core route,
* the plugin takes precedence because it is inserted BEFORE CORE_CHILDREN.

* To write /home, a fork only needs to create:
* src/app/plugins/page-plugins/<name>/plugin.meta.ts
* with the path: 'home' and its own component.
*/
import { PLUGIN_ROUTES } from '../../plugins/page-plugins/page-plugin-registry';

/**
*Fixed kernel paths. Used as a fallback when no page plugin is present.
* Registers a path with the same path.
*/
const CORE_CHILDREN: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    // Default core home path. If a page plugin registers its own
    // path: 'home' (see PLUGIN_ROUTES above), that one takes precedence because it is inserted
    // earlier into the child array; this path only acts as a fallback.
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
    path: 'data-source/:id/update-file',
    canActivate: [VerifyTokenGuard],
    loadComponent: () => import('./data-sources/datasource-update-file/datasource-update-file.page').then(c => c.DataSourceUpdateFilePage)
  },
  {
    path: 'admin/email-settings',
    data: { admin: true },
    canActivate: [RoleGuard],
    loadComponent: () => import('./mail-management/email-settings.page').then(c => c.EmailSettingsPage)
  },
  {
    path: 'admin/ai-settings',
    data: { admin: true },
    canActivate: [RoleGuard],
    loadComponent: () => import('./ai-management/ai-management.page').then(c => c.AiManagementPage)
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
];

export const pagesV3Routes: Routes = [
  {
    path: '',
    component: PagesV3Component,
    canActivate: [VerifyTokenGuard],
    // PLUGIN_ROUTES primero → cualquier page plugin con el mismo path
    // que una ruta del core la reemplaza automáticamente.
    // CORE_CHILDREN después  → rutas por defecto si no hay plugin.
    children: [
      ...PLUGIN_ROUTES,
      ...CORE_CHILDREN,
    ]
  }
];
