'use strict';

module.exports = {
    requiredFields: ['path', 'label', 'componentFile', 'componentExport'],
    describe: (p) => p.path,

    buildOutput(plugins) {
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

        return `// AUTO-GENERADO por scripts/generate-plugins.js — no editar a mano.
// Para agregar un page plugin nuevo, crea una carpeta en page-plugins con su
// plugin.meta.ts y componente, y vuelve a correr \`npm start\` / \`npm run build:prod\`.

export const PLUGIN_ROUTES = [
${entries}
];
`;
    },
};
