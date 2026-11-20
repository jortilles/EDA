import { expect, type Page } from '@playwright/test';

/** Abre el menu lateral del dashboard (icono "..."), reintentando el click si el
 * overlay de PrimeNG no llega a abrirse a la primera (se ha observado que a veces
 * el primer click no dispara showSidebar() de forma fiable justo tras cargar la
 * pagina). */
export async function openDashboardSidebar(page: Page) {
    const ellipsis = page.locator('button:has(i.pi-ellipsis-v)');
    for (let attempt = 0; attempt < 4; attempt++) {
        await ellipsis.click();
        try {
            await page.locator('.sidebarLabels').first().waitFor({ state: 'visible', timeout: 4_000 });
            return;
        } catch {
            // no abrio: reintentamos
        }
    }
    await expect(page.locator('.sidebarLabels').first()).toBeVisible({ timeout: 5_000 });
}

/** "Guardar" y "Guardar como" ambos contienen el texto "Guardar", asi que hace
 * falta match exacto (ignorando el espacio inicial del label localizado). */
export async function clickSaveInSidebar(page: Page) {
    await page.locator('.sidebarLabels', { hasText: 'Guardar' }).filter({ hasNotText: 'como' }).first().click();
}

/**
 * Abre el menu "..." ("OPCIONS DEL PANELL") de un panel concreto, localizado por
 * el texto EXACTO de su <h2>, y no vuelve hasta confirmar que el dialogo del menu
 * esta realmente abierto (".p-dialog" visible) -- asi ningun punto de llamada
 * tiene que acordarse de esperarlo por su cuenta antes de clicar una opcion.
 * Usa `.evaluate(el => el.click())` en vez de un click normal de Playwright: el
 * dialogo de este menu puede renderizarse parcial o totalmente fuera del viewport
 * para paneles cerca del borde izquierdo del dashboard (boundingBox().x negativo,
 * confirmado), lo que hace fallar un click normal con "Element is outside of the
 * viewport" incluso con `force: true`.
 */
export async function openPanelMenu(page: Page, panelTitle: string) {
    const escaped = panelTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const panel = page.locator('gridster-item').filter({
        has: page.locator('h2', { hasText: new RegExp(`^${escaped}$`) }),
    });
    // Asentar: el panel (su grafico/consulta) puede seguir terminando de montarse
    // justo tras crearse/duplicarse/navegar -- abrir el menu demasiado pronto puede
    // generar opciones basadas en un estado del panel todavia no actualizado.
    await page.waitForTimeout(1_000);

    const dialogsBefore = await page.locator('.p-dialog').count();
    for (let attempt = 0; attempt < 4; attempt++) {
        await panel.locator('i.pi-ellipsis-v').first().evaluate((el: HTMLElement) => el.click());
        try {
            await expect(page.locator('.p-dialog')).toHaveCount(dialogsBefore + 1, { timeout: 4_000 });
            return;
        } catch {
            // no abrio: reintentamos
        }
    }
    await expect(page.locator('.p-dialog'), 'no se abre el menu del panel').toHaveCount(dialogsBefore + 1, { timeout: 5_000 });
}
