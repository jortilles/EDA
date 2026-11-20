import { test, expect } from '../../fixtures/e2e-base';
import { esOrCa } from '../../../utils/locale-catalog';
import { openPanelMenu } from '../../../utils/dashboard-ui-helpers';
import { setupSingleBarPanelDashboard } from '../../../utils/panel-creation-helpers';

/**
 * Verifica que "Editar estilo del panel" (menu "..." de un panel) aplica de verdad
 * el estilo elegido al DOM renderizado, no solo que el dialogo se abre y cierra sin
 * error. panel-edit-style-dialog.component.html liga "Color del panel" a
 * `panelColor` y la alineacion del titulo a `alignPanelTitle`; al confirmar,
 * eda-blank-panel.component.ts:onClosePanelStyleProperties() guarda eso en
 * `panel.styleOverride` y recomputeEffectiveStyles() lo traduce a:
 * - `effectivePanelContent.background` -> [ngStyle] del div raiz del panel.
 * - `effectivePanelText['justify-content']` -> [ngStyle] del <h2> del titulo
 *   ('center' si `alignPanelTitle === 'center'`).
 * Se comprueba el `background-color` COMPUTADO (el navegador normaliza cualquier
 * hex a rgb(...), asi que comparar contra el rgb esperado es mas fiable que mirar
 * el string de estilo en crudo) y el `justify-content` aplicado.
 *
 * Preparacion (datasource + dashboard + panel) y verificacion van en el MISMO
 * test: son un unico escenario de principio a fin, no dos videos separados.
 */
test('Menu contextual del panel ("..."): "Editar estilo del panel" cambia de verdad el color de fondo y la alineacion del titulo', async ({ page, api, uniqueName, track }) => {
    test.setTimeout(60_000);
    const panelTitle = 'Gráfico de Barras (style test)';
    const dashboardId = await setupSingleBarPanelDashboard(api, page, uniqueName, track, panelTitle, 'context-menu-style');

    await page.goto(`/#/dashboard/${dashboardId}`);
    await expect(page.locator('#myDashboard')).toBeVisible({ timeout: 15_000 });

    const escaped = panelTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const panel = page.locator('gridster-item').filter({
        has: page.locator('h2', { hasText: new RegExp(`^${escaped}$`) }),
    });
    const contentDiv = panel.locator('div.rounded-lg').first();
    const titleEl = panel.locator('h2').first();

    // --- Estado inicial: ni el color ni la alineacion "center" deberian estar
    // ya aplicados por casualidad (si lo estuvieran, el test no demostraria nada). ---
    const bgBefore = await contentDiv.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bgBefore, 'el panel ya tenia el color de fondo objetivo antes de aplicarlo').not.toBe('rgb(171, 205, 239)');
    const justifyBefore = await titleEl.evaluate((el) => (el as HTMLElement).style.justifyContent);
    expect(justifyBefore, 'el titulo ya estaba centrado antes de aplicarlo').not.toBe('center');

    await openPanelMenu(page, panelTitle);
    await page.getByText(esOrCa('Editar estilo del panel'), { exact: true }).evaluate((el: HTMLElement) => el.click());
    const styleDialog = page.locator('.p-dialog').last();
    await expect(styleDialog, 'no se abre "Editar estilo del panel"').toBeVisible({ timeout: 10_000 });

    // #ABCDEF -> rgb(171, 205, 239): el navegador normaliza cualquier hex a rgb al
    // leer el computed style, asi que se compara en ese formato.
    await styleDialog.locator('input.eda-color-pick').first().fill('#ABCDEF');
    await styleDialog.locator('input[type="radio"][value="center"]').check({ force: true });
    await styleDialog.locator('button.confirm-button').click();
    await expect(styleDialog, 'el dialogo de estilo no se cierra tras aplicar').toHaveCount(0, { timeout: 10_000 });

    // --- Efecto real en el DOM, no solo que el dialogo se cerro sin error ---
    await expect(async () => {
        const bg = await contentDiv.evaluate((el) => getComputedStyle(el).backgroundColor);
        expect(bg, 'el color de fondo del panel no refleja el elegido').toBe('rgb(171, 205, 239)');
    }).toPass({ timeout: 10_000 });
    const justifyAfter = await titleEl.evaluate((el) => (el as HTMLElement).style.justifyContent);
    expect(justifyAfter, 'la alineacion del titulo no refleja "centrado"').toBe('center');
});
