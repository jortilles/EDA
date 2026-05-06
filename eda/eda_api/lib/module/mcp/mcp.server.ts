import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import DataSource from '../datasource/model/datasource.model';
import Dashboard from '../dashboard/model/dashboard.model';
import {
    resolveUser,
    buildApiCall,
    getBaseUrl,
    getAccessibleDatasourceIds,
    getAllDashboards,
    filterDatasourceForAI,
    detectRankingIntent,
} from './mcp.helpers';

// ============================================================
// MCP SERVER
// ============================================================

export function createMcpServer(requestUser?: any) {
    console.log('[MCP] createMcpServer - registrando tools...');
    const server = new McpServer({ name: 'eda-mcp', version: '1.0.0' });

    // ── list_dashboards ─────────────────────────────────────────────────────
    (server as any).registerTool(
        'list_dashboards',
        {
            description: 'Lista todos los dashboards accesibles en EDA para el usuario actual. Devuelve por cada dashboard: título, ID, autor (quién lo creó), fecha de creación, fecha de modificación, visibilidad (privado/grupo/público) y URL directa. Úsalo para: descubrir dashboards disponibles, saber quién ha creado dashboards, buscar dashboards de un usuario concreto (parámetro autor), o responder preguntas sobre fechas de creación/modificación.',
            inputSchema: {
                autor: z.string().optional().describe('Filtra los dashboards por nombre de autor (búsqueda parcial, case-insensitive). Si se omite, devuelve todos los dashboards accesibles.'),
            },
        },
        async (args: any) => {
            const autorFiltro: string | undefined = args?.autor?.toLowerCase();
            console.log('[MCP] tool: list_dashboards - ejecutando | autor:', autorFiltro ?? '(todos)');
            let user: any;
            try {
                user = await resolveUser(requestUser);
                console.log('[MCP] list_dashboards — usuario:', user?.email ?? user?._id ?? '(desconocido)');
            } catch (err: any) {
                return { content: [{ type: 'text', text: `Error de autenticación: ${err.message}` }], isError: true };
            }

            try {
                const { apiBase, token } = buildApiCall(user);
                console.log('[MCP] list_dashboards — GET', apiBase + '/dashboard/');
                const response = await fetch(`${apiBase}/dashboard/?token=${token}`);
                if (!response.ok) {
                    const body = await response.text();
                    throw new Error(`/dashboard/ HTTP ${response.status}: ${body}`);
                }
                const data: any = await response.json();
                if (!data.ok) throw new Error('La API respondió con ok: false');

                const accessibleDsIds = await getAccessibleDatasourceIds(user);
                let hiddenByAccessCount = 0;
                const filterItems = (items: any[]) => items.filter((d: any) => {
                    const dsId = d.config?.ds?._id?.toString();
                    if (dsId && !accessibleDsIds.has(dsId)) {
                        hiddenByAccessCount++;
                        console.log(`[MCP] list_dashboards — dashboard oculto (datasource NONE): ${d.config?.title} | dsId=${dsId}`);
                        return false;
                    }
                    if (autorFiltro) {
                        const dashAuthor = (d.config?.author ?? d.user?.name ?? '').toLowerCase();
                        if (!dashAuthor.includes(autorFiltro)) return false;
                    }
                    return true;
                });

                const privados: any[] = filterItems(data.dashboards ?? []);
                const grupo: any[]    = filterItems(data.group ?? []);
                const comunes: any[]  = filterItems(data.publics ?? []);
                const publicos: any[] = filterItems(data.shared ?? []);
                console.log('[MCP] list_dashboards — tras filtro | privados:', privados.length, '| grupo:', grupo.length, '| comunes:', comunes.length, '| públicos:', publicos.length);

                const baseUrl = getBaseUrl();
                console.log('[MCP] list_dashboards — baseUrl:', baseUrl || '(vacío)');
                const formatGroup = (label: string, items: any[] = []) => {
                    const lines = [`\n## ${label} (${items.length})`];
                    if (items.length === 0) lines.push('  (sin dashboards)');
                    for (const d of items) {
                        const link = baseUrl ? ` — ${baseUrl}/dashboard/${encodeURIComponent(d._id)}` : '';
                        const author = d.config?.author ?? d.user?.name ?? '(desconocido)';
                        const meta: string[] = [`autor: ${author}`];
                        lines.push(`  - [${d._id}] ${d.config?.title ?? '(sin título)'} (${meta.join(' | ')})${link}`);
                    }
                    return lines;
                };

                const total = privados.length + grupo.length + comunes.length + publicos.length;
                const filtroDesc = autorFiltro ? ` (filtrado por autor: "${autorFiltro}")` : '';
                const lines = [
                    `Total: ${total} dashboards${filtroDesc} (${privados.length} privados, ${grupo.length} de grupo, ${comunes.length} comunes, ${publicos.length} públicos)`,
                    ...formatGroup('Privados', privados),
                    ...formatGroup('De grupo', grupo),
                    ...formatGroup('Comunes', comunes),
                    ...formatGroup('Públicos', publicos),
                ];
                if (hiddenByAccessCount > 0) {
                    lines.push(`\n_(Nota: existen ${hiddenByAccessCount} dashboard(s) adicionales en el sistema a los que no tengo acceso.)_`);
                }

                return { content: [{ type: 'text', text: 'Dashboards en EDA:\n' + lines.join('\n') }] };
            } catch (err: any) {
                console.error('[MCP] list_dashboards error:', err.message, err.stack);
                return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
            }
        }
    );
    console.log('[MCP] createMcpServer - list_dashboards registrado');

    // ── list_datasources ────────────────────────────────────────────────────
    server.registerTool(
        'list_datasources',
        { description: 'Lista los datasources (modelos de datos) accesibles en EDA para el usuario actual, filtrados por permisos y visibilidad. Devuelve por cada datasource: ID, nombre del modelo y descripción. Úsalo para: descubrir qué fuentes de datos existen, obtener el ID de un datasource antes de llamar a get_datasource, o responder preguntas sobre qué datos hay disponibles en el sistema.' },
        async () => {
            console.log('[MCP] tool: list_datasources - ejecutando');
            try {
                const user = await resolveUser(requestUser);
                const { apiBase, token } = buildApiCall(user);
                console.log('[MCP] list_datasources — GET', apiBase + '/datasource/namesForDashboard');
                const response = await fetch(`${apiBase}/datasource/namesForDashboard?token=${token}`);
                if (!response.ok) {
                    const body = await response.text();
                    throw new Error(`/datasource/namesForDashboard HTTP ${response.status}: ${body}`);
                }
                const data: any = await response.json();
                console.log('[MCP] list_datasources — metadata recibida | total ds:', (data.ds ?? []).length);
                (data.ds ?? []).forEach((ds: any, i: number) => {
                    console.log(`[MCP] list_datasources — ds[${i}]:`, JSON.stringify({ _id: ds._id, model_name: ds.model_name, model_description: ds.model_description ?? null }));
                });

                const baseUrl = getBaseUrl();
                console.log('[MCP] list_datasources — baseUrl:', baseUrl || '(vacío)');
                const allDs = data.ds ?? [];
                const visibleDs = allDs.filter((ds: any) => {
                    if ((ds.ia_visibility ?? 'FULL') === 'NONE') {
                        console.log('[MCP] list_datasources — excluido (ia_visibility=NONE):', ds.model_name ?? ds._id);
                        return false;
                    }
                    return true;
                });
                const hiddenDsCount = allDs.length - visibleDs.length;
                const lines = visibleDs.map((ds: any) => {
                    const link = baseUrl ? ` — ${baseUrl}/data-source/${encodeURIComponent(ds._id)}` : '';
                    const desc = ds.model_description ? ` — ${ds.model_description}` : '';
                    return `  - ${ds.model_name ?? '(sin nombre)'}${desc}${link}`;
                });
                if (hiddenDsCount > 0) {
                    lines.push(`\n_(Nota: existen ${hiddenDsCount} modelo(s) de datos adicionales en el sistema a los que no tengo acceso.)_`);
                }
                return {
                    content: [{
                        type: 'text',
                        text: 'Datasources en EDA:\n' + (lines.length ? lines.join('\n') : '  (sin datasources)'),
                    }],
                };
            } catch (err: any) {
                console.error('[MCP] list_datasources error:', err.message, err.stack);
                return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
            }
        }
    );
    console.log('[MCP] createMcpServer - list_datasources registrado');

    // ── get_datasource ──────────────────────────────────────────────────────
    (server as any).registerTool(
        'get_datasource',
        {
            description: 'Obtiene el esquema completo de un datasource de EDA por su ID: nombre, descripción, tablas y columnas disponibles (con sus tipos). Usa list_datasources primero para obtener el ID. Úsalo para: conocer qué tablas y campos contiene un modelo de datos, entender la estructura antes de construir consultas, o responder preguntas sobre el contenido de un datasource.',
            inputSchema: { id: z.string().describe('ID del datasource (obtenido de list_datasources)') },
        },
        async (args: any) => {
            console.log('[MCP] tool: get_datasource - args:', JSON.stringify(args));
            const id: string = args.id;
            try {
                const user = await resolveUser(requestUser);
                const { apiBase, token } = buildApiCall(user);
                console.log('[MCP] get_datasource — GET', apiBase + '/datasource/' + id);
                const response = await fetch(`${apiBase}/datasource/${encodeURIComponent(id)}?token=${token}`);
                if (!response.ok) {
                    const body = await response.text();
                    throw new Error(`/datasource/${id} HTTP ${response.status}: ${body}`);
                }
                const data: any = await response.json();
                if (!data.ok) return { content: [{ type: 'text', text: `Datasource no encontrado o sin acceso: ${id}` }], isError: true };
                const ds = data.dataSource;
                console.log('[MCP] get_datasource — metadata recibida:', JSON.stringify({
                    _id: ds?._id,
                    model_name: ds?.ds?.metadata?.model_name ?? null,
                    model_description: ds?.ds?.metadata?.model_description ?? null,
                    ia_visibility: ds?.ds?.metadata?.ia_visibility ?? null,
                    tables: Array.isArray(ds?.ds?.model?.tables) ? ds.ds.model.tables.length : (ds?.ds?.model ? Object.keys(ds.ds.model).length : 0),
                }));
                const filtered = filterDatasourceForAI(data.dataSource);
                if (!filtered) return { content: [{ type: 'text', text: `Datasource ${id} excluido por ia_visibility: NONE` }], isError: true };
                const baseUrl = getBaseUrl();
                console.log('[MCP] get_datasource — baseUrl:', baseUrl || '(vacío)', '| id:', id);
                const urlStr = baseUrl ? `URL: ${baseUrl}/data-source/${encodeURIComponent(id)}\n\n` : '';
                return { content: [{ type: 'text', text: `${urlStr}${JSON.stringify(filtered, null, 2)}` }] };
            } catch (err: any) {
                console.error('[MCP] get_datasource error:', err.message, err.stack);
                return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
            }
        }
    );
    console.log('[MCP] createMcpServer - get_datasource registrado');

    // ── get_dashboard ───────────────────────────────────────────────────────
    (server as any).registerTool(
        'get_dashboard',
        {
            description: 'Obtiene los metadatos completos de un dashboard de EDA por su ID: título, autor, fecha de creación, fecha de última modificación, visibilidad, datasource(s) utilizados (nombre e ID) y lista de panels con sus campos y tipo de visualización. Úsalo para: conocer quién creó un dashboard y cuándo, ver qué campos visualiza cada panel, u obtener el datasource asociado antes de llamar a get_datasource.',
            inputSchema: { id: z.string().describe('ID del dashboard (obtenido de list_dashboards)') },
        },
        async (args: any) => {
            console.log('[MCP] tool: get_dashboard - args:', JSON.stringify(args));
            const id: string = args.id;
            try {
                const user = await resolveUser(requestUser);
                const { apiBase, token } = buildApiCall(user);
                console.log('[MCP] get_dashboard — GET', apiBase + '/dashboard/' + id);
                const response = await fetch(`${apiBase}/dashboard/${encodeURIComponent(id)}?token=${token}`);
                if (!response.ok) {
                    const body = await response.text();
                    throw new Error(`/dashboard/${id} HTTP ${response.status}: ${body}`);
                }
                const data: any = await response.json();
                if (!data.ok) return { content: [{ type: 'text', text: `Dashboard no encontrado: ${id}` }], isError: true };

                const db = data.dashboard;
                console.log('[MCP] get_dashboard — metadata recibida:', JSON.stringify({
                    _id: id,
                    title: db?.config?.title ?? null,
                    visible: db?.config?.visible ?? null,
                    panels: Array.isArray(db?.config?.panel) ? db.config.panel.length : 0,
                    ds: db?.config?.ds?._id ?? null,
                }));

                const accessibleDsIds = await getAccessibleDatasourceIds(user);
                const mainDsId = db?.config?.ds?._id?.toString();
                if (mainDsId && !accessibleDsIds.has(mainDsId)) {
                    console.log(`[MCP] get_dashboard — bloqueado (datasource NONE): id=${id} | dsId=${mainDsId}`);
                    return { content: [{ type: 'text', text: `Dashboard no encontrado: ${id}` }], isError: true };
                }

                const baseUrl = getBaseUrl();
                console.log('[MCP] get_dashboard — baseUrl:', baseUrl || '(vacío)', '| id:', id);
                const dashboardLink = baseUrl ? `${baseUrl}/dashboard/${encodeURIComponent(id)}` : '';
                const allPanels = Array.isArray(db.config?.panel) ? db.config.panel : [];
                const panels = allPanels.filter((p: any) => {
                    const mid = p.content?.query?.model_id;
                    if (!mid) return true;
                    const visible = accessibleDsIds.has(mid);
                    if (!visible) console.log(`[MCP] get_dashboard — panel oculto (datasource NONE): panel=${p.title} | model_id=${mid}`);
                    return visible;
                });

                const datasourceIds: string[] = [...new Set<string>(
                    panels.map((p: any) => p.content?.query?.model_id).filter(Boolean) as string[]
                )];
                const datasourceLabels = datasourceIds.map(dsId => {
                    const name = accessibleDsIds.get(dsId);
                    return name ? `${name} (${dsId})` : dsId;
                });

                const author    = db.config?.author ?? '(desconocido)';
                const createdAt  = db.config?.createdAt  ? new Date(db.config.createdAt).toLocaleDateString('es-ES')  : null;
                const modifiedAt = db.config?.modifiedAt ? new Date(db.config.modifiedAt).toLocaleDateString('es-ES') : null;

                const lines: string[] = [
                    `Dashboard: ${db.config?.title ?? '(sin título)'}`,
                    ...(dashboardLink ? [`Dashboard URL / LINK: ${dashboardLink}`] : []),
                    `Visibilidad: ${db.config?.visible ?? '(desconocida)'}`,
                    `Autor: ${author}`,
                    ...(createdAt  ? [`Creado: ${createdAt}`]    : []),
                    ...(modifiedAt ? [`Modificado: ${modifiedAt}`] : []),
                    `Panels: ${panels.length}`,
                    ...(datasourceLabels.length > 0 ? [`Datasource(s): ${datasourceLabels.join(', ')}`] : []),
                    '',
                ];

                const dataOnlyPanels = panels.filter((p: any) => (p.type ?? 0) === 0);
                if (dataOnlyPanels.length === 0) {
                    lines.push('(sin panels)');
                } else {
                    lines.push('--- Panels ---');
                    for (let i = 0; i < dataOnlyPanels.length; i++) {
                        const panel = dataOnlyPanels[i];
                        const fields: any[] = panel.content?.query?.query?.fields ?? [];
                        const fieldNames = fields.map((f: any) => f.display_name ?? f.field_name).filter(Boolean);
                        const desc = panel.description ? ` — ${panel.description}` : '';
                        lines.push(`${i + 1}. ${panel.title ?? '(sin título)'}${desc}`);
                        if (fieldNames.length > 0) lines.push(`   Campos: ${fieldNames.join(', ')}`);
                        const chartType = panel.content?.chart_type ?? panel.content?.edaChart ?? null;
                        if (chartType) lines.push(`   Tipo: ${chartType}`);
                    }
                }
                return { content: [{ type: 'text', text: lines.join('\n') }] };
            } catch (err: any) {
                console.error('[MCP] get_dashboard error:', err.message, err.stack);
                return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
            }
        }
    );
    console.log('[MCP] createMcpServer - get_dashboard registrado');

    // ── get_data_from_dashboard ─────────────────────────────────────────────
    (server as any).registerTool(
        'get_data_from_dashboard',
        {
            description: 'Busca en los dashboards de EDA paneles con datos relevantes a una pregunta. SIN dashboard_id: modo exploración — devuelve un catálogo estructurado de opciones (panel, datasource, filtros activos) para que el asistente presente al usuario cuál quiere consultar. CON dashboard_id: modo datos — ejecuta las queries de los paneles y devuelve el modelo de respuesta con datos reales + fuente.',
            inputSchema: {
                question:           z.string().describe('Pregunta del usuario sobre los datos que quiere consultar'),
                campos_requeridos:  z.array(z.string()).optional().describe('Palabras clave de los campos que deben aparecer en el panel (ej: ["country","credit"]). En modo exploración, solo se devuelven paneles donde TODOS los campos mencionados estén presentes (coincidencia parcial, case-insensitive). El asistente debe inferir estas palabras clave de la pregunta del usuario.'),
                dashboard_id:       z.string().optional().describe('ID del dashboard a consultar (opcional). Si no se proporciona, se lista el catálogo de opciones disponibles.'),
                panel_index:        z.number().optional().describe('Índice del panel dentro del dashboard (0-based). Si se omite, se ejecutan todos los panels del dashboard.'),
                datasource_id:      z.string().optional().describe('ID del datasource para consulta directa (modo fallback). Úsalo SOLO cuando el usuario haya confirmado explícitamente consultar un modelo de datos directamente, al no haberse encontrado paneles en dashboards.'),
                campos_consulta:    z.array(z.string()).optional().describe('Nombres técnicos de columnas a consultar en modo fallback (obtenidos de get_datasource). Si se omite, se usan los campos más relevantes del modelo según la pregunta.'),
                ordenar_campo:      z.string().optional().describe('display_name del campo por el que ordenar los resultados. Rellénalo cuando la pregunta implique ranking ("mejores", "top", "más alto", "lowest", etc.). Infiere el campo de la pregunta (ej: "clientes con más ventas" → campo de ventas/importe).'),
                ordenar_direccion:  z.enum(['Asc', 'Desc']).optional().describe('Dirección del orden: Desc = mayor primero (mejores, top, más alto), Asc = menor primero (peores, mínimo, lowest). Rellénalo junto con ordenar_campo.'),
                limite_filas:       z.number().optional().describe('Número máximo de filas a devolver. Rellénalo cuando el usuario pida "top N", "los 5 mejores", "give me 10", etc.'),
                sin_agregacion:     z.boolean().optional().describe('true si el usuario quiere filas de detalle sin agrupar (ej: "lista de todos los pedidos", "ver cada registro", "sin agrupar", "detalle completo"). Elimina todas las agregaciones del panel y devuelve filas individuales con límite de 500.'),
            },
        },
        async (args: any) => {
            console.log('[MCP] tool: get_data_from_dashboard - START');
            console.log('[MCP] get_data_from_dashboard - question:', args?.question);
            console.log('[MCP] get_data_from_dashboard - dashboard_id:', args?.dashboard_id ?? '(no proporcionado → modo exploración)');
            console.log('[MCP] get_data_from_dashboard - panel_index:', args?.panel_index ?? '(no proporcionado → todos)');
            console.log('[MCP] get_data_from_dashboard - campos_requeridos:', args?.campos_requeridos ?? '(no proporcionados → sin filtro de campos)');
            console.log('[MCP] get_data_from_dashboard - ordenar_campo:', args?.ordenar_campo ?? '(no proporcionado)');
            console.log('[MCP] get_data_from_dashboard - ordenar_direccion:', args?.ordenar_direccion ?? '(no proporcionado)');
            console.log('[MCP] get_data_from_dashboard - limite_filas:', args?.limite_filas ?? '(no proporcionado)');
            console.log('[MCP] get_data_from_dashboard - sin_agregacion:', args?.sin_agregacion ?? '(no proporcionado)');
            const { question, dashboard_id, panel_index, campos_requeridos, datasource_id, campos_consulta,
                    ordenar_campo, ordenar_direccion, limite_filas, sin_agregacion } = args;
            const camposLower: string[] = Array.isArray(campos_requeridos)
                ? campos_requeridos.map((c: string) => c.toLowerCase())
                : [];

            try {
                const user = await resolveUser(requestUser);
                console.log('[MCP] get_data_from_dashboard - usuario:', user?.email ?? user?._id ?? '(desconocido)');
                const baseUrl = getBaseUrl();

                // ── MODO DATOS: dashboard_id proporcionado ──────────────────────────────
                if (dashboard_id) {
                    console.log('[MCP] get_data_from_dashboard - MODO DATOS →', dashboard_id);

                    const { apiBase: dbApiBase, token: dbToken } = buildApiCall(user);
                    console.log('[MCP] MODO DATOS — GET', `${dbApiBase}/dashboard/${dashboard_id}`);
                    const dbResponse = await fetch(`${dbApiBase}/dashboard/${encodeURIComponent(dashboard_id)}?token=${dbToken}`);
                    if (!dbResponse.ok) {
                        console.warn('[MCP] MODO DATOS — acceso denegado:', dashboard_id, '| status:', dbResponse.status);
                        return { content: [{ type: 'text', text: `Dashboard no encontrado: ${dashboard_id}` }], isError: true };
                    }
                    const dbData: any = await dbResponse.json();
                    if (!dbData.ok) {
                        console.warn('[MCP] MODO DATOS — acceso denegado (ok:false):', dashboard_id);
                        return { content: [{ type: 'text', text: `Dashboard no encontrado: ${dashboard_id}` }], isError: true };
                    }
                    const db: any = dbData.dashboard;

                    const allPanels: any[] = Array.isArray(db.config?.panel) ? db.config.panel : [];
                    const dashboardLink = baseUrl ? `${baseUrl}/dashboard/${encodeURIComponent(dashboard_id)}` : '';
                    console.log('[MCP] get_data_from_dashboard - dashboard:', db.config?.title, '| panels total:', allPanels.length, '| panel_index solicitado:', panel_index ?? 'todos');

                    const accessibleDsIds = await getAccessibleDatasourceIds(user);
                    const visiblePanels = allPanels.filter((p: any) => {
                        if ((p.type ?? 0) !== 0) {
                            console.log(`[MCP] MODO DATOS — panel decorativo (type=${p.type}) omitido: ${p.title}`);
                            return false;
                        }
                        const mid = p.content?.query?.model_id;
                        if (!mid) return true;
                        const visible = accessibleDsIds.has(mid);
                        if (!visible) console.log(`[MCP] MODO DATOS — panel oculto (datasource NONE): ${p.title} | model_id=${mid}`);
                        return visible;
                    });

                    const panelsToRun = panel_index !== undefined
                        ? (visiblePanels[panel_index] ? [{ panel: visiblePanels[panel_index], idx: panel_index }] : [])
                        : visiblePanels.map((p, idx) => ({ panel: p, idx }));

                    const resultados: any[] = [];
                    const fallback = detectRankingIntent(question ?? '');
                    const rankIntent = {
                        direction: (ordenar_direccion ?? fallback.direction) as 'Asc' | 'Desc' | null,
                        topN:      limite_filas    ?? fallback.topN,
                        campo:     ordenar_campo   ?? null,
                    };
                    const rankSource = ordenar_direccion ? 'IA' : fallback.direction ? 'fallback' : 'ninguno';
                    console.log(`[MCP] ranking — fuente: ${rankSource} | direction: ${rankIntent.direction ?? 'none'} | topN: ${rankIntent.topN ?? 'none'} | campo: ${rankIntent.campo ?? 'auto'}`);

                    for (const { panel, idx } of panelsToRun) {
                        const query = panel.content?.query;
                        const innerFields: any[] = query?.query?.fields ?? [];
                        let fieldNames = innerFields.map((f: any) => f.display_name ?? f.field_name).filter(Boolean);
                        const activeFilters: any[] = query?.query?.filters ?? [];
                        const filterCols = [...new Set(activeFilters.map((f: any) => f.filter_column).filter(Boolean))];
                        const filterSummary = filterCols.length === 0
                            ? 'Sin filtros'
                            : `Filtros: ${filterCols.join(', ')}`;
                        const chartType = panel.content?.chart_type ?? panel.content?.edaChart ?? null;

                        console.log(`[MCP] panel ${idx} (${panel.title}) — model_id:`, query?.model_id ?? 'FALTA', '| fields:', innerFields.length, '| filtros:', activeFilters.length, '| description:', JSON.stringify(panel.description ?? null));

                        if (!query?.model_id || innerFields.length === 0) {
                            console.log(`[MCP] panel ${idx} — SALTADO (sin datasource o sin campos)`);
                            resultados.push({
                                panel_index: idx,
                                panel_titulo: panel.title ?? '(sin título)',
                                tipo: chartType,
                                campos: fieldNames,
                                filtros_activos: filterSummary,
                                error: 'Panel sin datasource o sin campos ejecutables',
                                datos: null,
                            });
                            continue;
                        }

                        try {
                            const modelId: string = query.model_id;
                            const innerQuery: any = JSON.parse(JSON.stringify(query.query));

                            // Filtrar campos con ia_visibility=NONE
                            try {
                                const dsDoc = await DataSource.findById(modelId).exec();
                                const filteredSchema = dsDoc ? filterDatasourceForAI(dsDoc) : null;
                                if (filteredSchema?.tables) {
                                    const allowedCols = new Set<string>(
                                        ([] as string[]).concat(
                                            ...(filteredSchema.tables as any[]).map((t: any) =>
                                                (t.columns ?? []).map((c: any) => c.column_name ?? c.name ?? '')
                                            )
                                        ).filter(Boolean)
                                    );
                                    const before: number = (innerQuery.fields ?? []).length;
                                    innerQuery.fields = (innerQuery.fields ?? []).filter((f: any) => {
                                        const fn: string = f.field_name ?? '';
                                        return !fn || allowedCols.has(fn);
                                    });
                                    const removed = before - innerQuery.fields.length;
                                    if (removed > 0) console.log(`[MCP] panel ${idx} — eliminados ${removed} campo(s) con ia_visibility=NONE`);
                                    if (innerQuery.fields.length === 0) throw new Error('ia_visibility=NONE: todos los campos del panel están ocultos a la IA');
                                    fieldNames = innerQuery.fields.map((f: any) => f.display_name ?? f.field_name).filter(Boolean);
                                }
                            } catch (schemaErr: any) {
                                if ((schemaErr.message ?? '').includes('ia_visibility=NONE')) throw schemaErr;
                                console.warn(`[MCP] panel ${idx} — no se pudo verificar ia_visibility de campos:`, schemaErr.message);
                            }

                            // Aplicar ordenación y límite si se detectó intent de ranking
                            if (rankIntent.direction) {
                                const qFields: any[] = innerQuery.fields ?? [];
                                let sortField: any = null;
                                if (rankIntent.campo) {
                                    const campoLow = rankIntent.campo.toLowerCase();
                                    sortField = qFields.find((f: any) =>
                                        (f.display_name ?? f.field_name ?? '').toLowerCase() === campoLow
                                    ) ?? qFields.find((f: any) =>
                                        (f.display_name ?? f.field_name ?? '').toLowerCase().includes(campoLow)
                                    );
                                }
                                if (!sortField) {
                                    sortField = qFields.find((f: any) =>
                                        f.aggregation_type && f.aggregation_type !== 'none' && f.aggregation_type !== 'No'
                                    );
                                }
                                if (!sortField && qFields.length > 0) sortField = qFields[qFields.length - 1];
                                if (sortField) {
                                    const sortName = sortField.display_name ?? sortField.field_name;
                                    sortField.ordenation_type = rankIntent.direction;
                                    const sortIdx = qFields.indexOf(sortField);
                                    if (sortIdx > 0) {
                                        qFields.splice(sortIdx, 1);
                                        qFields.unshift(sortField);
                                        innerQuery.fields = qFields;
                                    }
                                    if (rankIntent.topN) innerQuery.queryLimit = rankIntent.topN;
                                    const secondary = qFields.slice(1)
                                        .filter((f: any) => f.ordenation_type && f.ordenation_type !== 'No')
                                        .map((f: any) => `"${f.display_name ?? f.field_name}" ${f.ordenation_type}`)
                                        .join(', ');
                                    console.log(`[MCP] panel ${idx} — ORDER BY "${sortName}" ${rankIntent.direction}${secondary ? `, ${secondary}` : ''} | queryLimit:`, rankIntent.topN ?? '(sin cambio)');
                                }
                            }

                            // Aplicar overrides de agregación
                            if (sin_agregacion === true) {
                                (innerQuery.fields ?? []).forEach((f: any) => { f.aggregation_type = 'none'; });
                                innerQuery.queryLimit = 500;
                                console.log(`[MCP] panel ${idx} — sin_agregacion: todas las agregaciones eliminadas | queryLimit: 500`);
                            }

                            innerQuery.queryMode   = innerQuery.queryMode  ?? 'EDA';
                            innerQuery.rootTable   = innerQuery.queryMode === 'EDA2' ? (innerQuery.rootTable ?? '') : '';
                            innerQuery.joinType    = innerQuery.joinType   ?? 'inner';
                            innerQuery.forSelector = false;

                            const { apiBase, token: queryToken } = buildApiCall(user);
                            console.log(`[MCP] panel ${idx} — POST ${apiBase}/dashboard/query | model_id:`, modelId);
                            const queryResponse = await fetch(`${apiBase}/dashboard/query?token=${queryToken}`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    model_id: modelId,
                                    query: innerQuery,
                                    dashboard: { dashboard_id, panel_id: panel.id ?? '' },
                                }),
                            });
                            if (!queryResponse.ok) {
                                const errText = await queryResponse.text();
                                throw new Error(`/dashboard/query HTTP ${queryResponse.status}: ${errText.substring(0, 300)}`);
                            }
                            const queryData: any = await queryResponse.json();
                            const [responseLabels, responseRows] = Array.isArray(queryData) ? queryData : [[], []];
                            if (responseLabels?.[0] === 'noDataAllowed') {
                                throw new Error('El usuario no tiene permiso para ver los datos de este panel.');
                            }
                            const allRows: any[][] = Array.isArray(responseRows) ? responseRows.filter((r: any) => Array.isArray(r) && r.length > 0) : [];
                            const rows = allRows;
                            console.log(`[MCP] panel ${idx} — rows: ${allRows.length} (mostrando ${rows.length}) | labels: ${(responseLabels ?? []).join(', ')}`);

                            const displayNameMap = new Map<string, string>();
                            (innerQuery.fields ?? []).forEach((f: any) => {
                                const tech = f.field_name ?? f.column_name ?? '';
                                if (tech) displayNameMap.set(tech, f.display_name ?? f.field_name ?? tech);
                            });
                            const columnas: string[] = (responseLabels as string[]).map(
                                (lbl: string) => displayNameMap.get(lbl) ?? lbl
                            );

                            if (rows.length > 0) {
                                resultados.push({
                                    panel_index: idx,
                                    panel_titulo: panel.title ?? '(sin título)',
                                    tipo: chartType,
                                    campos: columnas,
                                    filtros_activos: filterSummary,
                                    tiene_filtros: activeFilters.length > 0,
                                    modelo_datos: accessibleDsIds.get(modelId) ?? modelId,
                                    datos: { columnas, filas: rows, total_filas: allRows.length, truncado: allRows.length > 10 },
                                });
                            } else {
                                resultados.push({
                                    panel_index: idx,
                                    panel_titulo: panel.title ?? '(sin título)',
                                    tipo: chartType,
                                    campos: fieldNames,
                                    filtros_activos: filterSummary,
                                    datos: null,
                                    mensaje: 'Sin resultados',
                                });
                            }
                        } catch (qErr: any) {
                            console.error(`[MCP] panel ${idx} — ERROR:`, qErr.message);
                            resultados.push({
                                panel_index: idx,
                                panel_titulo: panel.title ?? '(sin título)',
                                campos: fieldNames,
                                filtros_activos: filterSummary,
                                error: qErr.message,
                                datos: null,
                            });
                        }
                    }

                    const respuesta = {
                        fuente: {
                            dashboard_id,
                            dashboard_nombre: db.config?.title ?? '(sin título)',
                            dashboard_url: dashboardLink,
                        },
                        pregunta: question,
                        panels: resultados,
                    };

                    console.log('[MCP] MODO DATOS finalizado | panels ejecutados:', resultados.length, '| chars:', JSON.stringify(respuesta).length);
                    return { content: [{ type: 'text', text: JSON.stringify(respuesta) }] };
                }

                // ── MODO FALLBACK: datasource_id sin dashboard_id ──────────────────────
                if (datasource_id) {
                    console.log('[MCP][FALLBACK] ═══════════════════════════════════════');
                    console.log('[MCP][FALLBACK] INICIO MODO FALLBACK');
                    console.log('[MCP][FALLBACK] datasource_id:', datasource_id);
                    console.log('[MCP][FALLBACK] question:', question);
                    console.log('[MCP][FALLBACK] campos_consulta recibidos:', JSON.stringify(campos_consulta));

                    const accessibleDsFb = await getAccessibleDatasourceIds(user);
                    const hasAccess = accessibleDsFb.has(datasource_id);
                    console.log('[MCP][FALLBACK] datasources accesibles:', accessibleDsFb.size, '| tiene acceso a datasource_id:', hasAccess);
                    if (!hasAccess) {
                        console.log('[MCP][FALLBACK] ERROR: datasource no accesible o no encontrado');
                        return { content: [{ type: 'text', text: `Datasource no encontrado o sin acceso: ${datasource_id}` }], isError: true };
                    }

                    const dsDoc = await DataSource.findById(datasource_id).exec();
                    console.log('[MCP][FALLBACK] dsDoc encontrado:', !!dsDoc, '| nombre:', (dsDoc as any)?.ds?.metadata?.model_name ?? '(sin nombre)');
                    const filteredSchema = dsDoc ? filterDatasourceForAI(dsDoc) : null;
                    console.log('[MCP][FALLBACK] filteredSchema:', filteredSchema ? `OK (${filteredSchema.tables?.length ?? 0} tablas)` : 'NULL');
                    if (!filteredSchema) {
                        return { content: [{ type: 'text', text: `Datasource ${datasource_id} no disponible o excluido (ia_visibility: NONE).` }], isError: true };
                    }

                    console.log('[MCP][FALLBACK] tablas en schema:');
                    (filteredSchema.tables ?? []).forEach((t: any, ti: number) => {
                        const cols = (t.columns ?? []).map((c: any) => c.column_name ?? c.name ?? '(?)');
                        console.log(`[MCP][FALLBACK]   tabla[${ti}] name="${t.table_name ?? t.name}" | ${cols.length} cols: [${cols.join(', ')}]`);
                    });

                    const allCols: any[] = (filteredSchema.tables ?? []).flatMap((t: any) =>
                        (t.columns ?? []).map((c: any) => ({ ...c, _table: t.table_name ?? t.name ?? '' }))
                    );
                    console.log('[MCP][FALLBACK] allCols total:', allCols.length, '| ejemplos:', allCols.slice(0, 5).map((c: any) => `${c.column_name ?? c.name}@${c._table}`).join(', '));

                    const camposConsulta: string[] = Array.isArray(campos_consulta) && campos_consulta.length > 0
                        ? campos_consulta
                        : (() => {
                            const qWords = (question ?? '').toLowerCase().split(/\s+/).filter((w: string) => w.length >= 3);
                            const scored = allCols.map((c: any) => {
                                const name = (c.column_name ?? c.name ?? '').toLowerCase();
                                const desc = (c.description?.default ?? c.description ?? '').toLowerCase();
                                const hits = qWords.filter((w: string) => name.includes(w) || desc.includes(w)).length;
                                return { name: c.column_name ?? c.name ?? '', score: hits };
                            }).filter(x => x.name);
                            scored.sort((a, b) => b.score - a.score);
                            return scored.slice(0, 10).map(x => x.name);
                        })();

                    console.log('[MCP][FALLBACK] camposConsulta efectivos:', JSON.stringify(camposConsulta));

                    const selectedCols = camposConsulta
                        .map(cn => {
                            const found = allCols.find((c: any) => (c.column_name ?? c.name) === cn);
                            if (!found) console.log(`[MCP][FALLBACK]   campo "${cn}" → NO ENCONTRADO en allCols`);
                            else console.log(`[MCP][FALLBACK]   campo "${cn}" → encontrado en tabla "${found._table}" | column_type=${found.column_type ?? found.type}`);
                            return found;
                        })
                        .filter(Boolean);

                    console.log('[MCP][FALLBACK] selectedCols count:', selectedCols.length, '/', camposConsulta.length);

                    if (selectedCols.length === 0) {
                        console.log('[MCP][FALLBACK] ERROR: 0 columnas seleccionadas — fallback sin columnas válidas');
                        const allColNames = allCols.map((c: any) => c.column_name ?? c.name).join(', ');
                        console.log('[MCP][FALLBACK] columnas disponibles en datasource:', allColNames);
                        return { content: [{ type: 'text', text: `No se encontraron columnas válidas en el datasource ${datasource_id} para: [${camposConsulta.join(', ')}]. Columnas disponibles: [${allColNames}]` }], isError: true };
                    }

                    const tableGroups = new Map<string, any[]>();
                    for (const col of selectedCols) {
                        const t = col._table || '';
                        if (!tableGroups.has(t)) tableGroups.set(t, []);
                        tableGroups.get(t)!.push(col);
                    }
                    let singleTableCols = selectedCols;
                    let bestCount = 0;
                    for (const [tname, cols] of tableGroups) {
                        console.log(`[MCP][FALLBACK] tabla "${tname}": ${cols.length} cols seleccionadas`);
                        if (cols.length > bestCount) { bestCount = cols.length; singleTableCols = cols; }
                    }
                    console.log('[MCP][FALLBACK] tabla ganadora:', singleTableCols[0]?._table, '| cols:', singleTableCols.map((c: any) => c.column_name ?? c.name).join(', '));

                    const queryFields = singleTableCols.map((col: any, idx: number) => ({
                        field_name:             col.column_name ?? col.name,
                        column_name:            col.column_name ?? col.name,
                        column_type:            col.column_type ?? col.type ?? 'text',
                        table_id:               col._table ?? '',
                        display_name:           (typeof col.display_name === 'string' ? col.display_name : col.display_name?.default) ?? col.column_name ?? col.name,
                        aggregation_type:       'none',
                        minimumFractionDigits:  col.minimumFractionDigits ?? 0,
                        order:                  idx,
                        format:                 'No',
                        cumulativeSum:          false,
                        ordenation:             'ASC',
                    }));

                    const rootTable = (singleTableCols[0]?._table ?? '') || (queryFields[0]?.table_id ?? '');
                    const fallbackQuery = {
                        queryMode:   'EDA',
                        rootTable,
                        joinType:    'inner',
                        forSelector: false,
                        fields:      queryFields,
                        filters:     [],
                        order:       [],
                        limit:       1000,
                    };

                    const { apiBase: fbApiBase, token: fbToken } = buildApiCall(user);
                    console.log('[MCP][FALLBACK] rootTable:', rootTable);
                    console.log('[MCP][FALLBACK] queryFields:', JSON.stringify(queryFields));
                    console.log('[MCP][FALLBACK] query completo enviado:', JSON.stringify({ model_id: datasource_id, query: fallbackQuery }));
                    console.log(`[MCP][FALLBACK] POST ${fbApiBase}/dashboard/query`);

                    const fbResponse = await fetch(`${fbApiBase}/dashboard/query?token=${fbToken}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ model_id: datasource_id, query: fallbackQuery, dashboard: { dashboard_id: null, panel_id: '' } }),
                    });
                    console.log('[MCP][FALLBACK] HTTP status:', fbResponse.status, fbResponse.statusText);
                    if (!fbResponse.ok) {
                        const errText = await fbResponse.text();
                        console.log('[MCP][FALLBACK] ERROR HTTP:', errText.substring(0, 500));
                        throw new Error(`/dashboard/query HTTP ${fbResponse.status}: ${errText.substring(0, 300)}`);
                    }
                    const fbData: any = await fbResponse.json();
                    console.log('[MCP][FALLBACK] respuesta raw (primeros 500 chars):', JSON.stringify(fbData).substring(0, 500));
                    const [fbLabels, fbRows] = Array.isArray(fbData) ? fbData : [[], []];
                    console.log('[MCP][FALLBACK] fbLabels:', JSON.stringify(fbLabels));
                    console.log('[MCP][FALLBACK] fbRows tipo:', typeof fbRows, Array.isArray(fbRows) ? `(array de ${fbRows.length})` : '');
                    if (Array.isArray(fbRows) && fbRows.length > 0) {
                        console.log('[MCP][FALLBACK] primera fila:', JSON.stringify(fbRows[0]));
                    }
                    if (fbLabels?.[0] === 'noDataAllowed') {
                        console.log('[MCP][FALLBACK] noDataAllowed — sin permisos');
                        return { content: [{ type: 'text', text: 'El usuario no tiene permiso para ver los datos de este modelo de datos.' }], isError: true };
                    }
                    const allFbRows: any[][] = Array.isArray(fbRows) ? fbRows.filter((r: any) => Array.isArray(r) && r.length > 0) : [];
                    const rows = allFbRows.slice(0, 10);
                    const displayMap = new Map<string, string>();
                    queryFields.forEach((f: any) => { if (f.field_name) displayMap.set(f.field_name, f.display_name ?? f.field_name); });
                    const columnas: string[] = (fbLabels as string[]).map((lbl: string) => displayMap.get(lbl) ?? lbl);

                    const baseUrlFb = getBaseUrl();
                    const dsUrl = baseUrlFb ? `${baseUrlFb}/data-source/${encodeURIComponent(datasource_id)}` : '';

                    const respuestaFallback = {
                        fuente: {
                            tipo:               'datasource_directo',
                            datasource_id,
                            datasource_nombre:  filteredSchema.model_name ?? datasource_id,
                            datasource_url:     dsUrl,
                        },
                        pregunta: question,
                        datos: rows.length > 0 ? { columnas, filas: rows, total_filas: allFbRows.length, truncado: allFbRows.length > 10 } : null,
                        mensaje: rows.length === 0 ? 'Sin resultados' : undefined,
                    };

                    console.log('[MCP][FALLBACK] RESULTADO: rows totales:', allFbRows.length, '| mostrando:', rows.length, '| columnas:', columnas.join(', '));
                    console.log('[MCP][FALLBACK] ═══════════════════════════════════════');
                    return { content: [{ type: 'text', text: JSON.stringify(respuestaFallback) }] };
                }

                // ── MODO EXPLORACIÓN: sin dashboard_id ─────────────────────────────────
                console.log('[MCP] get_data_from_dashboard - MODO EXPLORACIÓN');
                const { privados, grupo, comunes, publicos } = await getAllDashboards(user._id.toString());
                const allDashboards = [...privados, ...grupo, ...comunes, ...publicos];
                console.log('[MCP] exploración — dashboards:', allDashboards.length);

                const accessibleDsIds = await getAccessibleDatasourceIds(user);
                console.log('[MCP] exploración — datasources accesibles:', accessibleDsIds.size);

                const dsSchemaCache = new Map<string, any>();
                const getDsSchema = async (modelId: string): Promise<any> => {
                    if (dsSchemaCache.has(modelId)) return dsSchemaCache.get(modelId);
                    try {
                        const dsDoc = await DataSource.findById(modelId).exec();
                        const filtered = dsDoc ? filterDatasourceForAI(dsDoc) : null;
                        dsSchemaCache.set(modelId, filtered);
                        return filtered;
                    } catch {
                        dsSchemaCache.set(modelId, null);
                        return null;
                    }
                };

                const visibleColsCache = new Map<string, Set<string> | null>();
                const getVisibleCols = async (modelId: string): Promise<Set<string> | null> => {
                    if (visibleColsCache.has(modelId)) return visibleColsCache.get(modelId)!;
                    const schema = await getDsSchema(modelId);
                    if (!schema?.tables) { visibleColsCache.set(modelId, null); return null; }
                    const cols = new Set<string>(
                        ([] as string[]).concat(
                            ...(schema.tables as any[]).map((t: any) =>
                                (t.columns ?? []).map((c: any) => c.column_name ?? c.name ?? '')
                            )
                        ).filter(Boolean)
                    );
                    visibleColsCache.set(modelId, cols);
                    return cols;
                };

                const fullDashboards = await Promise.all(
                    allDashboards.map((d: any) => Dashboard.findById(d._id).exec())
                );

                const opcionesMap = new Map<string, any>();

                for (let di = 0; di < allDashboards.length; di++) {
                    const d = allDashboards[di];
                    const db: any = fullDashboards[di];
                    if (!db) continue;
                    const panels: any[] = Array.isArray(db.config?.panel) ? db.config.panel : [];
                    const dashboardLink = baseUrl ? `${baseUrl}/dashboard/${encodeURIComponent(d._id)}` : '';

                    for (let idx = 0; idx < panels.length; idx++) {
                        const panel = panels[idx];

                        if ((panel.type ?? 0) !== 0) {
                            console.log(`[META] dashboard="${db.config?.title}" idx=${idx} title="${panel.title ?? '(sin titulo)'}" → SALTADO (panel decorativo type=${panel.type})`);
                            continue;
                        }

                        const query = panel.content?.query;
                        const fields: any[] = query?.query?.fields ?? [];

                        const rawPanelDescEarly = panel.description ?? panel.content?.description ?? '';
                        console.log(`[META] dashboard="${db.config?.title}" idx=${idx} title="${panel.title ?? '(sin titulo)'}"`);
                        console.log(`[META]   model_id=${query?.model_id ?? 'FALTA'} | fields=${fields.length}`);
                        console.log(`[META]   description raw type="${typeof rawPanelDescEarly}" value=${JSON.stringify(rawPanelDescEarly).substring(0, 120)}`);
                        console.log(`[META]   content.description type="${typeof panel.content?.description}" value=${JSON.stringify(panel.content?.description ?? null).substring(0, 80)}`);
                        console.log(`[META]   field_names=[${fields.map((f: any) => f.display_name ?? f.field_name).filter(Boolean).join(', ')}]`);

                        if (!query?.model_id || fields.length === 0) {
                            console.log(`[META]   → SALTADO (sin model_id o sin fields)`);
                            continue;
                        }

                        if (!accessibleDsIds.has(query.model_id)) {
                            console.log(`[META]   → SALTADO (datasource sin acceso) | model_id=${query.model_id}`);
                            continue;
                        }

                        const dsSchema = await getDsSchema(query.model_id);
                        const visibleCols = await getVisibleCols(query.model_id);

                        const visibleFields = visibleCols
                            ? fields.filter((f: any) => {
                                const fn: string = f.field_name ?? '';
                                return !fn || visibleCols.has(fn);
                            })
                            : fields;
                        if (visibleFields.length === 0) {
                            console.log(`[META]   → SALTADO (todos los campos son ia_visibility=NONE)`);
                            continue;
                        }

                        const fieldNames = visibleFields.map((f: any) => f.display_name ?? f.field_name).filter(Boolean);

                        const camposDescripciones: string[] = [];
                        const tablasDescripciones: string[] = [];
                        const tablasVistas = new Set<string>();
                        for (const f of visibleFields) {
                            const techName: string = f.field_name ?? '';
                            if (!dsSchema?.tables) break;
                            for (const table of dsSchema.tables) {
                                const col = (table.columns ?? []).find((c: any) =>
                                    (c.column_name ?? c.name) === techName
                                );
                                if (col) {
                                    const colDesc: string = col.description?.default ?? col.description ?? '';
                                    if (colDesc) camposDescripciones.push(colDesc);
                                    const tableName: string = table.table_name ?? table.name ?? '';
                                    if (tableName && !tablasVistas.has(tableName)) {
                                        tablasVistas.add(tableName);
                                        const tableDesc: string = table.description?.default ?? table.description ?? '';
                                        if (tableDesc) tablasDescripciones.push(tableDesc);
                                    }
                                    break;
                                }
                            }
                        }

                        console.log(`[META]   col_descs=[${camposDescripciones.map(d => `"${d.substring(0,40)}"`).join(', ')}]`);
                        console.log(`[META]   table_descs=[${tablasDescripciones.map(d => `"${d.substring(0,40)}"`).join(', ')}]`);

                        const rawPanelDesc = panel.description ?? panel.content?.description ?? '';
                        const panelDescStr: string = typeof rawPanelDesc === 'string' ? rawPanelDesc : (rawPanelDesc?.default ?? '');
                        console.log(`[META]   panelDescStr="${panelDescStr.substring(0, 100)}"`);
                        if (camposLower.length > 0) {
                            const fieldNamesLower = fieldNames.map((n: string) => n.toLowerCase());
                            const allDescText = [...camposDescripciones, ...tablasDescripciones].join(' ').toLowerCase();
                            const panelTitleLower = (panel.title ?? '').toLowerCase();
                            const panelDescLower = panelDescStr.toLowerCase();
                            const dashboardNameLower = (db.config?.title ?? '').toLowerCase();
                            let matchCount = 0;
                            for (const kw of camposLower) {
                                const inField      = fieldNamesLower.some((fn: string) => fn.includes(kw));
                                const inColDesc    = allDescText.includes(kw);
                                const inPanelTitle = panelTitleLower.includes(kw);
                                const inPanelDesc  = panelDescLower.includes(kw);
                                const inDashboard  = dashboardNameLower.includes(kw);
                                const matched = inField || inColDesc || inPanelTitle || inPanelDesc || inDashboard;
                                if (matched) matchCount++;
                                console.log(`[META]   kw="${kw}" → field:${inField} colDesc:${inColDesc} panelTitle:${inPanelTitle} panelDesc:${inPanelDesc} dashboard:${inDashboard} ✔:${matched}`);
                            }
                            const matchRatio = matchCount / camposLower.length;
                            if (matchRatio < 0.5) {
                                console.log(`[META]   → SALTADO por pre-filtro (${(matchRatio*100).toFixed(0)}% < 50%) | dashboard=${db.config?.title}, idx=${idx}`);
                                continue;
                            }
                            console.log(`[META]   → PASA pre-filtro (${(matchRatio*100).toFixed(0)}%) | dashboard=${db.config?.title}, idx=${idx}`);
                        }

                        const activeFilters: any[] = query?.query?.filters ?? [];

                        const fieldsKey = [...fieldNames].sort().join(',');
                        const filterKey = JSON.stringify(
                            activeFilters.map((f: any) => ({
                                col:  f.filter_column,
                                type: f.filter_type,
                                vals: (f.filter_elements ?? []).flatMap((e: any) => Array.isArray(e.value1) ? e.value1 : [e.value1]).sort(),
                            })).sort((a: any, b: any) => a.col.localeCompare(b.col))
                        );
                        const dedupeKey = `${fieldsKey}__${filterKey}`;

                        if (!opcionesMap.has(dedupeKey)) {
                            const filterCols = [...new Set(activeFilters.map((f: any) => f.filter_column).filter(Boolean))];
                            const alcance = activeFilters.length === 0
                                ? 'Sin filtros'
                                : `Filtros: ${filterCols.join(', ')}`;

                            opcionesMap.set(dedupeKey, {
                                dashboard_id:          d._id.toString(),
                                dashboard_url:         dashboardLink,
                                dashboard_nombre:      db.config?.title ?? '(sin título)',
                                dashboard_autor:       db.config?.author ?? null,
                                dashboard_creado:      db.config?.createdAt ?? null,
                                dashboard_modificado:  db.config?.modifiedAt ?? null,
                                panel_index:           idx,
                                panel_titulo:          panel.title ?? '',
                                panel_descripcion:     panelDescStr,
                                datasource_nombre:     accessibleDsIds.get(query.model_id) ?? null,
                                campos:                fieldNames,
                                campos_descripciones:  camposDescripciones,
                                tablas_descripciones:  tablasDescripciones,
                                tiene_filtros:         activeFilters.length > 0,
                                alcance,
                            });
                            console.log(`[MCP] exploración — nueva opción única [${opcionesMap.size}]: dashboard="${db.config?.title}" | panel="${panel.title}" | description=${JSON.stringify(panel.description ?? null)} | alcance=${alcance}`);
                        } else {
                            console.log(`[MCP] exploración — panel duplicado saltado (mismo datasource+filtros): dashboard=${db.config?.title}, panel=${idx}`);
                        }
                    }
                }

                const MAX_OPTIONS = 5;

                const questionWords = (question ?? '').toLowerCase().split(/\s+/).filter((w: string) => w.length >= 3);
                const normQ = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
                const fuzzyContains = (haystack: string, needle: string): boolean => {
                    const nh = normQ(haystack); const nn = normQ(needle);
                    return nh.includes(nn) || nn.includes(nh);
                };
                const kwMatch = (text: string): number => {
                    if (!text || camposLower.length === 0) return 0;
                    return camposLower.filter(kw => fuzzyContains(text, kw)).length / camposLower.length;
                };
                const questionMatch = (text: string): number => {
                    if (!text || questionWords.length === 0) return 0;
                    return questionWords.filter((w: string) => fuzzyContains(text, w)).length / questionWords.length;
                };
                const scoreOption = (o: any): number => {
                    if (camposLower.length === 0) {
                        const titleQ = questionMatch(o.panel_titulo ?? '');
                        const descQ  = questionMatch(o.panel_descripcion ?? '');
                        const dashQ  = questionMatch(o.dashboard_nombre ?? '');
                        const textScore = titleQ * 3 + descQ * 2.5 + dashQ * 1.5;
                        const noFilterBonus = (textScore > 0 && !o.tiene_filtros) ? 0.1 : 0;
                        return textScore + noFilterBonus;
                    }
                    const fieldNamesLower: string[] = (o.campos as string[]).map((n: string) => n.toLowerCase());
                    const titleScore      = kwMatch(o.panel_titulo ?? '');
                    const datasourceScore = kwMatch(o.datasource_nombre ?? '');
                    const dashboardScore  = kwMatch(o.dashboard_nombre ?? '');
                    const descriptionScore = kwMatch(o.panel_descripcion ?? '');
                    const fieldDescScore  = kwMatch((o.campos_descripciones ?? []).join(' '));
                    const tableDescScore  = kwMatch((o.tablas_descripciones ?? []).join(' '));
                    const exactFieldScore = camposLower.filter(kw =>
                        fieldNamesLower.some(fn => fn === kw)
                    ).length / camposLower.length;
                    const coveredFields = fieldNamesLower.filter(fn =>
                        camposLower.some(kw => fn.includes(kw))
                    ).length;
                    const fieldPrecision = fieldNamesLower.length > 0 ? coveredFields / fieldNamesLower.length : 0;
                    const textTotal = descriptionScore * 4 + titleScore * 3 + fieldDescScore * 2.5 + tableDescScore * 2 + datasourceScore * 2 + dashboardScore * 1.5 + exactFieldScore * 2 + fieldPrecision;
                    const noFilterBonus = (textTotal > 0 && !o.tiene_filtros) ? 0.2 : 0;
                    return textTotal + noFilterBonus;
                };

                const scored = Array.from(opcionesMap.values()).map(o => ({ o, s: scoreOption(o) }));
                scored.sort((a, b) => b.s - a.s);

                console.log('[MCP] exploración — questionWords:', questionWords, '| camposLower:', camposLower);
                console.log('[MCP] exploración — opciones totales antes de scoring:', scored.length);
                scored.forEach(({ o, s }) => {
                    console.log(`[MCP] exploración — score=${s.toFixed(3)} | dashboard="${o.dashboard_nombre}" | panel="${o.panel_titulo}" | campos=[${(o.campos ?? []).join(', ')}] | datasource="${o.datasource_nombre}"`);
                });

                const maxScore = scored.length > 0 ? scored[0].s : 0;
                let opcionesArr = maxScore > 0
                    ? scored.filter(x => x.s > 0).map(x => x.o)
                    : scored.map(x => x.o);

                const sinResultadosRelevantes = maxScore === 0 && (camposLower.length > 0 || questionWords.length >= 2);
                console.log('[MCP] exploración — maxScore:', maxScore, '| sinResultadosRelevantes:', sinResultadosRelevantes);
                if (sinResultadosRelevantes) {
                    console.log('[MCP] exploración — sin resultados relevantes (maxScore=0), activando fallback hacia datasource | opciones descartadas:', scored.length);
                    opcionesArr = [];
                }

                const totalOpciones = opcionesArr.length;
                const truncada = opcionesArr.length > MAX_OPTIONS;
                opcionesArr = opcionesArr.slice(0, MAX_OPTIONS).map((o, i) => {
                    const { campos_descripciones: _cd, tablas_descripciones: _td, ...rest } = o;
                    return { ...rest, opcion_num: i + 1 };
                });
                console.log('[MCP] MODO EXPLORACIÓN finalizado | opciones únicas:', totalOpciones, truncada ? `(top ${MAX_OPTIONS} por relevancia)` : '');

                let fallbackSugerencias: any[] = [];
                if (opcionesArr.length === 0) {
                    const fallbackTerms = camposLower.length > 0
                        ? camposLower
                        : questionWords.filter((w: string) => w.length >= 4);
                    console.log('[MCP] fallback — iniciando búsqueda | términos:', fallbackTerms, '| datasources a revisar:', accessibleDsIds.size);
                    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
                    const stem = (s: string) => {
                        if (s.length > 6 && s.endsWith('es')) return s.slice(0, -2);
                        if (s.length > 5 && s.endsWith('s'))  return s.slice(0, -1);
                        return s;
                    };
                    const flexMatch = (a: string, b: string): boolean => {
                        const na = norm(a); const nb = norm(b);
                        if (na.includes(nb) || nb.includes(na)) return true;
                        const sa = stem(na); const sb = stem(nb);
                        return sa.includes(sb) || sb.includes(sa);
                    };
                    const normTerms = fallbackTerms.map(norm);
                    console.log('[MCP] fallback — términos normalizados:', normTerms);
                    for (const [dsId, dsName] of accessibleDsIds) {
                        const schema = await getDsSchema(dsId);
                        if (!schema?.tables) {
                            console.log('[MCP] fallback — ds sin schema saltado:', dsName);
                            continue;
                        }
                        const allDsCols: string[] = ([] as string[]).concat(
                            ...(schema.tables as any[]).map((t: any) =>
                                (t.columns ?? []).map((c: any) => c.column_name ?? c.name ?? '') as string[]
                            )
                        ).filter(Boolean);
                        const allTableNames: string[] = (schema.tables as any[])
                            .map((t: any) => t.table_name ?? t.name ?? '').filter(Boolean);
                        const dsNameMatch    = fallbackTerms.some((kw: string) => flexMatch(dsName, kw));
                        const matchingCols   = fallbackTerms.length > 0 ? allDsCols.filter(cn => fallbackTerms.some((kw: string) => flexMatch(cn, kw))) : [];
                        const matchingTables = fallbackTerms.length > 0 ? allTableNames.filter(tn => fallbackTerms.some((kw: string) => flexMatch(tn, kw))) : [];
                        const tableMatch     = matchingTables.length > 0;
                        const coveredTermCount = fallbackTerms.filter((kw: string) =>
                            allDsCols.some(cn => flexMatch(cn, kw)) ||
                            allTableNames.some(tn => flexMatch(tn, kw)) ||
                            flexMatch(dsName, kw)
                        ).length;
                        const requiredMatches = Math.max(1, Math.ceil(fallbackTerms.length / 2));
                        console.log(`[MCP] fallback — ds "${dsName}" | dsNameMatch:${dsNameMatch} | tablas: [${allTableNames.join(', ')}] | cols match: [${matchingCols.join(', ')}] | table match: [${matchingTables.join(', ')}] | covered: ${coveredTermCount}/${fallbackTerms.length} (req: ${requiredMatches})`);
                        if ((matchingCols.length > 0 || tableMatch || dsNameMatch) && coveredTermCount >= requiredMatches) {
                            const relevantCols = matchingCols.length > 0 ? matchingCols : allDsCols.slice(0, 5);
                            console.log(`[MCP] fallback — ✓ ds "${dsName}" incluido | cols relevantes: [${relevantCols.slice(0, 8).join(', ')}]`);
                            fallbackSugerencias.push({ datasource_id: dsId, datasource_nombre: dsName, campos_relevantes: relevantCols.slice(0, 8) });
                        } else if (matchingCols.length > 0 || tableMatch || dsNameMatch) {
                            console.log(`[MCP] fallback — ✗ ds "${dsName}" descartado (cobertura insuficiente: ${coveredTermCount} < ${requiredMatches} términos)`);
                        }
                    }
                    fallbackSugerencias = fallbackSugerencias.slice(0, 2);
                    console.log('[MCP] fallback — resultado final:', fallbackSugerencias.length, 'sugerencias:', fallbackSugerencias.map((s: any) => s.datasource_nombre));
                }

                const buildFallbackNota = () => fallbackSugerencias.length > 0
                    ? `ACCIÓN OBLIGATORIA — Llama AHORA MISMO a get_data_from_dashboard con datasource_id="${fallbackSugerencias[0].datasource_id}" y campos_consulta=${JSON.stringify(fallbackSugerencias[0].campos_relevantes)}. NO preguntes al usuario, NO pidas confirmación, actúa directamente. Si la consulta devuelve datos, preséntaselos como respuesta normal sin mencionar que fue una búsqueda directa, sin comentar la calidad de los datos, sin preguntas adicionales. Si devuelve null o 0 filas, responde ÚNICAMENTE con una sola frase en el idioma del usuario diciendo que no hay datos disponibles. Nada más.`
                    : '';
                const notaSinResultados = opcionesArr.length > 0 ? '' : fallbackSugerencias.length > 0
                    ? buildFallbackNota()
                    : camposLower.length > 0
                        ? `No se han encontrado paneles con los campos [${camposLower.join(', ')}]. OBLIGATORIO: llama de nuevo a este tool SIN campos_requeridos. Si el resultado sigue siendo 0 opciones, responde ÚNICAMENTE con una sola frase en el idioma del usuario diciendo que no hay datos disponibles. PROHIBIDO ABSOLUTO: no ofrezcas alternativas, no sugiereas verificar nada, no menciones dashboards ni bases de datos, no añadas ninguna frase adicional.`
                        : `Responde ÚNICAMENTE con una sola frase en el idioma del usuario diciendo que no hay datos disponibles sobre su pregunta. PROHIBIDO ABSOLUTO: no ofrezcas alternativas, no sugiereas verificar nada, no menciones dashboards ni bases de datos, no añadas ninguna frase adicional.`;
                const notaTruncada = truncada ? ` AVISO: se muestran las ${MAX_OPTIONS} opciones más relevantes de ${totalOpciones} encontradas. El resto fueron descartadas por menor relevancia.` : '';

                const respuestaExploracion: any = {
                    pregunta: question,
                    opciones_unicas: opcionesArr,
                    ...(fallbackSugerencias.length > 0 ? { fallback_sugerencias: fallbackSugerencias } : {}),
                    nota_al_asistente: opcionesArr.length === 0
                        ? notaSinResultados
                        : opcionesArr.length === 1
                            ? 'Hay exactamente UNA opción. OBLIGATORIO: llama AHORA MISMO a get_data_from_dashboard en modo datos con el dashboard_id y panel_index de esta opción. NO preguntes al usuario, NO esperes confirmación.' + notaTruncada
                            : `Hay ${opcionesArr.length} opciones en total. IMPORTANTE: muestra al usuario SOLO las opciones cuyo dashboard_nombre o panel_titulo estén relacionados con la pregunta "${question}". Si una opción claramente no tiene relación con la pregunta (ej: pregunta sobre agua pero la opción es de ventas), NO la incluyas en la lista. Preséntaselas numeradas en prosa fluida con el link del dashboard, destacando la diferencia clave entre ellas (con/sin filtros, distintos alcances). Si tras filtrar queda solo 1 opción relevante, ve directamente al PASO 3 sin preguntar. Espera la selección del usuario ANTES de ejecutar el modo datos cuando haya varias relevantes.` + notaTruncada,
                };

                return { content: [{ type: 'text', text: JSON.stringify(respuestaExploracion) }] };

            } catch (err: any) {
                console.error('[MCP] get_data_from_dashboard error:', err.message, err.stack);
                return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
            }
        }
    );
    console.log('[MCP] createMcpServer - get_data_from_dashboard registrado');
    console.log('[MCP] createMcpServer - server_status registrado. Total tools: 5');

    return server;
}
