import MCR from 'monocart-coverage-reports';
import { test as base, expect } from './base';
import { COLLECT_COVERAGE, coverageOptions } from '../../utils/coverage-options';

// Una instancia por worker (proceso), que va acumulando cobertura de cada test via
// mcr.add(); el reporte final se genera una sola vez en global.teardown.ts. Ver
// "Multiprocessing Support" en la doc de monocart-coverage-reports: cada proceso crea
// su propia instancia con las MISMAS opciones (comparten outputDir/.cache en disco).
const mcr = COLLECT_COVERAGE ? MCR(coverageOptions) : null;

/**
 * El video/captura de Playwright nunca incluye el chrome del navegador (barra de
 * direcciones), asi que la URL real de cada momento no se puede ver revisando el
 * video -- se inyecta un HUD fijo en la esquina superior izquierda de la PAGINA
 * (esto si queda grabado, al ser parte del DOM) con la URL actual. addInitScript()
 * se re-ejecuta en cada documento nuevo (cada page.goto()), y dentro del mismo
 * documento (navegacion SPA por hash, sin recarga) se actualiza escuchando
 * "hashchange". pointer-events:none para que nunca intercepte clicks reales.
 */
const URL_HUD_SCRIPT = `(() => {
    const render = () => {
        let el = document.getElementById('__pw_url_hud__');
        if (!el) {
            el = document.createElement('div');
            el.id = '__pw_url_hud__';
            el.style.cssText = [
                'position:fixed', 'top:0', 'left:0', 'z-index:2147483647',
                'background:#000', 'color:#39ff14', 'font:bold 20px/1.5 monospace',
                'padding:4px 12px', 'pointer-events:none', 'max-width:100vw',
                'white-space:nowrap', 'overflow:hidden', 'text-overflow:ellipsis',
                'text-shadow:0 0 2px #000',
            ].join(';');
            (document.documentElement || document.body).appendChild(el);
        }
        el.textContent = location.href;
    };
    document.addEventListener('DOMContentLoaded', render);
    window.addEventListener('hashchange', render);
    render();
})();`;

export const test = base.extend<{}>({
    page: async ({ page }, use) => {
        await page.addInitScript(URL_HUD_SCRIPT);

        if (!mcr) {
            await use(page);
            // Se deja 2s extra tras terminar el test, antes de que el contexto se
            // cierre (y el video pare de grabar), para poder ver el resultado final
            // sin que el video corte en seco justo en la ultima aserción.
            await page.waitForTimeout(2_000).catch(() => {});
            return;
        }
        await page.coverage.startJSCoverage({ resetOnNavigation: false });
        await use(page);
        await page.waitForTimeout(2_000).catch(() => {});
        const jsCoverage = await page.coverage.stopJSCoverage();
        await mcr.add(jsCoverage);
    },
});

export { expect };
