'use strict';

const fs = require('fs');
const path = require('path');
const { generatePluginRegistry } = require('./lib/plugin-registry-generator');

const PLUGINS_ROOT = path.join(__dirname, '../src/app/plugins');
const TYPES_DIR     = path.join(__dirname, 'plugin-types');

/**
 * Each `<x>-plugins` folder under `src/app/plugins` requires a corresponding
 * module in `scripts/plugin-types/<x>-plugins.js` that exports
 * `requiredFields` and `buildOutput(plugins)` (and optionally
 * `describe(plugin)`).
 *
 * By convention, the generated registry is named
 * `<x>-plugin-registry.ts` and is placed in the same folder.
 */
const pluginTypeDirs = fs
    .readdirSync(PLUGINS_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.endsWith('-plugins'))
    .map((entry) => entry.name)
    .sort();

for (const dirName of pluginTypeDirs) {
    const configPath = path.join(TYPES_DIR, `${dirName}.js`);

    if (!fs.existsSync(configPath)) {
        console.warn(`[generate-plugins] "${dirName}" no tiene scripts/plugin-types/${dirName}.js, se omite`);
        continue;
    }

    const { requiredFields, buildOutput, describe } = require(configPath);
    const registryFilename = dirName.replace(/-plugins$/, '-plugin-registry.ts');

    generatePluginRegistry({
        name: dirName,
        pluginsDir: path.join(PLUGINS_ROOT, dirName),
        registryPath: path.join(PLUGINS_ROOT, dirName, registryFilename),
        requiredFields,
        buildOutput,
        describe,
    });
}
