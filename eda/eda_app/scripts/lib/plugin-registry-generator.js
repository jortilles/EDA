'use strict';

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const META_FILENAME = 'plugin.meta.ts';

/**
 * plugin.meta.ts files have no imports, so they can be transpiled and
 * evaluated in isolation without pulling in Angular/RxJS.
 */
function loadMeta(metaPath) {
    const source = fs.readFileSync(metaPath, 'utf8');
    const { outputText } = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 },
    });

    const sandboxModule = { exports: {} };
    const run = new Function('module', 'exports', outputText);
    run(sandboxModule, sandboxModule.exports);

    return sandboxModule.exports.meta;
}

/**
 * Scans `pluginsDir` for subfolders with a `plugin.meta.ts`, validates
 * `requiredFields`, builds the registry file via `buildOutput(plugins)`,
 * and writes it to `registryPath` only if the content actually changed.
 *
 * @param {object} opts
 * @param {string} opts.name           Prefix used in console logs, e.g. 'page-plugins'.
 * @param {string} opts.pluginsDir     Absolute path to the plugins folder to scan.
 * @param {string} opts.registryPath   Absolute path to the generated registry file.
 * @param {string[]} opts.requiredFields  Fields that must be present in each plugin.meta.ts.
 * @param {(plugins: any[]) => string} opts.buildOutput  Returns the full registry file contents.
 * @param {(plugin: any) => string} [opts.describe]  Label used in the final summary log (defaults to `type` or `path`).
 */
function generatePluginRegistry({ name, pluginsDir, registryPath, requiredFields, buildOutput, describe }) {
    const pluginDirs = fs
        .readdirSync(pluginsDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort();

    const plugins = [];

    for (const dir of pluginDirs) {
        const metaPath = path.join(pluginsDir, dir, META_FILENAME);

        if (!fs.existsSync(metaPath)) {
            console.warn(`[${name}] "${dir}" no tiene ${META_FILENAME}, se omite`);
            continue;
        }

        const meta = loadMeta(metaPath);
        const missing = requiredFields.filter((field) => meta?.[field] === undefined);

        if (missing.length) {
            console.warn(`[${name}] "${dir}": ${META_FILENAME} incompleto (faltan: ${missing.join(', ')}), se omite`);
            continue;
        }

        plugins.push({ dir, ...meta });
    }

    const output = buildOutput(plugins);

    const previous = fs.existsSync(registryPath) ? fs.readFileSync(registryPath, 'utf8') : null;
    if (previous !== output) {
        fs.writeFileSync(registryPath, output, 'utf8');
    }

    const describePlugin = describe ?? ((p) => p.type ?? p.path ?? p.dir);
    console.log(`[${name}] ${plugins.length} plugin(s) registrados: ${plugins.map(describePlugin).join(', ')}`);
}

module.exports = { generatePluginRegistry };
