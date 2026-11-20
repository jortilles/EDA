import { test, expect } from '../../fixtures/e2e-base';
import { esOrCaExact } from '../../../utils/locale-catalog';
import { openPanelMenu, openDashboardSidebar, clickSaveInSidebar } from '../../../utils/dashboard-ui-helpers';
import { setupSingleBarPanelDashboard } from '../../../utils/panel-creation-helpers';

/**
 * Verifica que "Cambiar tipo de gráfico" (menu "..." de un panel) re-renderiza de
 * verdad el panel con el nuevo tipo, no solo que la galeria se cierra sin error.
 * PanelChartComponent crea el componente del grafico dinamicamente por codigo
 * (`this.entry.createComponent(ComponentType)` en panel-chart.component.ts), un
 * componente Angular distinto por tipo (eda-bar, eda-line-d3, eda-table...) -- el
 * tag HTML que queda en el DOM cambia de verdad si el tipo cambio de verdad. Se
 * compara el conjunto de tags "custom element" (con guion, characteristico de
 * Angular) dentro del panel antes/despues, en vez de asumir un nombre de tag
 * concreto -- asi el test no depende de conocer de antemano como se llama cada
 * componente de grafico. Tambien se verifica el campo persistido (`chart`/
 * `edaChart`) vía la API, para que no sea solo un cambio visual en memoria.
 *
 * Preparacion (datasource + dashboard + panel) y verificacion van en el MISMO
 * test: son un unico escenario de principio a fin, no dos videos separados.
 */
test('Menu contextual del panel ("..."): "Cambiar tipo de gráfico" re-renderiza el panel con el nuevo tipo de verdad', async ({ page, api, uniqueName, track }) => {
    test.setTimeout(60_000);
    const panelTitle = 'Gráfico de Barras (change-type test)';
    const dashboardId = await setupSingleBarPanelDashboard(api, page, uniqueName, track, panelTitle, 'context-menu-changetype');

    await page.goto(`/#/dashboard/${dashboardId}`);
    await expect(page.locator('#myDashboard')).toBeVisible({ timeout: 15_000 });

    const escaped = panelTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const panel = page.locator('gridster-item').filter({
        has: page.locator('h2', { hasText: new RegExp(`^${escaped}$`) }),
    });

    const customTags = (el: Element) =>
        Array.from(el.querySelectorAll('*'))
            .map((e) => e.tagName.toLowerCase())
            .filter((t) => t.includes('-'))
            .sort()
            .join(',');

    const tagsBefore = await panel.evaluate(customTags);

    await openPanelMenu(page, panelTitle);
    await page.getByText(esOrCaExact('Cambiar tipo de gráfico')).evaluate((el: HTMLElement) => el.click());
    const gallery = page.locator('.chart-type-selector-grid');
    await expect(gallery, 'no se abre la galeria de tipos de grafico').toBeVisible({ timeout: 10_000 });
    // HALLAZGO: "Gráfico de Lineas" como hasText (substring) tambien matchea
    // "KPI + Gráfico de Lineas" (2 elementos, strict mode violation) -- cada item
    // tiene un <span class="chart-type-selector-label"> con SOLO la etiqueta (sin
    // el icono pegado), asi que se exige la coincidencia EXACTA ahi, no en todo
    // el item.
    await gallery.locator('.chart-type-selector-item').filter({
        has: page.locator('.chart-type-selector-label', { hasText: esOrCaExact('Gráfico de Lineas') }),
    }).click();

    // El cambio de tipo se aplica en memoria al instante (sin dialogo de
    // confirmacion para este caso, a diferencia de crear un panel nuevo) --
    // toPass() espera a que el nuevo componente Angular termine de montarse.
    await expect(async () => {
        const tagsAfter = await panel.evaluate(customTags);
        expect(tagsAfter, 'el DOM del panel no cambio tras "Cambiar tipo de gráfico"').not.toBe(tagsBefore);
    }).toPass({ timeout: 10_000 });

    // Persistido de verdad, no solo en memoria -- seleccionar en la galeria cierra
    // tanto la galeria como el menu del panel sin pasos intermedios (mismo
    // comportamiento que ya usa, sin confirmacion extra, el test equivalente de
    // dashboard-charts.spec.ts).
    await openDashboardSidebar(page);
    await clickSaveInSidebar(page);
    await expect(page.locator('.swal2-popup, .p-toast-message-success')).toBeVisible({ timeout: 20_000 });

    const full = await (await api.get(`/dashboard/${dashboardId}`)).json();
    const updatedPanel = full.dashboard?.config?.panel?.find((p: any) => p.title === panelTitle);
    expect(updatedPanel?.content?.chart, 'el tipo de grafico guardado no cambio a "line"').toBe('line');
});
