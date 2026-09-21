import { test, expect, Page } from '../fixtures/base';
import { createSalesDuckDbDataSource } from '../../utils/duckdb-fixture';

/**
 * Todos los tipos de gráfico que soporta el editor de paneles (services/utils/
 * chart-utils.service.ts:chartTypes), agrupados por los campos que necesitan de
 * nuestra datasource de pruebas (id, producto, categoria, importe, unidades, fecha).
 * Se excluyen los 2 tipos de MAPA (Mapa de coordenadas / Mapa de Capas): necesitan
 * datos geográficos que esta datasource de pruebas no tiene y usan un dialogo de
 * configuración completamente distinto (fuera del alcance de esta suite).
 */
const CHART_TYPES_DIMENSION_MEASURE = [
    'Tabla de Datos', 'Tabla Cruzada', 'Tabla Árbol', 'Tabla DataQuality',
    'Gráfico de Pastel', 'Gráfico de Área Polar', 'Gráfico Solar',
    'Gráfico de Barras', 'Histograma', 'Gráfico de Barras Apiladas', 'Gráfico de Barras Apiladas al 100%',
    'Gráfico de Barras Horizontales', 'Gráfico de Piramide', 'Mixto: Barras y lineas',
    'ParallelSets', 'TreeMap', 'Funnel', 'Radar',
];
const CHART_TYPES_MEASURE_ONLY = ['KPI', 'KPI Tendencia', 'KPI Desviación', 'Texto Dinámico', 'Velocímetro'];
const CHART_TYPES_TIME_SERIES = ['KPI + Gráfico de Barras', 'KPI + Gráfico de Lineas', 'KPI + Gráfico de Áreas', 'Gráfico de Lineas', 'Gráfico de Áreas', 'Barras en carrera'];
const CHART_TYPES_NUMERIC_PAIR = ['ScatterPlot', 'Bubblechart'];

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
 * Crea un panel/gráfico REAL dentro del dashboard actualmente abierto, con la misma
 * secuencia que seguiria una persona: "Nuevo panel" (sidebar) -> icono "..." del
 * panel -> "Editar consulta" -> elegir tabla y campos -> Ejecutar -> pestaña
 * "Vista previa" -> elegir tipo de gráfico -> Confirmar. No guarda el dashboard
 * (eso se hace una sola vez al final, como en la app real).
 */
async function addChartPanel(page: Page, chartLabel: string, fields: string[]) {
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

    await dialog.locator('button.execute-button').click();
    await expect(dialog.locator('button.execute-button'), `[${chartLabel}] el boton Ejecutar no se reactiva tras la consulta`).toBeEnabled({ timeout: 20_000 });

    await dialog.getByText('Vista previa').click();
    await dialog.locator('#chartSelector').first().click();
    await page.getByRole('option', { name: chartLabel, exact: true }).click();

    // Algunos tipos "pesados" (p.ej. Tabla DataQuality, que la propia app avisa que
    // "puede tomar un poco de tiempo") piden confirmacion antes de calcular la vista
    // previa, y el analisis posterior puede tardar bastante bajo carga (toda la suite
    // corriendo en paralelo compite por CPU), asi que aqui se dan margenes generosos.
    const confirmSwal = page.locator('.swal2-popup', { hasText: 'Continuar' });
    const sawSwal = await confirmSwal.waitFor({ state: 'visible', timeout: 8_000 }).then(() => true).catch(() => false);
    if (sawSwal) {
        await page.locator('.swal2-confirm').click();
    }

    const confirmBtn = dialog.locator('button.confirm-button');
    await expect(confirmBtn, `[${chartLabel}] el boton Confirmar queda deshabilitado`).toBeEnabled({ timeout: 30_000 });
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

        const allTypes: Array<[string, string[]]> = [
            ...CHART_TYPES_DIMENSION_MEASURE.map((l) => [l, ['categoria', 'importe']] as [string, string[]]),
            ...CHART_TYPES_MEASURE_ONLY.map((l) => [l, ['importe']] as [string, string[]]),
            ...CHART_TYPES_TIME_SERIES.map((l) => [l, ['fecha', 'categoria', 'importe']] as [string, string[]]),
            ...CHART_TYPES_NUMERIC_PAIR.map((l) => [l, ['importe', 'unidades']] as [string, string[]]),
        ];

        for (const [label, fields] of allTypes) {
            await addChartPanel(page, label, fields);
            panelCount++;
            await expect(page.locator('gridster-item'), `tras añadir "${label}"`).toHaveCount(panelCount, { timeout: 10_000 });
            await expect(page.locator('.swal2-popup, .p-toast-message-error'), `error visible tras añadir "${label}"`).toHaveCount(0);
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
});
