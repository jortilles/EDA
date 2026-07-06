'use strict';

const fs = require('fs');
const path = require('path');
const { generatePluginRegistry } = require('./lib/plugin-registry-generator');

const PLUGINS_ROOT = path.join(__dirname, '../src/app/plugins');
const TYPES_DIR     = path.join(__dirname, 'plugin-types');

/**
 * Cada carpeta `<x>-plugins` bajo src/app/plugins necesita un módulo homónimo
 * en scripts/plugin-types/<x>-plugins.js que exporte `requiredFields` y
 * `buildOutput(plugins)` (y opcionalmente `describe(plugin)`).
 *
 * El registry generado se llama por convención `<x>-plugin-registry.ts`
 * dentro de esa misma carpeta.
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
