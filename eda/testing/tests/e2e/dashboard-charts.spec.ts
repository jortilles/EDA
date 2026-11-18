import { test, expect } from '../fixtures/e2e-base';
import type { Page } from '@playwright/test';
import { createSalesDuckDbDataSource } from '../../utils/duckdb-fixture';

/**
 * Cada tipo de gráfico exige una combinación de campos numéricos/categóricos/fecha
 * distinta para poder seleccionarse -- ver `getNotAllowedCharts()` en
 * services/utils/chart-utils.service.ts:634-791, que es la validación real que usa
 * la propia app para decidir qué tipos están disponibles según la consulta actual.
 * Esta tabla traduce esa validación a combinaciones reales de nuestra datasource de
 * pruebas (categóricos: producto, categoria · numéricos: importe, unidades · fecha).
 * Poner siempre el mismo "1 categórico + 1 numérico" para todo (como se hacía antes)
 * no refleja lo que cada tipo necesita de verdad -- algunos piden exactamente 1 sola
 * columna, otros exactamente 3, otros 2 numéricos sin categóricos, etc.
 *
 * `dateFormat`: solo "KPI Tendencia" exige que la columna de fecha tenga ya un
 * formato de agrupación (año/mes/semana/día) asignado -- si no, la propia app no la
 * ofrece como opción disponible. Cuando se indica, `addChartPanel` abre el diálogo
 * de configuración de esa columna y se lo asigna antes de continuar.
 *
 * Se excluyen del recorrido masivo:
 * - Los 2 tipos de MAPA (Mapa de coordenadas / Mapa de Capas): necesitan datos
 *   geográficos que esta datasource de pruebas no tiene y usan un dialogo de
 *   configuración completamente distinto (fuera del alcance de esta suite).
 * - "Tabla DataQuality": tiene un flujo distinto a todos los demas y dispara un
 *   hallazgo real (ver el test dedicado mas abajo) -- no encaja en el helper
 *   generico `addChartPanel`, que asume que siempre hay un boton "Confirmar" que
 *   pulsar al final.
 */
interface ChartTypeCase {
    label: string;
    fields: string[];
    dateFormat?: { field: string; formatLabel: string };
}

const CHART_TYPE_CASES: ChartTypeCase[] = [
    // 1 columna cualquiera
    { label: 'Tabla de Datos', fields: ['categoria', 'importe'] },
    { label: 'Histograma', fields: ['importe'] }, // exactamente 1 numérico, nada más
    { label: 'Texto Dinámico', fields: ['categoria'] }, // exactamente 1 texto, sin numéricos
    { label: 'KPI', fields: ['importe'] }, // exactamente 1 numérico
    { label: 'Velocímetro', fields: ['importe'] }, // 1-2 numéricos, sin categóricos

    // exactamente 2 columnas: 1 categórico + 1 numérico
    { label: 'Gráfico de Pastel', fields: ['categoria', 'importe'] },
    { label: 'Gráfico de Área Polar', fields: ['categoria', 'importe'] },
    { label: 'Gráfico de Barras', fields: ['categoria', 'importe'] },
    { label: 'Gráfico de Barras Horizontales', fields: ['categoria', 'importe'] },
    { label: 'Funnel', fields: ['categoria', 'importe'] },
    { label: 'Bubblechart', fields: ['categoria', 'importe'] }, // la validación real solo exige 1+1
    { label: 'KPI + Gráfico de Barras', fields: ['categoria', 'importe'] },

    // exactamente 2 columnas: 1 fecha + 1 numérico (mismo hueco que categórico+numérico)
    { label: 'KPI + Gráfico de Lineas', fields: ['fecha', 'importe'] },
    { label: 'KPI + Gráfico de Áreas', fields: ['fecha', 'importe'] },
    { label: 'Gráfico de Lineas', fields: ['fecha', 'importe'] },
    { label: 'Gráfico de Áreas', fields: ['fecha', 'importe'] },

    // 2 numéricos, sin categóricos
    { label: 'KPI Desviación', fields: ['importe', 'unidades'] },

    // 1 categórico + 2 numéricos
    { label: 'Mixto: Barras y lineas', fields: ['categoria', 'importe', 'unidades'] },
    { label: 'Radar', fields: ['categoria', 'importe', 'unidades'] },
    { label: 'ScatterPlot', fields: ['categoria', 'importe', 'unidades'] },

    // 2 categóricos + 1 numérico (jerarquía real, no el mínimo de 1+1 que también aceptarían)
    { label: 'Tabla Cruzada', fields: ['producto', 'categoria', 'importe'] },
    { label: 'Tabla Árbol', fields: ['producto', 'categoria', 'importe'] },
    { label: 'Gráfico Solar', fields: ['producto', 'categoria', 'importe'] },
    { label: 'Gráfico de Barras Apiladas', fields: ['producto', 'categoria', 'importe'] },
    { label: 'Gráfico de Barras Apiladas al 100%', fields: ['producto', 'categoria', 'importe'] },
    { label: 'Gráfico de Piramide', fields: ['producto', 'categoria', 'importe'] }, // exactamente 3 cols, 1 numerico
    { label: 'ParallelSets', fields: ['producto', 'categoria', 'importe'] },
    { label: 'TreeMap', fields: ['producto', 'categoria', 'importe'] },

    // 1 fecha + 1 categórico + 1 numérico (exactamente 3)
    { label: 'Barras en carrera', fields: ['fecha', 'categoria', 'importe'] },

    // exactamente 1 fecha (con formato de agrupación asignado) + 1 numérico, sin categóricos
    { label: 'KPI Tendencia', fields: ['fecha', 'importe'], dateFormat: { field: 'fecha', formatLabel: 'MES' } },
];

/** Abre el menu lateral del dashboard (icono "..."), reintentando el click si el
 * overlay de PrimeNG no llega a abrirse a la primera (se ha observado que a veces
 * el primer click no dispara showSidebar() de forma fiable justo tras cargar la
 * pagina). */
async function openDashboardSidebar(page: Page) {
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
async function clickSaveInSidebar(page: Page) {
    await page.locator('.sidebarLabels', { hasText: 'Guardar' }).filter({ hasNotText: 'como' }).first().click();
}

/**
 * Configura el formato de agrupación (Año/Mes/Semana/Dia...) de una columna de
 * fecha ya añadida a la consulta -- necesario para "KPI Tendencia", que solo
 * aparece como opción disponible si la fecha ya tiene un formato asignado (ver
 * getNotAllowedCharts() en chart-utils.service.ts). Abre el dialogo de esa
 * columna (click en su "chip" .select-box), elige el formato en el desplegable de
 * la sección "Formato" y confirma, volviendo al editor de consulta principal.
 */
async function configureDateFormat(page: Page, dialog: ReturnType<Page['locator']>, field: string, formatLabel: string) {
    // "page.locator('.p-dialog').last()" es dinamico: en cuanto el dialogo de columna
    // se cierra, ".last()" pasaria a apuntar al editor de consulta (que sigue abierto),
    // asi que hay que comparar el NUMERO de dialogos abiertos, no reutilizar esa misma
    // referencia esperando que "desaparezca".
    const dialogsBefore = await page.locator('.p-dialog').count();
    await dialog.locator('.select-box', { hasText: field }).first().click();
    const columnDialog = page.locator('.p-dialog').last();
    await expect(columnDialog).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.p-dialog')).toHaveCount(dialogsBefore + 1, { timeout: 10_000 });

    const formatSection = columnDialog.locator('.section-card', { hasText: 'Formato' });
    await formatSection.locator('p-dropdown').click();
    await page.getByRole('option', { name: formatLabel, exact: true }).click();

    await columnDialog.locator('button.confirm-button').click();
    await expect(page.locator('.p-dialog'), 'el dialogo de configuracion de columna no se cierra').toHaveCount(dialogsBefore, { timeout: 10_000 });
}

/**
 * Crea un panel/gráfico REAL dentro del dashboard actualmente abierto, con la misma
 * secuencia que seguiria una persona: "Nuevo panel" (sidebar) -> icono "..." del
 * panel -> "Editar consulta" -> elegir tabla y campos -> Ejecutar -> pestaña
 * "Vista previa" -> elegir tipo de gráfico -> Confirmar. No guarda el dashboard
 * (eso se hace una sola vez al final, como en la app real).
 */
async function addChartPanel(page: Page, { label: chartLabel, fields, dateFormat }: ChartTypeCase) {
    await openDashboardSidebar(page);
    await page.locator('.sidebarLabels', { hasText: 'Nuevo panel' }).click();

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

    await dialog.locator('button.execute-button').click();
    await expect(dialog.locator('button.execute-button'), `[${chartLabel}] el boton Ejecutar no se reactiva tras la consulta`).toBeEnabled({ timeout: 20_000 });

    await dialog.getByText('Vista previa').click();
    await dialog.locator('#chartSelector').first().click();
    await page.getByRole('option', { name: chartLabel, exact: true }).click();

    const confirmBtn = dialog.locator('button.confirm-button');
    await expect(confirmBtn, `[${chartLabel}] el boton Confirmar queda deshabilitado`).toBeEnabled({ timeout: 20_000 });
    await confirmBtn.click();
    await expect(dialog, `[${chartLabel}] el dialogo no se cierra tras Confirmar`).toHaveCount(0, { timeout: 15_000 });
}

test.describe.configure({ mode: 'serial' });

test.describe('Paneles y gráficos dentro de un dashboard (creación real vía UI)', () => {
    let dsId: string;
    let dashboardId: string;
    let panelCount = 0;

    test('preparacion: datasource y dashboard vacio para los paneles', async ({ api, uniqueName, track }) => {
        const dsRes = await createSalesDuckDbDataSource(api, uniqueName('chart-ds'), uniqueName('chartfolder').toLowerCase());
        expect(dsRes.status(), await dsRes.text()).toBe(201);
        dsId = (await dsRes.json()).data_source_id;
        track('datasource', dsId);

        const dashRes = await api.post('/dashboard', {
            config: { title: uniqueName('chart-dashboard'), visible: 'private', panel: [], ds: { _id: dsId }, styles: {}, tag: [] },
        });
        expect(dashRes.status(), await dashRes.text()).toBe(201);
        dashboardId = (await dashRes.json()).dashboard._id;
        track('dashboard', dashboardId);
    });

    /**
     * Los paneles solo existen en memoria hasta que se pulsa "Guardar" (ver
     * dashboard.page.ts:saveDashboard() -> PUT /dashboard/:id con TODO el array de
     * paneles de una vez), asi que crear todos los tipos de golpe tiene que ocurrir
     * en una unica sesion de pagina continua: si se navega de nuevo (como hace cada
     * test() de Playwright, con pagina nueva) antes de guardar, los paneles añadidos
     * hasta ese momento se pierden. Por eso esto es un solo test, no uno por tipo.
     */
    test('crear un panel de CADA tipo de gráfico soportado (todos menos los 2 de mapa) y guardar', async ({ page }) => {
        test.setTimeout(10 * 60_000);
        await page.goto(`/#/dashboard/${dashboardId}`);
        await expect(page.locator('#myDashboard')).toBeVisible({ timeout: 15_000 });

        for (const chartCase of CHART_TYPE_CASES) {
            await addChartPanel(page, chartCase);
            panelCount++;
            await expect(page.locator('gridster-item'), `tras añadir "${chartCase.label}"`).toHaveCount(panelCount, { timeout: 10_000 });
            await expect(page.locator('.swal2-popup, .p-toast-message-error'), `error visible tras añadir "${chartCase.label}"`).toHaveCount(0);
        }

        console.log(`[dashboard-charts] ${panelCount} paneles creados (todos los tipos soportados menos los 2 de mapa).`);

        await openDashboardSidebar(page);
        await clickSaveInSidebar(page);
        await expect(page.locator('.swal2-popup, .p-toast-message-success')).toBeVisible({ timeout: 20_000 });
    });

    test('recargar la pagina conserva todos los paneles guardados', async ({ page }) => {
        await page.goto(`/#/dashboard/${dashboardId}`);
        await expect(page.locator('gridster-item')).toHaveCount(panelCount, { timeout: 20_000 });
    });

    test('editar un panel existente: cambiar su tipo de gráfico', async ({ page }) => {
        await page.goto(`/#/dashboard/${dashboardId}`);
        await expect(page.locator('gridster-item')).toHaveCount(panelCount, { timeout: 15_000 });

        const firstPanel = page.locator('gridster-item').first();
        await firstPanel.hover();
        await firstPanel.locator('.pi-ellipsis-v, [class*="ellipsis"]').first().click();
        await page.getByText('Cambiar tipo de gráfico', { exact: true }).click();

        const gallery = page.locator('.chart-type-selector-grid');
        await expect(gallery).toBeVisible({ timeout: 10_000 });
        await gallery.locator('.chart-type-selector-item', { hasText: 'Gráfico de Barras Horizontales' }).click();

        // El cambio de tipo se aplica en memoria; queda constancia guardando de nuevo.
        await openDashboardSidebar(page);
        await clickSaveInSidebar(page);
        await expect(page.locator('.swal2-popup, .p-toast-message-success')).toBeVisible({ timeout: 20_000 });
    });

    test('borrar un panel existente', async ({ page }) => {
        await page.goto(`/#/dashboard/${dashboardId}`);
        await expect(page.locator('gridster-item')).toHaveCount(panelCount, { timeout: 15_000 });

        const lastPanel = page.locator('gridster-item').last();
        await lastPanel.hover();
        await lastPanel.locator('.pi-ellipsis-v, [class*="ellipsis"]').first().click();
        await page.getByText('Eliminar panel', { exact: true }).click();

        panelCount--;
        await expect(page.locator('gridster-item')).toHaveCount(panelCount, { timeout: 10_000 });

        await openDashboardSidebar(page);
        await clickSaveInSidebar(page);
        await expect(page.locator('.swal2-popup, .p-toast-message-success')).toBeVisible({ timeout: 20_000 });

        await page.reload();
        await expect(page.locator('gridster-item')).toHaveCount(panelCount, { timeout: 20_000 });
    });

    /**
     * HALLAZGO: a diferencia de TODOS los demas tipos de gráfico, elegir "Tabla
     * DataQuality" en el desplegable cierra el editor de consulta AL INSTANTE, antes
     * incluso de que el usuario responda al Swal de confirmacion que la propia app
     * muestra ("¿Estás seguro...?"). En eda-blank-panel.component.ts (changeChartTypeCheck,
     * ~L911-940), `this.closeEditarConsulta()` se llama en la misma linea sincrona en la
     * que se abre `Swal.fire(...).then(...)`, sin esperar la respuesta ni comprobar si el
     * usuario confirma o cancela. Efecto real: si el usuario pulsa "Cancelar" en el Swal,
     * el editor se cierra igualmente, perdiendo la consulta que estuviera configurando sin
     * ningun motivo (para el resto de tipos, cancelar/no confirmar no cierra nada).
     */
    test('[hallazgo] elegir "Tabla DataQuality" cierra el editor antes de confirmar', async ({ page }) => {
        await page.goto(`/#/dashboard/${dashboardId}`);
        await expect(page.locator('gridster-item')).toHaveCount(panelCount, { timeout: 15_000 });

        await openDashboardSidebar(page);
        await page.locator('.sidebarLabels', { hasText: 'Nuevo panel' }).click();

        const editIcon = page.locator('.edit-blink').last();
        await expect(editIcon).toBeVisible({ timeout: 10_000 });
        await editIcon.evaluate((el: HTMLElement) => el.click());
        await page.getByText('Editar consulta', { exact: true }).evaluate((el: HTMLElement) => el.click());

        const dialog = page.locator('.p-dialog').last();
        await expect(dialog).toBeVisible({ timeout: 10_000 });
        await dialog.locator('.entity-item').first().click();
        await dialog.locator('.attr-item', { hasText: 'categoria' }).first().click();
        await dialog.locator('.attr-item', { hasText: 'importe' }).first().click();
        await dialog.locator('button.execute-button').click();
        await expect(dialog.locator('button.execute-button')).toBeEnabled({ timeout: 20_000 });

        await dialog.getByText('Vista previa').click();
        await dialog.locator('#chartSelector').first().click();
        await page.getByRole('option', { name: 'Tabla DataQuality', exact: true }).click();

        // Si esto deja de fallar (el dialogo sigue abierto aqui), el bug se ha corregido:
        // actualiza este test para reflejar el comportamiento correcto.
        const confirmSwal = page.locator('.swal2-popup', { hasText: 'Continuar' });
        await expect(confirmSwal, 'deberia aparecer la confirmacion de DataQuality').toBeVisible({ timeout: 10_000 });
        await expect(dialog, 'el editor de consulta ya deberia estar cerrado (hallazgo)').toHaveCount(0, { timeout: 5_000 });

        // Cerramos con "Cancelar" -- justamente el caso que peor se comporta (el editor
        // se pierde de todas formas) -- y limpiamos el panel vacio que ha quedado.
        await page.locator('.swal2-cancel').click();

        const newPanel = page.locator('gridster-item').last();
        await newPanel.hover();
        await newPanel.locator('.pi-ellipsis-v, [class*="ellipsis"]').first().click();
        await page.getByText('Eliminar panel', { exact: true }).click();
    });
});
