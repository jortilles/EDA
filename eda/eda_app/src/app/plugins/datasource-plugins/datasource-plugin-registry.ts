// AUTO-GENERADO por scripts/generate-datasource-plugins.js — no editar a mano.
// Para agregar un plugin nuevo, crea una carpeta en datasource-plugins con su
// componente y un plugin.meta.ts, y vuelve a correr `npm start` / `npm run build:prod`.
import { IDatasourcePlugin } from './datasource-plugin.interface';
import { Ga4FormComponent } from './google-analytics/ga4-form.component';
import { HoldedFormComponent } from './holded/holded-form.component';
import { OdooFormComponent } from './odoo/odoo-form.component';

export const DATASOURCE_PLUGINS: IDatasourcePlugin[] = [
    { type: 'googleanalytics', label: 'Google Analytics 4', port: null, formComponent: Ga4FormComponent, apiBasePath: '/google-analytics' },
    { type: 'holded', label: 'Holded', port: null, formComponent: HoldedFormComponent, apiBasePath: '/holded' },
    { type: 'odoo', label: 'Odoo', port: null, formComponent: OdooFormComponent, apiBasePath: '/odoo' },
];
