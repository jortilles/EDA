import { IDatasourcePlugin } from './datasource-plugin.interface';
import { Ga4FormComponent } from './google-analytics/ga4-form.component';
import { OdooFormComponent } from './odoo/odoo-form.component';
import { HoldedFormComponent } from './holded/holded-form.component';
import { ShopifyFormComponent } from './shopify/shopify-form.component';

export const DATASOURCE_PLUGINS: IDatasourcePlugin[] = [
    { type: 'googleanalytics', label: 'Google Analytics 4', port: null, formComponent: Ga4FormComponent,    apiBasePath: '/google-analytics' },
    { type: 'odoo',            label: 'Odoo',               port: null, formComponent: OdooFormComponent,   apiBasePath: '/odoo' },
    { type: 'holded',          label: 'Holded',             port: null, formComponent: HoldedFormComponent, apiBasePath: '/holded' },
    { type: 'shopify',         label: 'Shopify',            port: null, formComponent: ShopifyFormComponent, apiBasePath: '/shopify' },
];
