import { PluginRegistry } from './plugin-registry';
import { GoogleAnalyticsPlugin } from './google-analytics';
import { OdooPlugin } from './odoo';
import { HoldedPlugin } from './holded';
import { SignupPlugin } from './signup';

PluginRegistry.register(GoogleAnalyticsPlugin);
PluginRegistry.register(OdooPlugin);
PluginRegistry.register(HoldedPlugin);
PluginRegistry.register(SignupPlugin);

export { PluginRegistry };
