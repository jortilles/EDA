import { PluginRegistry } from './plugin-registry';
import { GoogleAnalyticsPlugin } from './google-analytics';
import { OdooPlugin } from './odoo';
import { HoldedPlugin } from './holded';
import { ShopifyPlugin } from './shopify';

PluginRegistry.register(GoogleAnalyticsPlugin);
PluginRegistry.register(OdooPlugin);
PluginRegistry.register(HoldedPlugin);
PluginRegistry.register(ShopifyPlugin);

export { PluginRegistry };
