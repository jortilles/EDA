import { PluginRegistry } from './plugin-registry';
import { GoogleAnalyticsPlugin } from './google-analytics';
import { OdooPlugin } from './odoo';

PluginRegistry.register(GoogleAnalyticsPlugin);
PluginRegistry.register(OdooPlugin);

export { PluginRegistry };
