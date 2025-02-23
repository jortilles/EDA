import { Routes } from '@angular/router';
import { PagesV2Component } from './pages-v2';

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
                path: 'dashboard/:id',
                loadComponent: () => import('./dashboard/dashboard.page').then(c => c.DashboardPageV2)
            },
        ]
    }
    // {
    //     path: 'profile',
    //     loadComponent: () => import('./profile/profile.component').then(c => c.ProfileComponent)
    // },
    // {
    //     path: 'settings',
    //     loadComponent: () => import('./settings/settings.component').then(c => c.SettingsComponent)
    // }
];