import { test, expect } from '../../fixtures/e2e-base';
import { esOrCa } from '../../../utils/locale-catalog';
import { openPanelMenu } from '../../../utils/dashboard-ui-helpers';
import { setupSingleBarPanelDashboard } from '../../../utils/panel-creation-helpers';

/**
 * Verifica que "Mostrar campos de origen" (menu "..." de un panel) muestra de
 * verdad los datos reales de la consulta del panel, no una tabla vacia o
 * desactualizada. source-fields-dialog.component.html renderiza una p-table con
 * las columnas de SourceFieldsUtils.getSourceFieldsResult(panelComponent) (los
 * campos configurados en la consulta) y sus filas reales -- se comprueba que las
 * cabeceras (".source-fields-th-title") incluyen los dos campos configurados
 * ("categoria", "importe") y que aparece al menos una fila con datos reales de la
 * datasource de pruebas (duckdb-fixture.ts), no una tabla sin filas.
 *
 * Preparacion (datasource + dashboard + panel) y verificacion van en el MISMO
 * test: son un unico escenario de principio a fin, no dos videos separados.
 */
test('Menu contextual del panel ("..."): "Mostrar campos de origen" lista las columnas y los datos reales de la consulta', async ({ page, api, uniqueName, track }) => {
    test.setTimeout(60_000);
    const panelTitle = 'Gráfico de Barras (source-fields test)';
    const dashboardId = await setupSingleBarPanelDashboard(api, page, uniqueName, track, panelTitle, 'context-menu-sourcefields');

    await page.goto(`/#/dashboard/${dashboardId}`);
    await expect(page.locator('#myDashboard')).toBeVisible({ timeout: 15_000 });

    await openPanelMenu(page, panelTitle);
    await page.getByText(esOrCa('Mostrar campos de origen'), { exact: true }).evaluate((el: HTMLElement) => el.click());
    const dialog = page.locator('.p-dialog').last();
    await expect(dialog, 'no se abre "Mostrar campos de origen"').toBeVisible({ timeout: 10_000 });

    const headers = dialog.locator('.source-fields-th-title');
    await expect(headers, 'no aparece ninguna columna').not.toHaveCount(0, { timeout: 10_000 });
    const headerTexts = (await headers.allTextContents()).map((t) => t.trim().toLowerCase());
    expect(headerTexts, 'falta la columna "categoria" entre las cabeceras mostradas').toContain('categoria');
    expect(headerTexts, 'falta la columna "importe" entre las cabeceras mostradas').toContain('importe');

    // Filas con datos reales (categorias conocidas de la datasource de pruebas),
    // no una tabla vacia que solo mostrase las cabeceras correctas.
    const bodyText = (await dialog.locator('table tbody').first().textContent()) ?? '';
    const hasKnownCategory = ['Mobiliario', 'Electronica', 'Iluminacion'].some((c) => bodyText.includes(c));
    expect(hasKnownCategory, 'no aparecen filas con datos reales de la consulta').toBe(true);

    await dialog.locator('button.cancel-button').click();
    await expect(dialog, 'el dialogo de campos de origen no se cierra').toHaveCount(0, { timeout: 10_000 });
});
