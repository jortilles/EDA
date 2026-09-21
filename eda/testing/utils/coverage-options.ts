import * as path from 'path';
import type { CoverageReportOptions } from 'monocart-coverage-reports';

/** Activada con `npm run test:coverage` (variable de entorno COVERAGE=1). */
export const COLLECT_COVERAGE = process.env.COVERAGE === '1';

export const COVERAGE_OUTPUT_DIR = path.resolve(__dirname, '..', 'coverage-report');

/**
 * Mismas opciones compartidas por el fixture (cada worker añade su cobertura) y por
 * global.teardown.ts (que genera el reporte una vez, al final). ng serve (Vite) sirve
 * las dependencias de node_modules pre-empaquetadas por separado bajo "@fs/.../vite/deps/",
 * así que basta excluir esas rutas y las de los scripts legacy (jquery) declarados en
 * angular.json; el resto de urls ".js" son build de la propia app (main/polyfills/chunks),
 * con sourcemap inline que apunta a "src/app/...".
 */
export const coverageOptions: CoverageReportOptions = {
    name: 'EDA - cobertura JS real del frontend (E2E)',
    outputDir: COVERAGE_OUTPUT_DIR,
    logging: 'error',
    reports: ['v8', 'console-summary'],
    entryFilter: {
        '**/@fs/**': false,
        '**/@vite/**': false,
        '**/assets/js/**': false,
        '**/scripts.js': false,
        '**/*.js': true,
    },
    sourceFilter: {
        '**/node_modules/**': false,
        '**/src/**': true,
        '**/**': false,
    },
};
