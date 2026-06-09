import { IDatasourcePlugin } from './datasource-plugin.interface';
import { Ga4FormComponent } from './google-analytics/ga4-form.component';
import { OdooFormComponent } from './odoo/odoo-form.component';

export const DATASOURCE_PLUGINS: IDatasourcePlugin[] = [
    { type: 'googleanalytics', label: 'Google Analytics 4', port: null, formComponent: Ga4FormComponent },
    { type: 'odoo',            label: 'Odoo',               port: null, formComponent: OdooFormComponent },
];
