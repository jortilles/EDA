'use strict';

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const PLUGINS_DIR   = path.join(__dirname, '../src/app/plugins/page-plugins');
const REGISTRY_PATH = path.join(PLUGINS_DIR, 'page-plugin-registry.ts');
const META_FILENAME = 'plugin.meta.ts';

const REQUIRED_FIELDS = ['path', 'label', 'componentFile', 'componentExport'];

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
        console.warn(`[page-plugins] "${dir}" no tiene ${META_FILENAME}, se omite`);
        continue;
    }

    const meta = loadMeta(metaPath);
    const missing = REQUIRED_FIELDS.filter((field) => meta?.[field] === undefined);

    if (missing.length) {
        console.warn(`[page-plugins] "${dir}": ${META_FILENAME} incompleto (faltan: ${missing.join(', ')}), se omite`);
        continue;
    }

    plugins.push({ dir, ...meta });
}

const entries = plugins
    .map(
        (p) => [
            `    {`,
            `        path: '${p.path}',`,
            `        loadComponent: () => import('./${p.dir}/${p.componentFile.replace(/^\.\//, '')}').then(m => m.${p.componentExport}),`,
            `        data: { label: '${p.label}' ${p.menuIcon ? `, menuIcon: '${p.menuIcon}'` : ''} ${p.menuSection ? `, menuSection: '${p.menuSection}'` : ''} },`,
            `    },`,
        ].join('\n')
    )
    .join('\n');

const output = `// AUTO-GENERADO por scripts/generate-page-plugins.js — no editar a mano.
// Para agregar un page plugin nuevo, crea una carpeta en page-plugins con su
// plugin.meta.ts y componente, y vuelve a correr \`npm start\` / \`npm run build:prod\`.

export const PLUGIN_ROUTES = [
${entries}
];
`;

const previous = fs.existsSync(REGISTRY_PATH) ? fs.readFileSync(REGISTRY_PATH, 'utf8') : null;
if (previous !== output) {
    fs.writeFileSync(REGISTRY_PATH, output, 'utf8');
}

console.log(`[page-plugins] ${plugins.length} plugin(s) registrados: ${plugins.map((p) => p.path).join(', ')}`);
