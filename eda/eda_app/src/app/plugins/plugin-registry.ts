import { IPlugin } from './plugin.interface';

/**
 * Central registry for plugins.
 * Add new plugins here — each entry must match one of the typed interfaces in plugin.interface.ts.
 *
 * Example:
 *   { 
 *      type: 'page', 
 *      key: 'my-page', 
 *      label: 'My Page', 
 *      component: MyPageComponent,
 *      route: 'custom/my-page', 
 *      menuIcon: 'pi pi-star', 
 *      menuSection: 'main' 
 *   }
 */

export const PLUGINS: IPlugin[] = [

];
