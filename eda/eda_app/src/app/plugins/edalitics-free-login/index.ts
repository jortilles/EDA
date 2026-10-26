import { ILoginPlugin } from '../plugin.interface';

/**
 * Edalitics Free login: redesigned login page with self-service sign up.
 * Needs the API "signup" plugin; the "Create account" tab only shows when config/signup.config.js enables it.
 * Components are lazy loaded so the plugin adds nothing to the main bundle.
 */
export const EdaliticsFreeLoginPlugin: ILoginPlugin = {
    type: 'login',
    key: 'edalitics-free-login',
    label: 'Edalitics Free login',
    loadComponent: () => import('./free-login.component').then(c => c.FreeLoginComponent),
    routes: [
        { path: 'signup', loadComponent: () => import('./free-login.component').then(c => c.FreeLoginComponent), data: { mode: 'signup' } },
        { path: 'terms', loadComponent: () => import('./terms/terms.component').then(c => c.TermsComponent) },
    ],
};
