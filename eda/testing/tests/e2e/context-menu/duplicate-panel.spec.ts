import { test, expect } from '../../fixtures/e2e-base';
import { esOrCa } from '../../../utils/locale-catalog';
import { openPanelMenu, openDashboardSidebar, clickSaveInSidebar } from '../../../utils/dashboard-ui-helpers';
import { setupSingleBarPanelDashboard } from '../../../utils/panel-creation-helpers';

/**
 * Verifica que "Duplicar panel" (menu "..." de un panel) crea de verdad una copia
 * INDEPENDIENTE con la misma configuracion, no solo que aparece un gridster-item
 * mas en pantalla. eda-blank-panel.component.ts:duplicatePanel() hace un
 * `_.cloneDeep(this.panel, true)` con un id nuevo (mismo titulo que el original,
 * a diferencia de clonar un DASHBOARD entero desde Home, que si le añade " copy"
 * al titulo) -- se guarda y se comprueba via la API que:
 * - Hay 2 paneles con ese titulo (no 1, y no mas de 2).
 * - Su `content` (tipo de grafico + consulta) es estructuralmente identico.
 * - Tienen ids distintos (independientes, no el mismo panel contado dos veces).
 *
 * Preparacion (datasource + dashboard + panel) y verificacion van en el MISMO
 * test: son un unico escenario de principio a fin, no dos videos separados.
 */
test('Menu contextual del panel ("..."): "Duplicar panel" crea una copia independiente con la misma configuracion', async ({ page, api, uniqueName, track }) => {
    test.setTimeout(60_000);
    const panelTitle = 'Gráfico de Barras (duplicate test)';
    const dashboardId = await setupSingleBarPanelDashboard(api, page, uniqueName, track, panelTitle, 'context-menu-duplicate');

    await page.goto(`/#/dashboard/${dashboardId}`);
    await expect(page.locator('#myDashboard')).toBeVisible({ timeout: 15_000 });
    // HALLAZGO: "#myDashboard" (el contenedor) puede quedar visible ANTES de que
    // su unico panel haya montado su gridster-item -- leer el recuento aqui sin
    // esperar primero capturaba 0 en vez de 1, haciendo que el "+1" esperado tras
    // duplicar (en realidad 2) nunca coincidiera con lo que ya habia en pantalla.
    await expect(page.locator('gridster-item'), 'el panel de partida no ha montado todavia').toHaveCount(1, { timeout: 10_000 });

    const beforeCount = await page.locator('gridster-item').count();

    await openPanelMenu(page, panelTitle);
    await page.getByText(esOrCa('Duplicar panel'), { exact: true }).evaluate((el: HTMLElement) => el.click());
    await expect(page.locator('gridster-item'), 'duplicar panel deberia añadir uno mas').toHaveCount(beforeCount + 1, { timeout: 10_000 });
    // HALLAZGO: el duplicado clona el panel persistido, pero no los datos ya
    // cargados del grafico (viven en la instancia del componente) -- el nuevo
    // panel tiene que volver a pedir sus datos al montarse, asi que se ve en
    // blanco un instante. Se espera a que su grafico realmente renderice.
    await expect(page.locator('gridster-item').last().locator('svg, canvas'), 'el panel duplicado no llega a renderizar su grafico').toBeVisible({ timeout: 10_000 });

    await openDashboardSidebar(page);
    await clickSaveInSidebar(page);
    await expect(page.locator('.swal2-popup, .p-toast-message-success')).toBeVisible({ timeout: 20_000 });

    const full = await (await api.get(`/dashboard/${dashboardId}`)).json();
    const matching = (full.dashboard?.config?.panel ?? []).filter((p: any) => p.title === panelTitle);
    expect(matching.length, 'deberia haber exactamente 2 paneles con el titulo original tras duplicar').toBe(2);

    const [original, duplicate] = matching;
    expect(original.id, 'el duplicado deberia tener un id distinto al original').not.toBe(duplicate.id);
    expect(duplicate.content?.chart, 'el tipo de grafico del duplicado no coincide con el original').toBe(original.content?.chart);

    // query.dashboard.panel_id es una referencia AL PROPIO panel (para cache/
    // scoping), no parte de "la configuracion del grafico" -- se espera que
    // difiera entre original y duplicado (cada uno es su propio panel), asi que
    // se excluye de la comparacion en vez de asumir que todo deberia ser identico.
    const normalizeQuery = (query: any) => {
        const clone = JSON.parse(JSON.stringify(query ?? {}));
        if (clone.dashboard) delete clone.dashboard.panel_id;
        return clone;
    };
    expect(
        JSON.stringify(normalizeQuery(duplicate.content?.query)),
        'la consulta del duplicado no coincide con la del original (fuera de la referencia propia panel_id)'
    ).toBe(JSON.stringify(normalizeQuery(original.content?.query)));
});
