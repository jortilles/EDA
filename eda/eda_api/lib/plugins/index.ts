import * as fs from 'fs';
import * as path from 'path';
import { PluginRegistry } from './plugin-registry';
import { IEDAPlugin } from './plugin.interface';

function isEDAPlugin(value: any): value is IEDAPlugin {
    return value && typeof value === 'object'
        && (value.kind === 'datasource' || value.kind === 'feature')
        && typeof value.type === 'string';
}

// Each plugin lives in its own folder (e.g. lib/plugins/OdooPlugin) and exposes
// its definition in that folder's index.ts. Here we discover and register them
// automatically, so adding a new plugin (one more folder) doesn't require
// touching this file.
const pluginDirs = fs
    .readdirSync(__dirname, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

for (const dir of pluginDirs) {
    const pluginModule = require(path.join(__dirname, dir));
    const plugin = Object.values(pluginModule).find(isEDAPlugin) as IEDAPlugin | undefined;

    if (plugin) {
        PluginRegistry.register(plugin);
    } else {
        console.warn(`[PluginRegistry] La carpeta "${dir}" no exporta un IEDAPlugin válido, se omite.`);
    }
}

export { PluginRegistry };
