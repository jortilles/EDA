import { test, expect } from '../../fixtures/e2e-base';
import { esOrCa } from '../../../utils/locale-catalog';
import { openDashboardSidebar, clickSaveInSidebar, openPanelMenu } from '../../../utils/dashboard-ui-helpers';
import { setupSingleBarPanelDashboard } from '../../../utils/panel-creation-helpers';

/**
 * Verifica que "Bloquear panel" (menu "..." de un panel, ver panel-menu-options.ts:
 * toggleLock) tiene de verdad el efecto que promete en el DOM/UI, no solo en el
 * JSON guardado -- `isPanelLocked()`/`togglePanelLock()` en eda-blank-panel.
 * component.ts solo leen/escriben `panel.dragEnabled`/`resizeEnabled`; nada impide
 * que ese flag se guarde bien mientras gridster deja de respetarlo en la practica
 * (o al reves). Por eso esto comprueba el comportamiento REAL:
 *
 * - Redimensionar: angular-gridster2 (gridsterItem.component.ts de la libreria)
 *   solo renderiza los 8 divs ".gridster-item-resizable-handler" (uno por esquina/
 *   lado) cuando `resizeEnabled` es true (`*ngIf` en el propio componente) -- con
 *   el panel bloqueado no deberia haber NINGUNO en el DOM; desbloqueado, deberian
 *   reaparecer.
 * - Arrastrar: la posicion del panel se aplica via `transform: translate3d(x,y,0)`
 *   en linea (gridsterRenderer.service.ts de la libreria) -- se intenta un
 *   arrastre real (mousedown+mousemove+mouseup) sobre la cabecera del panel
 *   (".drag-handler", la unica zona arrastrable: el gridster esta configurado con
 *   `ignoreContent: true`) y se compara el `transform` antes/despues.
 *
 * Se cierra el ciclo desbloqueando y repitiendo ambas comprobaciones en sentido
 * contrario -- sin eso, un selector de arrastre roto (o el panel fuera del
 * viewport) daria el mismo resultado ("no se movio") tanto si el bloqueo
 * funciona de verdad como si no.
 *
 * Preparacion (datasource + dashboard + panel) y verificacion van en el MISMO
 * test: son un unico escenario de principio a fin, y separarlos en dos tests solo
 * producia dos videos (uno del setup, otro de la comprobacion) para revisar en
 * vez de uno solo.
 */
test('Menu contextual del panel ("..."): "Bloquear panel" impide arrastrar y redimensionar de verdad, no solo en el JSON guardado', async ({ page, api, uniqueName, track }) => {
    test.setTimeout(90_000);
    const panelTitle = 'Gráfico de Barras (lock test)';
    const dashboardId = await setupSingleBarPanelDashboard(api, page, uniqueName, track, panelTitle, 'context-menu-lock');

    await page.goto(`/#/dashboard/${dashboardId}`);
    await expect(page.locator('#myDashboard')).toBeVisible({ timeout: 15_000 });

    const escaped = panelTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const panel = page.locator('gridster-item').filter({
        has: page.locator('h2', { hasText: new RegExp(`^${escaped}$`) }),
    });
    await expect(panel, 'no se encuentra el panel a bloquear').toHaveCount(1);

    async function attemptDrag(): Promise<string> {
        const before = await panel.evaluate((el: HTMLElement) => el.style.transform);
        const handle = panel.locator('.drag-handler').first();
        // boundingBox() no hace scroll por si solo (a diferencia de .click()): sin
        // esto, un handle fuera del viewport haria que mouse.move/down/up caigan
        // en coordenadas que no tocan nada, dando "sin cambios" tanto si el
        // bloqueo funciona como si el intento de arrastre en si esta roto.
        await handle.scrollIntoViewIfNeeded();
        const handleBox = await handle.boundingBox();
        if (handleBox) {
            // Cerca del borde derecho de la cabecera, no en su centro: el centro
            // cae sobre el texto del titulo, y arrastrar desde ahi selecciona el
            // texto (resaltado visible en el video) en vez de (solo) mover el
            // panel -- visualmente confuso al revisar, aunque no afecta a si el
            // panel se movio de verdad.
            const startX = handleBox.x + handleBox.width - 15;
            const startY = handleBox.y + handleBox.height / 2;
            await page.mouse.move(startX, startY);
            await page.mouse.down();
            await page.mouse.move(startX + 250, startY + 250, { steps: 15 });
            await page.mouse.up();
        }
        const after = await panel.evaluate((el: HTMLElement) => el.style.transform);
        return after === before ? 'sin cambios' : 'se movio';
    }

    // --- Bloquear desde el menu "..." ---
    await openPanelMenu(page, panelTitle);
    await page.getByText(esOrCa('Bloquear panel'), { exact: true }).evaluate((el: HTMLElement) => el.click());
    await page.waitForTimeout(300);
    // HALLAZGO: Escape no cierra este dialogo de forma fiable (compite con el
    // closeOnEscape por defecto de p-dialog) -- se usa el icono "X" propio.
    await page.locator('.p-dialog').last().locator('i.fa-times').evaluate((el: HTMLElement) => el.click());
    await expect(page.locator('.p-dialog'), 'el menu del panel no se cierra tras bloquear').toHaveCount(0, { timeout: 10_000 });

    // --- Bloqueado: sin handles de resize, y arrastrar no mueve el panel ---
    await expect(panel.locator('.gridster-item-resizable-handler'), 'un panel bloqueado no deberia tener handles de resize en el DOM').toHaveCount(0);
    expect(await attemptDrag(), 'un panel bloqueado no deberia poder arrastrarse').toBe('sin cambios');

    // --- Se guarda y se verifica tambien el modelo de datos (dragEnabled/
    // resizeEnabled a false) -- el efecto real en el DOM de arriba es la parte
    // nueva, pero el flag persistido sigue siendo parte de "funciona de verdad". ---
    await openDashboardSidebar(page);
    await clickSaveInSidebar(page);
    await expect(page.locator('.swal2-popup, .p-toast-message-success, .p-toast-message-error'), 'no aparece ningun toast tras guardar').toBeVisible({ timeout: 60_000 });
    await expect(page.locator('.p-toast-message-error'), 'guardar dio un toast de error').toHaveCount(0);

    const full = await (await api.get(`/dashboard/${dashboardId}`)).json();
    const lockedPanel = full.dashboard?.config?.panel?.find((p: any) => p.title === panelTitle);
    expect(lockedPanel?.dragEnabled, '"Bloquear panel" deberia poner dragEnabled a false').toBe(false);
    expect(lockedPanel?.resizeEnabled, '"Bloquear panel" deberia poner resizeEnabled a false').toBe(false);

    // --- Desbloquear desde el menu "..." ---
    await openPanelMenu(page, panelTitle);
    await page.getByText(esOrCa('Desbloquear panel'), { exact: true }).evaluate((el: HTMLElement) => el.click());
    await page.waitForTimeout(300);
    await page.locator('.p-dialog').last().locator('i.fa-times').evaluate((el: HTMLElement) => el.click());
    await expect(page.locator('.p-dialog'), 'el menu del panel no se cierra tras desbloquear').toHaveCount(0, { timeout: 10_000 });

    // --- Desbloqueado: los handles de resize reaparecen, y arrastrar SI mueve el
    // panel -- cierra el ciclo: si esto fallase, "sin cambios" de mas arriba seria
    // un selector roto, no el bloqueo funcionando de verdad. ---
    await expect(panel.locator('.gridster-item-resizable-handler'), 'un panel desbloqueado deberia tener handles de resize en el DOM').not.toHaveCount(0);
    expect(await attemptDrag(), 'un panel desbloqueado SI deberia poder arrastrarse').toBe('se movio');
});
