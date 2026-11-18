import MCR from 'monocart-coverage-reports';
import { test as base, expect } from './base';
import { COLLECT_COVERAGE, coverageOptions } from '../../utils/coverage-options';

// Una instancia por worker (proceso), que va acumulando cobertura de cada test via
// mcr.add(); el reporte final se genera una sola vez en global.teardown.ts. Ver
// "Multiprocessing Support" en la doc de monocart-coverage-reports: cada proceso crea
// su propia instancia con las MISMAS opciones (comparten outputDir/.cache en disco).
const mcr = COLLECT_COVERAGE ? MCR(coverageOptions) : null;

export const test = base.extend<{}>({
    page: async ({ page }, use) => {
        if (!mcr) {
            await use(page);
            return;
        }
        await page.coverage.startJSCoverage({ resetOnNavigation: false });
        await use(page);
        const jsCoverage = await page.coverage.stopJSCoverage();
        await mcr.add(jsCoverage);
    },
});

export { expect };
