import { expect, type Page } from '@playwright/test';
import { esOrCa, esOrCaExact } from './locale-catalog';
import { openDashboardSidebar, clickSaveInSidebar } from './dashboard-ui-helpers';
import { createSalesDuckDbDataSource } from './duckdb-fixture';
import type { ApiClient } from './api-client';

export interface ChartTypeCase {
    label: string;
    fields: string[];
    dateFormat?: { field: string; formatLabel: string };
    showTop?: number;
    /** Titulo del panel, si debe ser distinto de `label` (p.ej. las 3 variantes de
     * "Gráfico de Barras" que demuestran cada pestaña de color en dashboard-charts.spec.ts). */
    title?: string;
}

/**
 * Configura el formato de agrupación (Año/Mes/Semana/Dia...) de una columna de
 * fecha ya añadida a la consulta -- necesario para "KPI Tendencia", que solo
 * aparece como opción disponible si la fecha ya tiene un formato asignado (ver
 * getNotAllowedCharts() en chart-utils.service.ts). Abre el dialogo de esa
 * columna (click en su "chip" .select-box), elige el formato en el desplegable de
 * la sección "Formato" y confirma, volviendo al editor de consulta principal.
 */
export async function configureDateFormat(page: Page, dialog: ReturnType<Page['locator']>, field: string, formatLabel: string) {
    // "page.locator('.p-dialog').last()" es dinamico: en cuanto el dialogo de columna
    // se cierra, ".last()" pasaria a apuntar al editor de consulta (que sigue abierto),
    // asi que hay que comparar el NUMERO de dialogos abiertos, no reutilizar esa misma
    // referencia esperando que "desaparezca".
    const dialogsBefore = await page.locator('.p-dialog').count();
    await dialog.locator('.select-box', { hasText: field }).first().click();
    const columnDialog = page.locator('.p-dialog').last();
    await expect(columnDialog).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.p-dialog')).toHaveCount(dialogsBefore + 1, { timeout: 10_000 });

    const formatSection = columnDialog.locator('.section-card', { hasText: esOrCa('Formato') });
    await formatSection.locator('p-dropdown').click();
    await page.getByRole('option', { name: esOrCaExact(formatLabel) }).click();

    await columnDialog.locator('button.confirm-button').click();
    await expect(page.locator('.p-dialog'), 'el dialogo de configuracion de columna no se cierra').toHaveCount(dialogsBefore, { timeout: 10_000 });
}

/**
 * El accessible name real de cada <li role="option"> del selector de tipo de
 * grafico es "<icono-ligature>  <etiqueta>" (el nombre del icono de Material
 * Icons, pegado al texto) -- quita ese prefijo para poder comparar solo la
 * etiqueta visible contra el catalogo es/ca.
 */
function stripIconLigaturePrefix(text: string): string {
    return text.trim().replace(/^[a-z_]+\s+/, '').trim();
}

/**
 * Selecciona un tipo de grafico en el #chartSelector y VERIFICA que la seleccion
 * se aplico de verdad (leyendo el valor que queda mostrado), reintentando si no.
 *
 * HALLAZGO: justo despues de cambiar a la pestaña "Vista previa", seleccionar un
 * tipo de grafico puede no aplicarse -- sin ningun error ni warning visible, el
 * desplegable se queda en su valor anterior (tipicamente "Tabla de Datos", el
 * default). Reproducido de forma aislada: el mismo click, sobre la misma opcion,
 * falla en el intento 1 y funciona en el intento 2 justo despues. Es una carrera
 * real de la app (changeChartTypeCheck/changeChartType en eda-blank-panel.component.ts
 * comprueban `this.chartTypes` de forma sincrona dentro del handler (onChange) del
 * p-dropdown; justo tras abrir "Vista previa" esa lista parece no estar siempre
 * asentada todavia), no una cuestion de que campos se hayan elegido -- con los
 * mismos campos, el reintento siempre acaba aplicando el tipo correcto.
 */
export async function selectChartType(page: Page, dialog: ReturnType<Page['locator']>, chartLabel: string) {
    const selector = dialog.locator('#chartSelector').first();
    const target = esOrCaExact(chartLabel);
    for (let attempt = 1; attempt <= 10; attempt++) {
        try {
            await selector.click();
            await page.getByRole('option', { name: target }).first().click({ timeout: 5_000 });
            // Deja un respiro para que Angular asiente el cambio antes de leer el
            // valor mostrado -- leerlo en el mismo tick del click es parte de la
            // carrera que este reintento existe para sortear.
            await page.waitForTimeout(400);
            const selectedText = stripIconLigaturePrefix((await selector.textContent()) ?? '');
            if (target.test(selectedText)) return;
        } catch {
            // El overlay del desplegable a veces intercepta el click o el <li> se
            // desconecta del DOM a mitad de la interaccion (mismo tipo de fragilidad
            // que el resto de esta carrera) -- se cuenta como intento fallido, no
            // como error fatal, y se reintenta desde cero (reabriendo el selector).
            await page.waitForTimeout(400);
        }
    }
    throw new Error(`[${chartLabel}] la seleccion del tipo de grafico no se aplico tras varios intentos (ver carrera documentada en selectChartType)`);
}

/** Pone como titulo del panel su tipo de grafico, para poder identificar cada uno
 * a simple vista en la lista/video sin tener que abrirlo. */
export async function setPanelTitle(dialog: ReturnType<Page['locator']>, title: string) {
    await dialog.locator('button:has(eda-icon[name="pencil"])').first().click();
    const input = dialog.getByPlaceholder(esOrCa('Título del panel'));
    await input.fill(title);
    await input.press('Enter');
}

/**
 * Crea un panel/gráfico REAL dentro del dashboard actualmente abierto, con la misma
 * secuencia que seguiria una persona: "Nuevo panel" (sidebar) -> icono "..." del
 * panel -> "Editar consulta" -> elegir tabla y campos -> Ejecutar -> pestaña
 * "Vista previa" -> elegir tipo de gráfico -> Confirmar. No guarda el dashboard
 * (eso se hace una sola vez al final, como en la app real).
 */
export async function addChartPanel(page: Page, { label: chartLabel, fields, dateFormat, showTop, title }: ChartTypeCase) {
    await openDashboardSidebar(page);
    await page.locator('.sidebarLabels', { hasText: esOrCa('Nuevo Panel') }).click();

    const editIcon = page.locator('.edit-blink').last();
    await expect(editIcon, `[${chartLabel}] no aparece el icono para editar el panel nuevo`).toBeVisible({ timeout: 10_000 });
    // "edit-blink" tiene una animacion CSS de parpadeo continua (opacidad/escala): el
    // chequeo de accionabilidad normal de Playwright (y el click forzado, que sigue
    // usando la posicion en pantalla) nunca la ve "estable". Un click nativo via DOM
    // no depende de la posicion visual ni de la animacion.
    await editIcon.evaluate((el: HTMLElement) => el.click());
    await page.getByText('Editar consulta', { exact: true }).evaluate((el: HTMLElement) => el.click());

    const dialog = page.locator('.p-dialog').last();
    await expect(dialog, `[${chartLabel}] no se abre el editor de consulta`).toBeVisible({ timeout: 10_000 });
    await expect(dialog.locator('.entity-item').first()).toBeVisible({ timeout: 10_000 });

    await dialog.locator('.entity-item').first().click();
    for (const field of fields) {
        await dialog.locator('.attr-item', { hasText: field }).first().click();
    }

    if (dateFormat) {
        await configureDateFormat(page, dialog, dateFormat.field, dateFormat.formatLabel);
    }

    if (showTop) {
        // fill() ya dispara el evento "input" que alimenta onTopChange().
        const topInput = dialog.locator('h3', { hasText: esOrCa('Mostrar Top') }).locator('xpath=following-sibling::input[1]');
        await topInput.fill(String(showTop));
    }

    await setPanelTitle(dialog, title ?? chartLabel);

    await dialog.locator('button.execute-button').click();
    await expect(dialog.locator('button.execute-button'), `[${chartLabel}] el boton Ejecutar no se reactiva tras la consulta`).toBeEnabled({ timeout: 20_000 });

    await dialog.getByText(esOrCa('Vista previa')).click();
    // Pequeño respiro antes de tocar el selector -- ver el comentario de
    // selectChartType sobre la carrera justo tras cambiar a esta pestaña.
    await page.waitForTimeout(500);
    await selectChartType(page, dialog, chartLabel);

    const confirmBtn = dialog.locator('button.confirm-button');
    await expect(confirmBtn, `[${chartLabel}] el boton Confirmar queda deshabilitado`).toBeEnabled({ timeout: 20_000 });
    await confirmBtn.click();
    await expect(dialog, `[${chartLabel}] el dialogo no se cierra tras Confirmar`).toHaveCount(0, { timeout: 15_000 });
}

/**
 * Setup compartido por las suites de tests/e2e/context-menu/ y
 * tests/e2e/dashboard-sidebar/: crea una datasource + dashboard DESECHABLES
 * (prefijo de test + track(), los borra el teardown normal -- a diferencia del
 * dashboard persistente "-- ALL CHARTS TESTING --" de dashboard-charts.spec.ts),
 * navega a el, crea UN panel de "Gráfico de Barras" (categoria + importe) con el
 * titulo indicado y lo guarda. Pensado para los tests del menu "..." de un panel o
 * del menu del dashboard, que solo necesitan UN panel real sobre el que actuar, no
 * recorrer todos los tipos de grafico.
 */
export async function setupSingleBarPanelDashboard(
    api: ApiClient,
    page: Page,
    uniqueName: (label: string) => string,
    track: (type: 'dashboard' | 'datasource', id: string | undefined | null) => void,
    panelTitle: string,
    dsLabel: string
): Promise<string> {
    const dsName = uniqueName(`${dsLabel}-ds`);
    const dsRes = await createSalesDuckDbDataSource(api, dsName, uniqueName(`${dsLabel}folder`).toLowerCase());
    expect(dsRes.status(), await dsRes.text()).toBe(201);
    const dsId = (await dsRes.json()).data_source_id;
    track('datasource', dsId);

    const dashRes = await api.post('/dashboard', {
        config: { title: uniqueName(`${dsLabel}-dash`), visible: 'private', panel: [], ds: { _id: dsId }, styles: {}, tag: [] },
    });
    expect(dashRes.status(), await dashRes.text()).toBe(201);
    const dashboardId = (await dashRes.json()).dashboard._id;
    track('dashboard', dashboardId);

    await page.goto(`/#/dashboard/${dashboardId}`);
    await expect(page.locator('#myDashboard')).toBeVisible({ timeout: 15_000 });

    await addChartPanel(page, { label: 'Gráfico de Barras', fields: ['categoria', 'importe'], title: panelTitle });

    await openDashboardSidebar(page);
    await clickSaveInSidebar(page);
    await expect(page.locator('.swal2-popup, .p-toast-message-success')).toBeVisible({ timeout: 20_000 });

    return dashboardId;
}
