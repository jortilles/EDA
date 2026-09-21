/**
 * Meta-data for the page plugin "home-sda".
 *
 * Fields:
 * - path:           Angular route path (e.g. 'home' → #/home).
 *                   If another plugin declares the same path it will win
 *                   (plugins are loaded before core routes).
 * - label:          Human-readable name.
 * - menuIcon:       Icon displayed in the sidebar (PrimeIcons class).
 * - menuSection:    Where the item is placed in the sidebar:
 *                   'main' → top area, 'admin' → admin section.
 * - componentFile:  Relative path (from the plugin folder) to the TS file
 *                   that contains the Angular component.
 * - componentExport:Exact name of the exported component class.
 */
export const meta = {
    path: 'home',
    label: 'Home',
    menuIcon: 'home',
    menuSection: 'main',
    componentFile: './home.component',
    componentExport: 'HomeSdaComponent',
};
