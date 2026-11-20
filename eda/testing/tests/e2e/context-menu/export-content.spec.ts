import { test, expect } from '../../fixtures/e2e-base';
import { openPanelMenu } from '../../../utils/dashboard-ui-helpers';
import { setupSingleBarPanelDashboard } from '../../../utils/panel-creation-helpers';

/**
 * Verifica que "Exportar a Excel / CSV" (menu "..." de un panel) descarga de
 * verdad los DATOS REALES del panel, no solo un archivo con la extension correcta
 * (que es todo lo que comprobaba el test equivalente de dashboard-charts.spec.ts).
 * readyToExport() en panel-menu-options.ts construye el CSV/Excel a partir de
 * `panelComponent.currentQuery` (cabeceras) y `panelComponent.chartData`
 * (filas) -- se descarga el CSV, se lee su contenido como texto plano y se
 * comprueba que incluye las cabeceras configuradas ("categoria"/"importe") y al
 * menos una de las categorias reales de la datasource de pruebas
 * (duckdb-fixture.ts), no un archivo vacio o con cabeceras pero sin filas.
 *
 * Preparacion (datasource + dashboard + panel) y verificacion van en el MISMO
 * test: son un unico escenario de principio a fin, no dos videos separados.
 */
test('Menu contextual del panel ("..."): "Exportar a CSV" descarga un archivo con las columnas y los datos reales del panel', async ({ page, api, uniqueName, track }) => {
    test.setTimeout(60_000);
    const panelTitle = 'Gráfico de Barras (export test)';
    const dashboardId = await setupSingleBarPanelDashboard(api, page, uniqueName, track, panelTitle, 'context-menu-export');

    await page.goto(`/#/dashboard/${dashboardId}`);
    await expect(page.locator('#myDashboard')).toBeVisible({ timeout: 15_000 });

    await openPanelMenu(page, panelTitle);
    const downloadPromise = page.waitForEvent('download', { timeout: 10_000 });
    await page.locator('.p-dialog').last().getByText('CSV', { exact: true }).evaluate((el: HTMLElement) => el.click());
    const download = await downloadPromise;
    expect(download.suggestedFilename(), 'el export CSV deberia tener extension .csv').toMatch(/\.csv$/i);

    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    const content = Buffer.concat(chunks).toString('utf-8').toLowerCase();

    expect(content, 'el CSV no incluye la cabecera "categoria"').toContain('categoria');
    expect(content, 'el CSV no incluye la cabecera "importe"').toContain('importe');

    const hasKnownCategory = ['mobiliario', 'electronica', 'iluminacion'].some((c) => content.includes(c));
    expect(hasKnownCategory, 'el CSV no tiene filas con datos reales (solo cabeceras, o vacio)').toBe(true);
});
