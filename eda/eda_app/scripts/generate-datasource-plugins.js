'use strict';

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const PLUGINS_DIR   = path.join(__dirname, '../src/app/plugins/datasource-plugins');
const REGISTRY_PATH = path.join(PLUGINS_DIR, 'datasource-plugin-registry.ts');
const META_FILENAME = 'plugin.meta.ts';

const REQUIRED_FIELDS = ['type', 'label', 'apiBasePath', 'componentFile', 'componentExport'];

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

const pluginDirs = fs
    .readdirSync(PLUGINS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

const plugins = [];

for (const dir of pluginDirs) {
    const metaPath = path.join(PLUGINS_DIR, dir, META_FILENAME);

    if (!fs.existsSync(metaPath)) {
        console.warn(`[datasource-plugins] "${dir}" no tiene ${META_FILENAME}, se omite`);
        continue;
    }

    const meta = loadMeta(metaPath);
    const missing = REQUIRED_FIELDS.filter((field) => meta?.[field] === undefined);

    if (missing.length) {
        console.warn(`[datasource-plugins] "${dir}": ${META_FILENAME} incompleto (faltan: ${missing.join(', ')}), se omite`);
        continue;
    }

    plugins.push({ dir, ...meta });
}

const imports = plugins
    .map((p) => `import { ${p.componentExport} } from './${p.dir}/${p.componentFile.replace(/^\.\//, '')}';`)
    .join('\n');

const entries = plugins
    .map((p) => `    { type: '${p.type}', label: '${p.label}', port: ${p.port === null ? 'null' : p.port}, formComponent: ${p.componentExport}, apiBasePath: '${p.apiBasePath}' },`)
    .join('\n');

const output = `// AUTO-GENERADO por scripts/generate-datasource-plugins.js — no editar a mano.
// Para agregar un plugin nuevo, crea una carpeta en datasource-plugins con su
// componente y un plugin.meta.ts, y vuelve a correr \`npm start\` / \`npm run build:prod\`.
import { IDatasourcePlugin } from './datasource-plugin.interface';
${imports}

export const DATASOURCE_PLUGINS: IDatasourcePlugin[] = [
${entries}
];
`;

const previous = fs.existsSync(REGISTRY_PATH) ? fs.readFileSync(REGISTRY_PATH, 'utf8') : null;
if (previous !== output) {
    fs.writeFileSync(REGISTRY_PATH, output, 'utf8');
}

console.log(`[datasource-plugins] ${plugins.length} plugin(s) registrados: ${plugins.map((p) => p.type).join(', ')}`);
