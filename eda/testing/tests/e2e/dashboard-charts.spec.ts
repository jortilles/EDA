import { test, expect } from '../fixtures/e2e-base';
import type { Page } from '@playwright/test';
import type { ApiClient } from '../../utils/api-client';
import { createSalesDuckDbDataSource } from '../../utils/duckdb-fixture';
import { esOrCa, esOrCaExact } from '../../utils/locale-catalog';

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
interface ChartTypeCase {
    label: string;
    fields: string[];
    dateFormat?: { field: string; formatLabel: string };
    showTop?: number;
    /** Titulo del panel, si debe ser distinto de `label` (p.ej. las 3 variantes de
     * "Gráfico de Barras" que demuestran cada pestaña de color). */
    title?: string;
}

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
async function selectChartType(page: Page, dialog: ReturnType<Page['locator']>, chartLabel: string) {
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
async function setPanelTitle(dialog: ReturnType<Page['locator']>, title: string) {
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
async function addChartPanel(page: Page, { label: chartLabel, fields, dateFormat, showTop, title }: ChartTypeCase) {
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

/** Abre el menu contextual ("...") de un panel YA EXISTENTE en el dashboard,
 * localizandolo por su titulo EXACTO (coincide con setPanelTitle()). */
async function openPanelMenu(page: Page, panelTitle: string) {
    const escaped = panelTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const panel = page.locator('gridster-item').filter({
        has: page.locator('h2', { hasText: new RegExp(`^${escaped}$`) }),
    });
    await panel.locator('i.pi-ellipsis-v').first().evaluate((el: HTMLElement) => el.click());
}

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

        await dialog.locator('button.confirm-button').click();
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
        await row.locator('label.relative.inline-flex').first().click();
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
    const firstColorCard = dialog.locator('div.border.rounded-lg').filter({ has: page.locator('p-colorPicker') }).first();
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

        // --- Exportar a Excel / CSV: el mismo item de menu decide el formato leyendo
        // el texto exacto del span clicado ("Excel" o "CSV"). ---
        await openPanelMenu(page, targetTitle);
        const csvDownloadPromise = page.waitForEvent('download', { timeout: 10_000 });
        await page.locator('.p-dialog').last().getByText('CSV', { exact: true }).evaluate((el: HTMLElement) => el.click());
        const csvDownload = await csvDownloadPromise;
        expect(csvDownload.suggestedFilename(), 'el export CSV deberia tener extension .csv').toMatch(/\.csv$/i);

        await openPanelMenu(page, targetTitle);
        // Generar el .xlsx (via exceljs) tarda mas que el CSV plano -- mas margen.
        const excelDownloadPromise = page.waitForEvent('download', { timeout: 20_000 });
        await page.locator('.p-dialog').last().getByText('Excel', { exact: true }).evaluate((el: HTMLElement) => el.click());
        const excelDownload = await excelDownloadPromise;
        expect(excelDownload.suggestedFilename(), 'el export Excel deberia tener extension .xlsx').toMatch(/\.xlsx?$/i);

        // --- Duplicar panel ---
        const beforeDup = await page.locator('gridster-item').count();
        await openPanelMenu(page, targetTitle);
        await page.getByText(esOrCa('Duplicar panel'), { exact: true }).evaluate((el: HTMLElement) => el.click());
        await expect(page.locator('gridster-item'), 'duplicar panel deberia añadir uno mas').toHaveCount(beforeDup + 1, { timeout: 10_000 });
        // Se borra el duplicado para no dejar un panel de mas en el dashboard
        // persistente (mismo titulo que el original, confuso de revisar en los videos).
        const duplicatedPanel = page.locator('gridster-item').last();
        await duplicatedPanel.locator('i.pi-ellipsis-v').first().evaluate((el: HTMLElement) => el.click());
        await page.waitForTimeout(300);
        await page.getByText(esOrCa('Eliminar panel'), { exact: true }).evaluate((el: HTMLElement) => el.click());
        await page.locator('.swal2-confirm').click();
        await expect(page.locator('gridster-item'), 'el duplicado no se borro').toHaveCount(beforeDup, { timeout: 10_000 });

        // --- Bloquear panel (verificado via el JSON guardado, no via el texto del
        // menu -- ver el hallazgo de refresco en el comentario de este test). ---
        await openPanelMenu(page, targetTitle);
        await page.getByText(esOrCa('Bloquear panel'), { exact: true }).evaluate((el: HTMLElement) => el.click());
        await page.waitForTimeout(300);
        await page.keyboard.press('Escape');

        await openDashboardSidebar(page);
        await clickSaveInSidebar(page);
        await expect(page.locator('.swal2-popup, .p-toast-message-success')).toBeVisible({ timeout: 20_000 });

        const full = await (await api.get(`/dashboard/${dashboardId}`)).json();
        const lockedPanel = full.dashboard?.config?.panel?.find((p: any) => p.title === targetTitle);
        expect(lockedPanel?.dragEnabled, '"Bloquear panel" deberia poner dragEnabled a false').toBe(false);
        expect(lockedPanel?.resizeEnabled, '"Bloquear panel" deberia poner resizeEnabled a false').toBe(false);
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
