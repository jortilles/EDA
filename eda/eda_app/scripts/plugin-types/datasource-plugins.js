'use strict';

module.exports = {
    requiredFields: ['type', 'label', 'apiBasePath', 'componentFile', 'componentExport'],

    buildOutput(plugins) {
        const imports = plugins
            .map((p) => `import { ${p.componentExport} } from './${p.dir}/${p.componentFile.replace(/^\.\//, '')}';`)
            .join('\n');

        const entries = plugins
            .map((p) => `    { type: '${p.type}', label: '${p.label}', port: ${p.port === null ? 'null' : p.port}, formComponent: ${p.componentExport}, apiBasePath: '${p.apiBasePath}' },`)
            .join('\n');

        return `// AUTO-GENERADO por scripts/generate-plugins.js — no editar a mano.
// Para agregar un plugin nuevo, crea una carpeta en datasource-plugins con su
// componente y un plugin.meta.ts, y vuelve a correr \`npm start\` / \`npm run build:prod\`.
import { IDatasourcePlugin } from './datasource-plugin.interface';
${imports}

export const DATASOURCE_PLUGINS: IDatasourcePlugin[] = [
${entries}
];
`;
    },
};
