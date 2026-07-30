// AUTO-GENERADO por scripts/generate-plugins.js — no editar a mano.
// Para agregar un page plugin nuevo, crea una carpeta en page-plugins con su
// plugin.meta.ts y componente, y vuelve a correr `npm start` / `npm run build:prod`.

export const PLUGIN_ROUTES = [
    {
        path: 'home',
        loadComponent: () => import('./home-sda/home.component').then(m => m.HomeSdaComponent),
        data: { label: 'Home' , menuIcon: 'home' , menuSection: 'main' },
    },
];
