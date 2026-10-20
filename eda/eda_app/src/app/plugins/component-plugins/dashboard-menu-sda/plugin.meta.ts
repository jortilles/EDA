/**
 * Meta-data for the dashboard menu plugin "dashboard-menu-sda".
 *
 * Fields:
 * - type:          Plugin type, used to pick which toolbar a dashboard uses.
 * - label:         Human-readable name.
 * - i18n:          i18n tag. The value itself is handled by the component
 *                  ($localize at runtime); here it only identifies the entry.
 * - menuIcon:      Icon class (PrimeIcons) shown when the plugin is listed.
 * - permissions:   Access control. Mix of profiles and actions:
 *                  'admin' | 'owner' | 'observer' | 'anonim' (profiles)
 *                  'edit' | 'delete' | 'export' (actions)
 * - componentFile:  Relative path (from the plugin folder) to the TS file
 *                   that contains the Angular component.
 * - componentExport:Exact name of the exported component class.
 */
export const meta = {
    type: 'report-toolbar',
    label: 'Menú del informe',
    i18n: 'dashboardMenuLabel',
    menuIcon: 'pi-bars',
    permissions: ['edit'],
    componentFile: './dashboard-menu.component',
    componentExport: 'DashboardMenuSdaComponent',
};