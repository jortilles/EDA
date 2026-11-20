import { test, expect } from '../fixtures/e2e-base';
import { createSalesDuckDbDataSource } from '../../utils/duckdb-fixture';
import { esOrCa } from '../../utils/locale-catalog';

test.describe.configure({ mode: 'serial' });

test.describe('Dashboards: crear, ver y borrar desde la UI', () => {
    let dsName: string;

    test('preparacion: crear via API la datasource que se usara desde la UI', async ({ api, uniqueName, track }) => {
        dsName = uniqueName('ui-ds');
        const res = await createSalesDuckDbDataSource(api, dsName, uniqueName('uifolder').toLowerCase());
        expect(res.status(), await res.text()).toBe(201);
        const body = await res.json();
        track('datasource', body.data_source_id);
    });

    test('crear un dashboard desde el dialogo "Crear nuevo informe", verlo en la lista y borrarlo', async ({ page, uniqueName }) => {
        const title = uniqueName('ui-dashboard');

        await page.goto('/#/home');
        // Tolera es ("Crear nuevo informe") y ca ("Crear nou informe") -- ver nota
        // en admin-groups.spec.ts.
        await page.getByText(/Crear n(uevo|ou) informe/).click();

        await page.locator('input[formcontrolname="name"]').fill(title);
        // El id "float-ds" lo comparten el <p-dropdown> (wrapper de Angular) y el <div>
        // interno que PrimeNG genera para el trigger clicable; hay que apuntar a este ultimo.
        await page.locator('div.p-dropdown#float-ds').click();
        // Espera a que el panel de opciones de PrimeNG este realmente abierto antes de
        // clicar una opcion -- el trigger abre con una animacion/render asincrono, y
        // clicar sin esto es una causa clasica de flakiness en dropdowns PrimeNG.
        await page.locator('.p-dropdown-panel').waitFor({ state: 'visible' });
        await page.getByRole('option', { name: dsName }).click();

        await page.locator('.confirm-button').click();
        await page.waitForURL(/#\/dashboard\//, { timeout: 20_000 });
        await expect(page.locator('#myDashboard')).toBeVisible({ timeout: 15_000 });

        await page.goto('/#/home');
        const card = page.locator('.report-card', { hasText: title });
        await expect(card).toBeVisible({ timeout: 15_000 });

        await card.getByTitle(esOrCa('Eliminar informe')).click();
        await page.locator('.swal2-confirm').click();

        await expect(page.locator('.report-card', { hasText: title })).toHaveCount(0, { timeout: 15_000 });
    });

    test('crear un dashboard sin rellenar el nombre mantiene el boton confirmar deshabilitado', async ({ page }) => {
        await page.goto('/#/home');
        // Tolera es ("Crear nuevo informe") y ca ("Crear nou informe") -- ver nota
        // en admin-groups.spec.ts.
        await page.getByText(/Crear n(uevo|ou) informe/).click();
        await expect(page.locator('.confirm-button')).toBeDisabled();
    });

    /** Crea un dashboard de prueba desde el dialogo "Crear nuevo informe" y lo deja
     * en /#/home, con su tarjeta (`.report-card`) visible -- mismo flujo que usa el
     * primer test de este archivo, reutilizado por las pruebas de abajo (renombrar y
     * duplicar), que no reusan ese dashboard porque lo borra al terminar. */
    async function createDashboardFromHome(page: any, title: string, dsName: string) {
        await page.goto('/#/home');
        await page.getByText(/Crear n(uevo|ou) informe/).click();
        await page.locator('input[formcontrolname="name"]').fill(title);
        await page.locator('div.p-dropdown#float-ds').click();
        await page.locator('.p-dropdown-panel').waitFor({ state: 'visible' });
        await page.getByRole('option', { name: dsName }).click();
        await page.locator('.confirm-button').click();
        await page.waitForURL(/#\/dashboard\//, { timeout: 20_000 });
        await expect(page.locator('#myDashboard')).toBeVisible({ timeout: 15_000 });

        await page.goto('/#/home');
        const card = page.locator('.report-card', { hasText: title });
        await expect(card, `no aparece la tarjeta de "${title}" en Home`).toBeVisible({ timeout: 15_000 });
        return card;
    }

    test('editar el nombre de un informe desde Home (lapiz de la tarjeta) lo renombra de verdad', async ({ page, uniqueName }) => {
        const title = uniqueName('ui-rename-src');
        const newTitle = uniqueName('ui-rename-dst');
        await createDashboardFromHome(page, title, dsName);

        const card = page.locator('.report-card', { hasText: title });
        await card.getByTitle(esOrCa('Editar nombre')).click();
        // HALLAZGO: al activar la edicion, Angular sustituye el <h3> del titulo por un
        // <input> -- el VALOR de un input no cuenta como textContent, asi que
        // "card.locator(...)" (que re-evalua `hasText: title` en CADA uso, no una foto
        // fija) deja de encontrar a su propia tarjeta en cuanto el texto desaparece del
        // DOM. Solo una tarjeta puede estar en edicion a la vez (isEditing/
        // editingReportId en home.page.ts), asi que el input se localiza a nivel de
        // pagina, sin volver a filtrar por el titulo.
        const input = page.locator('input.edit-title-input');
        await expect(input, 'no aparece el input de edicion de nombre').toBeVisible({ timeout: 5_000 });
        await input.fill(newTitle);
        await input.press('Enter');

        await expect(page.locator('.p-toast-message-success'), 'no aparece el toast de renombrado').toBeVisible({ timeout: 10_000 });
        await expect(page.locator('.report-card', { hasText: newTitle }), 'la tarjeta no muestra el nuevo nombre').toBeVisible({ timeout: 10_000 });

        // No solo en memoria: recargar y comprobar que el nuevo nombre persiste de verdad.
        await page.reload();
        await expect(page.locator('.report-card', { hasText: newTitle }), 'el nuevo nombre no sobrevive a recargar la pagina').toBeVisible({ timeout: 15_000 });

        const renamedCard = page.locator('.report-card', { hasText: newTitle });
        await renamedCard.getByTitle(esOrCa('Eliminar informe')).click();
        await page.locator('.swal2-confirm').click();
        await expect(renamedCard).toHaveCount(0, { timeout: 15_000 });
    });

    test('duplicar un informe desde Home (icono de la tarjeta) crea una copia independiente', async ({ page, uniqueName, track }) => {
        const title = uniqueName('ui-clone-src');
        await createDashboardFromHome(page, title, dsName);

        const card = page.locator('.report-card', { hasText: title });
        const clonePromise = page.waitForResponse(
            (res) => /\/dashboard\/[a-f0-9]+\/clone$/.test(new URL(res.url()).pathname) && res.request().method() === 'POST'
        );
        await card.getByTitle(esOrCa('Duplicar informe')).click();
        const cloneBody = await (await clonePromise).json();
        track('dashboard', cloneBody.dashboard._id);

        await expect(page.locator('.p-toast-message-success'), 'no aparece el toast de clonado').toBeVisible({ timeout: 10_000 });
        // dashboard.controller.ts:clone() añade siempre " copy" al titulo original.
        const clonedCard = page.locator('.report-card', { hasText: `${title} copy` });
        await expect(clonedCard, 'no aparece la tarjeta del informe clonado').toBeVisible({ timeout: 10_000 });

        // El clon es independiente: borrarlo no debe afectar al original.
        await clonedCard.getByTitle(esOrCa('Eliminar informe')).click();
        await page.locator('.swal2-confirm').click();
        await expect(clonedCard).toHaveCount(0, { timeout: 15_000 });
        await expect(card, 'borrar el clon no deberia hacer desaparecer al informe original').toBeVisible();

        await card.getByTitle(esOrCa('Eliminar informe')).click();
        await page.locator('.swal2-confirm').click();
        await expect(card).toHaveCount(0, { timeout: 15_000 });
    });
});
