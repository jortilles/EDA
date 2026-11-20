import { test, expect } from '../fixtures/e2e-base';
import type { Page } from '@playwright/test';
import type { ApiClient } from '../../utils/api-client';
import { createSalesDuckDbDataSource } from '../../utils/duckdb-fixture';
import { esOrCa, esOrCaExact } from '../../utils/locale-catalog';
import { openDashboardSidebar, clickSaveInSidebar, openPanelMenu } from '../../utils/dashboard-ui-helpers';
import { type ChartTypeCase, addChartPanel } from '../../utils/panel-creation-helpers';

/**
 * Este dashboard (30 paneles, uno de cada tipo de grafico) se deja a proposito
 * SIN borrar al final de la suite, con nombre fijo en vez de uniqueName(): el
 * video de crearlo obliga a hacer scroll para ver cada grafico, mientras que
 * abrir este dashboard real en la app permite verlos todos tal cual quedan. Al
 * no llevar el prefijo de test (PWTEST_...) ni track(), el teardown (tanto el
 * borrado preciso por log como el barrido por prefijo) lo ignora por completo.
 * Para que no se acumule una copia nueva en cada ejecucion, se borra la version
 * anterior (si existe) justo antes de crear la nueva.
 */
const PERSISTENT_DASHBOARD_TITLE = '-- ALL CHARTS TESTING --';
const PERSISTENT_DS_NAME = 'all_charts_testing';
const PERSISTENT_DS_FOLDER = 'all_charts_testing';

async function deletePreviousPersistentDashboard(api: ApiClient) {
    const dashRes = await api.get('/dashboard');
    if (dashRes.ok()) {
        const body = await dashRes.json();
        const all = [...(body.private ?? []), ...(body.group ?? []), ...(body.open ?? []), ...(body.common ?? [])];
        const existing = all.find((d: { config?: { title?: string }; _id: string }) => d?.config?.title === PERSISTENT_DASHBOARD_TITLE);
        if (existing) await api.delete(`/dashboard/${existing._id}`);
    }
    // Se usa /datasource/names (proyeccion ligera: solo _id + model_name) en vez de
    // /datasource -- este ultimo trae el documento COMPLETO de cada datasource y en
    // esta BBDD de dev tarda 20-30s y acaba lanzando un error (ver hallazgo 2 del
    // README); /datasource/names es rapido y es todo lo que hace falta para
    // localizar por nombre.
    const dsRes = await api.get('/datasource/names');
    if (dsRes.ok()) {
        const body = await dsRes.json();
        const existing = (body.ds ?? []).find((d: { model_name?: string; _id: string }) => d?.model_name === PERSISTENT_DS_NAME);
        if (existing) await api.delete(`/datasource/${existing._id}`);
    }
}

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
 * `showTop`: limita la consulta a las N primeras filas ("Mostrar Top:", ligado a
 * `queryLimit`). Solo hace falta en "Texto Dinámico": con un unico campo categorico
 * (sin agregacion numerica que reduzca a una fila), la consulta agrupada devuelve una
 * fila por cada valor distinto (3 en esta datasource) y el widget, que solo puede
 * mostrar UN valor, queda ambiguo/en blanco sin este limite.
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
// ChartTypeCase, configureDateFormat(), selectChartType(), setPanelTitle() y
// addChartPanel() se han movido a utils/panel-creation-helpers.ts (reutilizado
// tambien por tests/e2e/context-menu/ y tests/e2e/dashboard-sidebar/).

const CHART_TYPE_CASES: ChartTypeCase[] = [
    // 1 columna cualquiera
    { label: 'Tabla de Datos', fields: ['categoria', 'importe'] },
    { label: 'Histograma', fields: ['importe'] }, // exactamente 1 numérico, nada más
    { label: 'Texto Dinámico', fields: ['categoria'], showTop: 1 }, // exactamente 1 texto, sin numéricos
    { label: 'KPI', fields: ['importe'] }, // exactamente 1 numérico
    { label: 'Velocímetro', fields: ['importe'] }, // 1-2 numéricos, sin categóricos

    // exactamente 2 columnas: 1 categórico + 1 numérico
    { label: 'Gráfico de Pastel', fields: ['categoria', 'importe'] },
    { label: 'Gráfico de Área Polar', fields: ['categoria', 'importe'] },
    // 3 variantes del mismo tipo (bar), una por cada pestaña de color que ofrece
    // (solo bar/horizontalBar tienen las 3 -- hasThresholdColors -- el resto de tipos
    // solo tiene la primera, "Colores", sin pestañas). Mismos campos para las 3.
    { label: 'Gráfico de Barras', fields: ['categoria', 'importe'], title: 'Gráfico de Barras (colores por categoría)' },
    { label: 'Gráfico de Barras', fields: ['categoria', 'importe'], title: 'Gráfico de Barras (colores únicos)' },
    { label: 'Gráfico de Barras', fields: ['categoria', 'importe'], title: 'Gráfico de Barras (colores por intervalo)' },
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

// openDashboardSidebar()/clickSaveInSidebar() se han movido a
// utils/dashboard-ui-helpers.ts (reutilizado tambien por tests/e2e/context-menu/ y
// tests/e2e/dashboard-sidebar/).

// openPanelMenu() se ha movido a utils/dashboard-ui-helpers.ts (reutilizado tambien
// por tests/e2e/context-menu/ y tests/e2e/dashboard-sidebar/).

/**
 * Abre "Editar opciones del gráfico" de un panel ya creado (solo disponible para los
 * tipos "axis"/"live" + knob, no para tablas/KPI/dynamicText/treetable) y aplica un
 * ajuste concreto. Solo actualiza el estado en memoria del panel -- el guardado final
 * del dashboard (al terminar el bucle principal) es lo que lo persiste de verdad.
 *
 * HALLAZGO: el mismo item de menu "Editar opciones del gráfico" decide internamente
 * (panel-menu-options.ts:editChart) a que dialogo abrir segun `panelComponent.graficos.
 * chartType` -- en un panel creado hace muy poco en la misma sesion (sin recargar
 * pagina) ese campo a veces no esta sincronizado todavia, y abre "Propiedades de la
 * tabla" en vez de "Propiedades del grafico" aunque el panel SI sea un grafico real.
 * Se detecta por el titulo del dialogo y se reintenta (cerrando con Escape) si abre el
 * equivocado -- sin esto, todo lo que haga `apply()` opera sobre el dialogo que no es,
 * sin fallar (ambos tienen su propio boton confirm-button), dejando el panel sin tocar
 * en silencio.
 */
async function tweakChartOptions(page: Page, panelTitle: string, apply: (dialog: ReturnType<Page['locator']>) => Promise<void>) {
    const chartDialogTitle = esOrCa('PROPIEDADES DEL gráfico');

    for (let attempt = 1; attempt <= 5; attempt++) {
        await openPanelMenu(page, panelTitle);
        await page.getByText(esOrCa('Editar opciones del gráfico'), { exact: true }).evaluate((el: HTMLElement) => el.click());

        const dialog = page.locator('.p-dialog').last();
        await expect(dialog, `[${panelTitle}] no se abre ningun dialogo de opciones`).toBeVisible({ timeout: 10_000 });

        if (!chartDialogTitle.test((await dialog.locator('.p-dialog-title').textContent()) ?? '')) {
            // Se abrio el dialogo equivocado (tabla/KPI/...): se cierra y se reintenta.
            // El boton de cancelar es mas fiable que Escape -- Escape a veces no llega a
            // cerrar el dialogo (closeOnEscape no esta garantizado en todos), dejando el
            // siguiente intento abrir un tercer menu distinto por encima del que quedo.
            const cancelBtn = dialog.locator('button.cancel-button');
            if (await cancelBtn.count() > 0) await cancelBtn.first().click();
            else await page.keyboard.press('Escape');
            await expect(dialog).toHaveCount(0, { timeout: 5_000 }).catch(() => {});
            await page.waitForTimeout(400);
            continue;
        }

        await apply(dialog);

        // Click normal, no .evaluate(): este dialogo tambien puede quedar parcial
        // fuera del area visible/con scroll segun cuantas opciones tenga activas el
        // tipo (mismo sintoma que el resto de hallazgos de posicionamiento de esta
        // suite) -- se evita depender de si Playwright consigue desplazarlo a la vista.
        await dialog.locator('button.confirm-button').evaluate((el: HTMLElement) => el.click());
        await expect(dialog, `[${panelTitle}] el dialogo de opciones no se cierra tras aplicar`).toHaveCount(0, { timeout: 10_000 });
        return;
    }
    throw new Error(`[${panelTitle}] "Editar opciones del gráfico" siguio abriendo el dialogo equivocado tras varios intentos`);
}

/**
 * Activa/rellena TODAS las opciones "seguras" del dialogo "Editar opciones del gráfico"
 * que esten presentes para el tipo actual (cada tipo solo muestra un subconjunto, via
 * `@if (features.xxx)` en chart-dialog.component.html -- esta funcion no necesita saber
 * cual, simplemente comprueba si el control existe antes de tocarlo). Cubre interruptores
 * boolean + los campos numericos que aparecen al activarlos.
 *
 * Deliberadamente NO toca:
 * - Tendencia / Comparativa / Mostrar Predicción: se bloquean entre si (activar una
 *   deshabilita las otras dos), asi que "tocarlas todas" no tiene un estado final
 *   coherente -- se dejan en su default.
 * - "Añadir imágenes": abre un selector de la libreria de medios, fuera de alcance.
 * - Toda la sección "Colores" (paleta, swatches por categoria, pestañas de
 *   intervalo/colores únicos, opacidad): es cosmetica/subjetiva, sin un valor
 *   "correcto" que verificar, y su UI (color pickers, tablas dinamicas) es bastante
 *   mas fragil que los interruptores simples de esta funcion.
 */
async function exerciseDisplayOptions(page: Page, dialog: ReturnType<Page['locator']>) {
    const toggleLabels = [
        'Animar Gráfico', 'Mostrar Leyenda', 'Ordenar Leyenda Alfabéticamente',
        'Mostrar Líneas Guía', 'Etiquetas ajustables', 'Mostrar Líneas de Puntos',
        'Serie principal', 'Redondear barras', 'Segundo Eje', 'Mostrar Etiquetas',
        'Mostrar Etiquetas en Porcentajes', 'Mostrar línea de tiempo', 'Color semafórico',
    ];
    for (const label of toggleLabels) {
        // OJO: el "has" tiene que construirse desde `page`, no desde `dialog` (que ya
        // es un locator con .last()) -- Playwright no puede re-anclar correctamente un
        // locator interno que ya viene de un .last()/.first(), y el filtro siempre
        // devuelve 0 coincidencias en silencio (sin error) si se hace asi. Comprobado
        // de forma aislada: identico filtro, solo cambiando dialog.getByText(...) por
        // page.getByText(...), pasa de 0 a 1 coincidencia.
        const row = dialog.locator('div.flex.items-center.justify-between').filter({
            has: page.getByText(esOrCa(label), { exact: true }),
        }).first();
        if (await row.count() === 0) continue;
        // Click normal, no .evaluate(): este toggle a veces queda fuera del area
        // visible/con scroll del dialogo (visto con un timeout real de Playwright,
        // mismo sintoma que el hallazgo del menu "..." fuera del viewport) -- forzar
        // el click evita el chequeo de visibilidad sin depender de cuanto haya que
        // desplazar el contenido del dialogo.
        await row.locator('label.relative.inline-flex').first().evaluate((el: HTMLElement) => el.click());
        await page.waitForTimeout(150);
    }

    // Tras activar "Serie principal" aparece un desplegable para elegir cual -- si esta
    // vacio (placeholder), se elige la primera serie disponible.
    const mainSeriesDropdown = dialog.locator('p-dropdown').filter({ has: page.getByText(esOrCa('-- Seleccione una serie --')) });
    if (await mainSeriesDropdown.count() > 0) {
        await mainSeriesDropdown.click();
        await page.getByRole('option').first().click();
        await page.waitForTimeout(150);
    }

    const numericFields: Array<{ selector: string; value: string }> = [
        { selector: '#categoryLabelMaxChars', value: '15' },
        { selector: 'input[type="number"][min="0"][max="95"]', value: '40' },        // innerRadiusPercent (doughnut)
        { selector: 'input[type="number"][min="250"][max="10000"]', value: '1500' }, // transitionMs (raceBar)
        { selector: '#numberOfColumns', value: '5' },                                // histograma
        { selector: 'input[type="number"][min="3"][max="20"]', value: '3' },         // topNCount (raceBar) -- unicas 3 categorias que hay en los datos de prueba
    ];
    for (const { selector, value } of numericFields) {
        const input = dialog.locator(selector).first();
        if (await input.count() === 0) continue;
        await input.fill(value);
    }

    // Limites (knob): placeholder="min"/"max", no selector unico -- rango 0-2000 (la
    // suma de "importe" en esta datasource ronda 1710, el default 0-100 dejaria la
    // aguja pegada al tope).
    const minInput = dialog.locator('input[placeholder="min"]');
    if (await minInput.count() > 0) {
        await minInput.fill('0');
        await dialog.locator('input[placeholder="max"]').fill('2000');
    }
}

/**
 * Sección "Colores" del dialogo "Editar opciones del gráfico": selecciona la primera
 * paleta del desplegable (si hay uno en la pestaña actual) y pone el PRIMER color
 * individual visible en amarillo -- si esa tarjeta de color tiene opacidad (radar/area),
 * la deja al 50%.
 *
 * `tab` elige la pestaña a activar antes de tocar nada -- solo bar/horizontalBar tienen
 * mas de una ("Colores"/"Colores Únicos"/"Colores por intervalo", via hasThresholdColors
 * en chart-dialog-features.ts); el resto de tipos solo tiene la primera y no renderiza
 * ningun boton de pestaña, por lo que se ignora si no existe.
 *
 * "Colores por intervalo" no tiene desplegable de paleta (son 3 colores fijos: superior/
 * entre/inferior umbral) -- la tarjeta "superior al umbral" hace de "primer color".
 */
async function exerciseColorOptions(page: Page, dialog: ReturnType<Page['locator']>, tab?: 'Colores' | 'Colores Únicos' | 'Colores por intervalo') {
    if (tab) {
        const tabBtn = dialog.getByRole('button', { name: esOrCaExact(tab) });
        if (await tabBtn.count() > 0) {
            await tabBtn.click();
            await page.waitForTimeout(300);
        }
    }

    const paletteDropdown = dialog.locator('p-dropdown').filter({ has: page.getByText(esOrCa('-- Seleccione una paleta --')) });
    if (await paletteDropdown.count() > 0) {
        await paletteDropdown.first().click();
        await page.getByRole('option').first().click();
        await page.waitForTimeout(200);
    }

    // "div.border.rounded-lg" tambien matchea filas de interruptores boolean que
    // comparten esas clases (p.ej. "Color semafórico" del knob) -- exigir que tenga un
    // p-colorPicker dentro lo limita a tarjetas de color de verdad.
    const colorCards = dialog.locator('div.border.rounded-lg').filter({ has: page.locator('p-colorPicker') });
    const firstColorCard = colorCards.first();
    if (await firstColorCard.count() === 0) return;
    // El input del color HEX es el hermano justo anterior al p-colorPicker -- no
    // siempre el primer <input> de la tarjeta: la de "Colores por intervalo" tiene
    // antes un p-inputNumber (el umbral), que tambien renderiza su propio <input>.
    await firstColorCard.locator('p-colorPicker').locator('xpath=preceding-sibling::input[1]').fill('#FFFF00');
    await page.waitForTimeout(150);

    const opacityInput = firstColorCard.locator('input[type="number"][min="0"][max="100"]');
    if (await opacityInput.count() > 0) {
        await opacityInput.fill('50');
        await page.waitForTimeout(150);
    }

    // HALLAZGO evitado: "Colores por intervalo" tiene 3 tarjetas (superior/entre/
    // inferior al umbral), todas con p-colorPicker, pero solo la primera y la ultima
    // llevan ademas un p-inputNumber de umbral (thresholdHigh/thresholdLow en
    // chart-dialog.component.ts). Si se dejan vacios (null), `hasThresholds` da false
    // y chart-dialog.component.ts:955 NUNCA calcula los colores por intervalo -- la
    // tarjeta quedaria "rellena" en el dialogo sin que la funcionalidad real se
    // ejercite en absoluto. Se rellenan aqui con 500/100: el "importe" agregado por
    // categoria de la datasource de pruebas da Mobiliario=1360.5, Electronica=295,
    // Iluminacion=54.4 (duckdb-fixture.ts), asi que con esos umbrales las 3 franjas
    // (superior/entre/inferior) quedan pobladas de verdad, no vacias.
    if (tab === 'Colores por intervalo') {
        await colorCards.first().locator('p-inputNumber input').fill('500');
        await page.waitForTimeout(150);
        await colorCards.last().locator('p-inputNumber input').fill('100');
        await page.waitForTimeout(150);
    }
}

test.describe.configure({ mode: 'serial' });

test.describe('Paneles y gráficos dentro de un dashboard (creación real vía UI)', () => {
    let dsId: string;
    let dashboardId: string;
    let panelCount = 0;

    test('preparacion: datasource y dashboard vacio para los paneles', async ({ api }) => {
        await deletePreviousPersistentDashboard(api);

        const dsRes = await createSalesDuckDbDataSource(api, PERSISTENT_DS_NAME, PERSISTENT_DS_FOLDER);
        expect(dsRes.status(), await dsRes.text()).toBe(201);
        dsId = (await dsRes.json()).data_source_id;

        const dashRes = await api.post('/dashboard', {
            config: { title: PERSISTENT_DASHBOARD_TITLE, visible: 'private', panel: [], ds: { _id: dsId }, styles: {}, tag: [] },
        });
        expect(dashRes.status(), await dashRes.text()).toBe(201);
        dashboardId = (await dashRes.json()).dashboard._id;
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
        test.setTimeout(15 * 60_000);
        await page.goto(`/#/dashboard/${dashboardId}`);
        await expect(page.locator('#myDashboard')).toBeVisible({ timeout: 15_000 });

        for (const chartCase of CHART_TYPE_CASES) {
            await addChartPanel(page, chartCase);
            panelCount++;
            await expect(page.locator('gridster-item'), `tras añadir "${chartCase.label}"`).toHaveCount(panelCount, { timeout: 10_000 });
            await expect(page.locator('.swal2-popup, .p-toast-message-error'), `error visible tras añadir "${chartCase.label}"`).toHaveCount(0);
        }

        console.log(`[dashboard-charts] ${panelCount} paneles creados (todos los tipos soportados menos los 2 de mapa).`);

        /**
         * Repaso de "Editar opciones del gráfico" para los 20 tipos que lo tienen
         * (no tablas/KPI/dynamicText/treetable, que usan sus propios dialogos mas
         * simples): activa/rellena cada opcion presente (ver exerciseDisplayOptions
         * para que se deja fuera a proposito y por que).
         */
        const CHART_OPTIONS_PANELS: Array<{ title: string; colorTab?: 'Colores' | 'Colores Únicos' | 'Colores por intervalo' }> = [
            { title: 'Histograma' },
            { title: 'Velocímetro' },
            { title: 'Gráfico de Pastel' },
            { title: 'Gráfico de Área Polar' },
            // Las 3 variantes de barras: cada una ejercita una pestaña de color distinta
            // (ver el comentario de CHART_TYPE_CASES/exerciseColorOptions). El resto de
            // paneles solo tiene la pestaña "Colores" (sin botones de pestaña), asi que
            // no hace falta indicarla -- exerciseColorOptions la ignora si no existe.
            { title: 'Gráfico de Barras (colores por categoría)', colorTab: 'Colores' },
            { title: 'Gráfico de Barras (colores únicos)', colorTab: 'Colores Únicos' },
            { title: 'Gráfico de Barras (colores por intervalo)', colorTab: 'Colores por intervalo' },
            { title: 'Gráfico de Barras Horizontales' },
            { title: 'Funnel' },
            { title: 'Bubblechart' },
            { title: 'Gráfico de Lineas' },
            { title: 'Gráfico de Áreas' },
            { title: 'Mixto: Barras y lineas' },
            { title: 'Radar' },
            { title: 'ScatterPlot' },
            { title: 'Gráfico Solar' },
            { title: 'Gráfico de Barras Apiladas' },
            { title: 'Gráfico de Barras Apiladas al 100%' },
            { title: 'Gráfico de Piramide' },
            { title: 'ParallelSets' },
            { title: 'TreeMap' },
            { title: 'Barras en carrera' },
        ];
        for (const { title, colorTab } of CHART_OPTIONS_PANELS) {
            await tweakChartOptions(page, title, async (dialog) => {
                await exerciseDisplayOptions(page, dialog);
                await exerciseColorOptions(page, dialog, colorTab);
            });
        }

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
        await page.getByText(esOrCaExact('Cambiar tipo de gráfico')).click();

        const gallery = page.locator('.chart-type-selector-grid');
        await expect(gallery).toBeVisible({ timeout: 10_000 });
        await gallery.locator('.chart-type-selector-item', { hasText: esOrCa('Gráfico de Barras Horizontales') }).click();

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
        await page.getByText(esOrCaExact('Eliminar panel')).click();

        panelCount--;
        await expect(page.locator('gridster-item')).toHaveCount(panelCount, { timeout: 10_000 });

        await openDashboardSidebar(page);
        await clickSaveInSidebar(page);
        await expect(page.locator('.swal2-popup, .p-toast-message-success')).toBeVisible({ timeout: 20_000 });

        await page.reload();
        await expect(page.locator('gridster-item')).toHaveCount(panelCount, { timeout: 20_000 });
    });

    /**
     * Repasa el resto de opciones del menú "..." de un panel que no tienen test propio
     * (Editar consulta, Editar opciones del gráfico, Cambiar tipo de gráfico y Eliminar
     * panel ya se prueban en otros tests de este describe).
     *
     * HALLAZGO: el diálogo de este menú ("OPCIONS DEL PANELL") puede renderizarse
     * parcialmente o del todo FUERA del viewport para paneles cerca del borde
     * izquierdo del dashboard (comprobado: boundingBox con x negativo) -- por eso
     * cada click de este test (y de todos los que tocan este menú en el resto del
     * archivo) usa `.evaluate(el => el.click())` en vez de un click normal de
     * Playwright, que falla con "Element is outside of the viewport" incluso con
     * `force: true`. No se ha investigado el motivo de fondo (¿cálculo de posición
     * del `p-dialog` basado en el punto de click, sin clamping a los bordes de la
     * ventana?), pero es real y reproducible.
     *
     * HALLAZGO menor: tras "Bloquear panel", el texto del propio menú no se actualiza
     * a "Desbloquear panel" -- ni en el mismo menú (que sigue abierto, el comando no
     * llama a `hideContextMenu()`) ni reabriéndolo desde cero. El bloqueo SÍ se aplica
     * de verdad (verificado abajo vía el JSON guardado: `dragEnabled`/`resizeEnabled`
     * pasan a `false`), así que es un problema de refresco de `p-panelMenu` al
     * reasignarle un array `model` nuevo con el dialog ya abierto, no una funcionalidad
     * rota.
     */
    test('repasa el resto de opciones del menú contextual del panel', async ({ page, api }) => {
        // El timeout por defecto del test (45s) no basta: solo la rafaga de fondo de
        // "Vincular con otro informe" + el guardado real pueden sumar hasta 2 minutos
        // en este entorno (ver los HALLAZGOs de red mas abajo).
        test.setTimeout(5 * 60_000);
        await page.goto(`/#/dashboard/${dashboardId}`);
        await expect(page.locator('#myDashboard')).toBeVisible({ timeout: 15_000 });

        const targetTitle = 'Gráfico de Barras (colores por categoría)';

        // --- Editar estilo del panel ---
        await openPanelMenu(page, targetTitle);
        await page.getByText(esOrCa('Editar estilo del panel'), { exact: true }).evaluate((el: HTMLElement) => el.click());
        const styleDialog = page.locator('.p-dialog').last();
        await expect(styleDialog, 'no se abre "Editar estilo del panel"').toBeVisible({ timeout: 10_000 });
        await styleDialog.locator('input.eda-color-pick').first().fill('#ABCDEF');
        await styleDialog.locator('input[type="radio"][value="center"]').check({ force: true });
        await styleDialog.locator('button.confirm-button').click();
        await expect(styleDialog, 'el dialogo de estilo no se cierra tras aplicar').toHaveCount(0, { timeout: 10_000 });

        // --- Mostrar campos de origen (solo lectura: showApply=false en este dialogo) ---
        await openPanelMenu(page, targetTitle);
        await page.getByText(esOrCa('Mostrar campos de origen'), { exact: true }).evaluate((el: HTMLElement) => el.click());
        const sourceDialog = page.locator('.p-dialog').last();
        await expect(sourceDialog, 'no se abre "Mostrar campos de origen"').toBeVisible({ timeout: 10_000 });
        await sourceDialog.locator('button.cancel-button').click();
        await expect(sourceDialog, 'el dialogo de campos de origen no se cierra').toHaveCount(0, { timeout: 10_000 });

        // --- Vincular con otro informe: smoke test (abre y cierra sin confirmar --
        // elegir un informe de verdad para vincular no deja un estado limpio de probar). ---
        await openPanelMenu(page, targetTitle);
        await page.getByText(esOrCa('Vincular con otro informe'), { exact: true }).evaluate((el: HTMLElement) => el.click());
        const linkDialog = page.locator('.p-dialog').last();
        await expect(linkDialog, 'no se abre "Vincular con otro informe"').toBeVisible({ timeout: 10_000 });
        await linkDialog.locator('button.cancel-button').click();
        await expect(linkDialog, 'el dialogo de vincular informe no se cierra').toHaveCount(0, { timeout: 10_000 });

        // HALLAZGO: "Vincular con otro informe" (link-dashboards.component.ts,
        // initDashboards()) lanza un GET /dashboard/:id EN PARALELO de TODOS los
        // dashboards visibles al usuario (confirmado: ~350 en este entorno de dev, la
        // mayoria contenido real, no basura de tests), sin cancelarlo si el dialogo se
        // cierra antes de que termine. Esa rafaga sigue en marcha de fondo mucho
        // despues de cerrar el dialogo y compite por el mismo servidor Node con el
        // guardado real del dashboard (mas abajo), retrasandolo lo suficiente como
        // para que su toast no de tiempo a aparecer. Se espera aqui a que se asiente.
        await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});

        // --- Exportar a Excel / CSV: el mismo item de menu decide el formato leyendo
        // el texto exacto del span clicado ("Excel" o "CSV"). ---
        await openPanelMenu(page, targetTitle);
        const csvDownloadPromise = page.waitForEvent('download', { timeout: 10_000 });
        await page.locator('.p-dialog').last().getByText('CSV', { exact: true }).evaluate((el: HTMLElement) => el.click());
        const csvDownload = await csvDownloadPromise;
        expect(csvDownload.suggestedFilename(), 'el export CSV deberia tener extension .csv').toMatch(/\.csv$/i);

        // HALLAZGO: justo despues de que una descarga termine, el siguiente click en
        // el icono "..." del panel no reabre el menu (reproducido aislado: el mismo
        // click, con panel/menu identicos, falla sin esperar y funciona a la primera
        // esperando ~1.5s). Probablemente la propia descarga del navegador roba el
        // foco un instante. Por eso aqui se espera antes de reabrir el menu para
        // "Excel" -- sin esto, openPanelMenu() reintentaria sin saber que el problema
        // es temporal y no un dialogo equivocado.
        await page.waitForTimeout(1500);
        await openPanelMenu(page, targetTitle);
        const excelDownloadPromise = page.waitForEvent('download', { timeout: 15_000 });
        await page.locator('.p-dialog').last().getByText('Excel', { exact: true }).evaluate((el: HTMLElement) => el.click());
        const excelDownload = await excelDownloadPromise;
        expect(excelDownload.suggestedFilename(), 'el export Excel deberia tener extension .xlsx').toMatch(/\.xlsx?$/i);
        // Mismo hallazgo que antes de "Excel" -- se deja asentar el foco tras la
        // descarga antes de seguir interactuando con menus del panel.
        await page.waitForTimeout(1500);

        // --- Duplicar panel ---
        const beforeDup = await page.locator('gridster-item').count();
        await openPanelMenu(page, targetTitle);
        await page.getByText(esOrCa('Duplicar panel'), { exact: true }).evaluate((el: HTMLElement) => el.click());
        await expect(page.locator('gridster-item'), 'duplicar panel deberia añadir uno mas').toHaveCount(beforeDup + 1, { timeout: 10_000 });
        // HALLAZGO: el duplicado clona el panel PERSISTIDO (contenido/consulta), pero
        // no los datos YA CARGADOS del grafico (currentQuery/chartData viven en la
        // instancia del componente, no se copian) -- el nuevo EdaBlankPanelComponent
        // tiene que volver a pedir sus datos al montarse, asi que se ve en blanco un
        // instante. Sin esperar a que su grafico realmente renderice, el video lo
        // muestra en blanco y cualquier captura inmediatamente despues tambien.
        await expect(page.locator('gridster-item').last().locator('svg, canvas'), 'el panel duplicado no llega a renderizar su grafico').toBeVisible({ timeout: 10_000 });
        // Mismo hallazgo que tras una descarga: un click de menu justo despues de otra
        // accion del panel (aqui, duplicar) a veces no agarra a la primera.
        await page.waitForTimeout(1000);

        // --- Bloquear panel (verificado via el JSON guardado, no via el texto del
        // menu -- ver el hallazgo de refresco en el comentario de este test). ---
        let lockMenuOpened = false;
        for (let attempt = 1; attempt <= 5 && !lockMenuOpened; attempt++) {
            await openPanelMenu(page, targetTitle);
            await page.waitForTimeout(300);
            lockMenuOpened = await page.locator('.p-dialog').last().isVisible().catch(() => false);
        }
        expect(lockMenuOpened, 'no se consigue reabrir el menu tras duplicar').toBe(true);
        await page.getByText(esOrCa('Bloquear panel'), { exact: true }).evaluate((el: HTMLElement) => el.click());
        await page.waitForTimeout(300);
        // HALLAZGO: Escape no cierra este dialogo de forma fiable (el handler
        // document:keydown.esc de eda-context-menu.component.html compite con el
        // closeOnEscape por defecto de p-dialog, y el "modal mask" a veces queda
        // atrapando clicks posteriores en toda la pagina, incluido el boton "Guardar"
        // del sidebar). Se cierra en su lugar con el icono "X" propio del dialogo.
        await page.locator('.p-dialog').last().locator('i.fa-times').evaluate((el: HTMLElement) => el.click());
        await expect(page.locator('.p-dialog').last(), 'el menu del panel no se cierra tras bloquear').toHaveCount(0, { timeout: 10_000 });

        await openDashboardSidebar(page);
        // Igual que al cerrar el menu del panel: un settle wait corto antes del click
        // de guardar, y el click via evaluate() en vez de un click normal de Playwright
        // (mismo patron que el resto de este archivo tras cualquier cambio de estado
        // reciente del dashboard -- ver los demas HALLAZGOs de settle/evaluate en este
        // mismo test).
        await page.waitForTimeout(500);
        const saveBtn = page.locator('.sidebarLabels', { hasText: 'Guardar' }).filter({ hasNotText: 'como' }).first();
        await saveBtn.evaluate((el: HTMLElement) => el.click());
        // 60s, no 20s: el PUT /dashboard/:id de este guardado se ha visto en trace
        // quedar pendiente (sin respuesta) mas de 20s en este entorno -- mismo
        // HALLAZGO que la rafaga de "Vincular con otro informe" de mas arriba,
        // compitiendo por el mismo servidor Node.
        await expect(page.locator('.swal2-popup, .p-toast-message-success, .p-toast-message-error'), 'no aparece ningun toast tras guardar').toBeVisible({ timeout: 60_000 });
        await expect(page.locator('.p-toast-message-error'), 'guardar dio un toast de error').toHaveCount(0);

        const full = await (await api.get(`/dashboard/${dashboardId}`)).json();
        const lockedPanel = full.dashboard?.config?.panel?.find((p: any) => p.title === targetTitle);
        expect(lockedPanel?.dragEnabled, '"Bloquear panel" deberia poner dragEnabled a false').toBe(false);
        expect(lockedPanel?.resizeEnabled, '"Bloquear panel" deberia poner resizeEnabled a false').toBe(false);

        // Se borra el duplicado (mismo titulo que el original, confuso de revisar en
        // los videos) DESPUES de guardar y con una recarga de pagina limpia -- varias
        // acciones de menu seguidas en la misma sesion (sobre todo justo despues de
        // una descarga o de duplicar) a veces no "agarran" al primer intento (ver los
        // hallazgos de esta misma funcion); recargar antes de interactuar es el mismo
        // patron ya fiable que usan "editar/borrar un panel existente" mas abajo.
        await page.reload();
        await expect(page.locator('gridster-item')).toHaveCount(beforeDup + 1, { timeout: 20_000 });
        const duplicatedPanel = page.locator('gridster-item').last();
        await duplicatedPanel.locator('i.pi-ellipsis-v').first().evaluate((el: HTMLElement) => el.click());
        await expect(page.locator('.p-dialog').last(), 'no se abre el menu del panel duplicado').toBeVisible({ timeout: 10_000 });
        // "Eliminar panel" borra al instante, sin confirmacion (a diferencia de
        // "Eliminar informe"): mismo comportamiento que ya usa sin esperar ningun
        // swal el test "borrar un panel existente" mas abajo.
        await page.getByText(esOrCa('Eliminar panel'), { exact: true }).evaluate((el: HTMLElement) => el.click());
        await expect(page.locator('gridster-item'), 'el duplicado no se borro').toHaveCount(beforeDup, { timeout: 10_000 });

        await openDashboardSidebar(page);
        await clickSaveInSidebar(page);
        await expect(page.locator('.swal2-popup, .p-toast-message-success')).toBeVisible({ timeout: 20_000 });
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
        await page.locator('.sidebarLabels', { hasText: esOrCa('Nuevo Panel') }).click();

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

        await dialog.getByText(esOrCa('Vista previa')).click();
        await dialog.locator('#chartSelector').first().click();
        await page.getByRole('option', { name: esOrCaExact('Tabla DataQuality') }).click();

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
        await page.getByText(esOrCaExact('Eliminar panel')).click();
    });
});
