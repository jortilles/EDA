import * as path from 'path';
import Dashboard from '../dashboard/model/dashboard.model';
import User from '../admin/users/model/user.model';
import Group from '../admin/groups/model/group.model';

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const SEED   = require('../../../config/seed').SEED;

const LOCALES = ['/es', '/ca', '/en', '/pl', '/fr'];
const { MCP_EMAIL, MCP_PASSWORD} = getAnthropicConfig();

// ============================================================
// CONFIGURACIÓN
// ============================================================

export function getAnthropicConfig() {
    const configPath = path.resolve(__dirname, '../../../config/ai.config.js');
    console.log(configPath);
    delete require.cache[require.resolve(configPath)];
    return require(configPath);
}

export function getBaseUrl(): string {
    const { EDA_APP_URL } = getAnthropicConfig();
    if (!EDA_APP_URL) return '';
    const hasLocale = LOCALES.some(l => EDA_APP_URL.includes(l));
    return hasLocale ? EDA_APP_URL : `${EDA_APP_URL}/es/#`;
}

// ============================================================
// TIPOS E INTERFACES
// ============================================================

export interface ToolResponse {
    data: any[];
    opciones_unicas: Array<{opcion_num: number; dashboard_nombre: string; panel_titulo: string; tiene_filtros?: boolean; datasource_id?: string; dashboard_id?: string; panel_index?: number;}>;
    fallback_sugerencias: any[];
    error: string | null;
    filters_applied: Record<string, any>;
    raw_text: string;
}

export interface ChatContext {
    requestId: string;
    userId: string;
    userEmail: string;
    userRole: string;
    query: string;
    startTime: Date;
    selectedDashboards: string[];
    appliedFilters: Record<string, any>;
    toolsCalled: Array<{name: string; params: any; success: boolean; duration: number; retries: number; error?: string;}>;
    responseGenerated: boolean;
    totalDuration: number;
}

// ============================================================
// CONTEXTO DE CHAT
// ============================================================

export function parseToolResponse(resultText: string): ToolResponse {
    const response: ToolResponse = {data: [], opciones_unicas: [], fallback_sugerencias: [], error: null, filters_applied: {}, raw_text: resultText};
    if (!resultText || resultText.trim() === '') {response.error = 'Respuesta vacía del tool'; return response;}
    try {
        const parsed = JSON.parse(resultText);
        if (Array.isArray(parsed.opciones_unicas)) {response.opciones_unicas = parsed.opciones_unicas.filter((o: any) => o.opcion_num && (o.dashboard_nombre || o.dashboard_id) && (o.panel_titulo || o.panel_index !== undefined));}
        if (Array.isArray(parsed.fallback_sugerencias)) {response.fallback_sugerencias = parsed.fallback_sugerencias.filter((s: any) => s.datasource_id && (s.campos_relevantes || s.nombre));}
        response.data = parsed.data || [];
        response.filters_applied = parsed.filters_applied || {};
        response.error = parsed.error || null;
        if (response.data.length === 0 && !response.error) {response.error = 'Sin datos para los parámetros especificados';}
    } catch (parseErr: any) {response.error = `Error parseando: ${parseErr.message}`;}
    return response;
}

export function extractTextContent(result: any): string {
    try {
        if (!result || !result.content) return '';
        const textContent = (result.content as any[]).filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n').trim();
        if (!textContent) return JSON.stringify({error: 'Empty response'});
        return textContent;
    } catch (err: any) {return JSON.stringify({error: `Extraction failed: ${err.message}`});}
}

export function calculateDynamicTimeout(params: any): number {
    let timeout = 30_000;
    if (params.filters && Object.keys(params.filters).length > 2) timeout += 10_000;
    if (params.time_range === 'all_time' || params.time_range === 'last_year') timeout += 5_000;
    if (params.limit && params.limit > 1000) timeout += 10_000;
    return Math.min(timeout, 60_000);
}

export function createChatContext(user: any, query: string): ChatContext {
    return {requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, userId: user._id?.toString() || 'unknown', userEmail: user.email || 'unknown', userRole: user.role || 'user', query, startTime: new Date(), selectedDashboards: [], appliedFilters: {}, toolsCalled: [], responseGenerated: false, totalDuration: 0};
}

export function logToolCall(ctx: ChatContext, toolName: string, params: any, success: boolean, duration: number, retries: number, error?: string) {
    ctx.toolsCalled.push({name: toolName, params, success, duration, retries, error});
    const status = success ? '✅' : '❌';
    console.log(`[${ctx.requestId}] ${status} ${toolName} | ${duration}ms | Retries: ${retries}`);
}

export function finalizeChatContext(ctx: ChatContext): void {
    ctx.totalDuration = Date.now() - ctx.startTime.getTime();
    ctx.responseGenerated = true;
    const successRate = ctx.toolsCalled.length > 0 ? ((ctx.toolsCalled.filter(t => t.success).length / ctx.toolsCalled.length) * 100).toFixed(1) : 0;
    console.log(`[${ctx.requestId}] Duration: ${ctx.totalDuration}ms | Tools: ${ctx.toolsCalled.length} | Success: ${successRate}%`);
}

// ============================================================
// AUTENTICACIÓN
// ============================================================
// --- Auth interno (sin HTTP) ---
export async function loginInternal(): Promise<string> {
    if (!MCP_EMAIL || !MCP_PASSWORD) {
        throw new Error('MCP_EMAIL y MCP_PASSWORD no están configurados en el servidor.');
    }
    const user: any = await User.findOne({ email: MCP_EMAIL }).exec();
    if (!user) throw new Error(`Usuario no encontrado: ${MCP_EMAIL}`);
    if (!bcrypt.compareSync(MCP_PASSWORD, user.password)) throw new Error('Credenciales incorrectas.');
    user.password = ':)';
    const token = jwt.sign({ user }, SEED, { expiresIn: 14400 });
    console.log('[MCP] loginInternal — OK | usuario:', user.email, '| role:', user.role);
    return token;
}

// --- MCP Server ---
export async function resolveUser(requestUser?: any): Promise<any> {
    if (requestUser) {
        console.log('[MCP] resolveUser — fuente: sesión | usuario:', requestUser.email ?? requestUser._id ?? '(desconocido)');
        return requestUser;
    }
    console.log('[MCP] resolveUser — fuente: loginInternal (eda_api_config)');
    const token = await loginInternal();
    const decoded: any = jwt.verify(token, SEED);
    console.log('[MCP] resolveUser — usuario del config:', decoded.user?.email ?? '(desconocido)');
    return decoded.user;
}

// ============================================================
// HELPERS DE DATOS
// ============================================================

// --- Helper: apiBase + token para llamadas HTTP internas ---
export function buildApiCall(user: any): { apiBase: string; token: string } {
    const { MCP_URL } = getAnthropicConfig();
    const apiBase = MCP_URL.replace(/\/ia$/, '');
    const token = jwt.sign({ user }, SEED, { expiresIn: 14400 });
    return { apiBase, token };
}

// --- Helper para obtener dashboards por usuario ---
export async function getAllDashboards(userId: string) {
    const groups = await Group.find({ users: { $in: [userId] } }).exec();
    const isAdmin = groups.some((g: any) => g.role === 'EDA_ADMIN_ROLE');
    const groupIds = groups.map((g: any) => g._id);
    console.log('[MCP] getAllDashboards — userId:', userId, '| isAdmin:', isAdmin, '| grupos:', groupIds.length);

    if (isAdmin) {
        const all = await Dashboard.find({}, 'config.title config.visible').exec();
        const privados = all.filter((d: any) => d.config?.visible === 'private');
        const grupo    = all.filter((d: any) => d.config?.visible === 'group');
        const comunes  = all.filter((d: any) => ['public', 'common'].includes(d.config?.visible));
        const publicos = all.filter((d: any) => ['shared', 'open'].includes(d.config?.visible));
        console.log('[MCP] getAllDashboards (admin) — privados:', privados.length, '| grupo:', grupo.length, '| comunes:', comunes.length, '| públicos:', publicos.length);
        return { privados, grupo, comunes, publicos };
    }

    const [privados, grupo, comunes, publicos] = await Promise.all([
        Dashboard.find({ 'config.visible': 'private', user: userId }, 'config.title config.visible').exec(),
        Dashboard.find({ 'config.visible': 'group', group: { $in: groupIds } }, 'config.title config.visible').exec(),
        Dashboard.find({ 'config.visible': { $in: ['public', 'common'] } }, 'config.title config.visible').exec(),
        Dashboard.find({ 'config.visible': { $in: ['shared', 'open'] } }, 'config.title config.visible').exec(),
    ]);

    console.log('[MCP] getAllDashboards — privados:', privados.length, '| grupo:', grupo.length, '| comunes:', comunes.length, '| públicos:', publicos.length);
    return { privados, grupo, comunes, publicos };
}

// --- Datasources accesibles vía /datasource/namesForDashboard ---
// Devuelve Map<id, model_name> — excluye ia_visibility=NONE (filtrado en el controlador)
export async function getAccessibleDatasourceIds(user: any): Promise<Map<string, string>> {
    const { apiBase, token } = buildApiCall(user);
    const url = `${apiBase}/datasource/namesForDashboard?token=${token}`;

    console.log('[MCP] getAccessibleDatasourceIds — GET', apiBase + '/datasource/namesForDashboard');
    const response = await fetch(url);
    if (!response.ok) {
        const body = await response.text();
        throw new Error(`namesForDashboard HTTP ${response.status}: ${body}`);
    }
    const data: any = await response.json();
    const map = new Map<string, string>();
    for (const d of (data.ds ?? [])) {
        if ((d.ia_visibility ?? 'FULL') === 'NONE') {
            console.log('[MCP] getAccessibleDatasourceIds — excluido (ia_visibility=NONE):', d.model_name ?? d._id);
            continue;
        }
        map.set(d._id.toString(), d.model_name ?? d._id.toString());
    }
    console.log('[MCP] getAccessibleDatasourceIds — accesibles (sin NONE):', map.size);
    return map;
}

// --- Filtrado ia_visibility ---
export function filterDatasourceForAI(ds: any): any | null {
    const raw = ds?.toObject ? ds.toObject() : ds;
    const metadata = raw?.ds?.metadata ?? {};
    const modelVisibility: string = metadata.ia_visibility ?? 'FULL';
    if (modelVisibility === 'NONE') return null;

    const modelRaw = raw?.ds?.model;
    const tables: any[] = Array.isArray(modelRaw?.tables)
        ? modelRaw.tables
        : Array.isArray(modelRaw)
            ? modelRaw
            : [];
    const filteredTables = tables
        .filter((table: any) => (table.ia_visibility ?? 'FULL') !== 'NONE')
        .map((table: any) => {
            const tableVisibility: string = table.ia_visibility ?? 'FULL';
            const colsRaw = table.columns;
            const allColumns: any[] = Array.isArray(colsRaw) ? colsRaw : (colsRaw && typeof colsRaw === 'object' ? Object.values(colsRaw) : []);
            const filteredColumns = allColumns.filter((col: any) => (col.ia_visibility ?? 'FULL') !== 'NONE');
            if (tableVisibility === 'DECLARATION') {
                return {
                    name: table.table_name,
                    ia_visibility: tableVisibility,
                    columns: filteredColumns.map((col: any) => ({
                        name: col.column_name,
                        type: col.column_type,
                        ia_visibility: col.ia_visibility ?? 'FULL',
                    })),
                };
            }
            return {
                ...table,
                ia_visibility: tableVisibility,
                columns: filteredColumns.map((col: any) => {
                    const colVisibility: string = col.ia_visibility ?? 'FULL';
                    if (colVisibility === 'DECLARATION') {
                        return { name: col.column_name, type: col.column_type, ia_visibility: colVisibility };
                    }
                    return { ...col, ia_visibility: colVisibility };
                }),
            };
        });

    return {
        _id: raw._id,
        model_name: metadata.model_name,
        model_description: metadata.model_description ?? undefined,
        ia_visibility: modelVisibility,
        tables: filteredTables,
    };
}

// ============================================================
// EXTRACCIÓN DE OPCIONES DEL TEXTO FINAL (rama MCP nativa)
// ============================================================

// Claude embebe un bloque <eda-options>[...]</eda-options> en su respuesta cuando hay múltiples opciones.
// Esta función lo extrae, lo parsea y devuelve el texto limpio + el array de opciones para el frontend.
export function extractOptionsFromResponse(rawText: string): { text: string; options?: any[] } {
    const match = rawText.match(/<eda-options>([\s\S]*?)<\/eda-options>/);
    if (!match) return { text: rawText };

    try {
        const parsed: any[] = JSON.parse(match[1].trim());
        const text = rawText.replace(match[0], '').trim();
        const options = parsed.map((o: any) => ({
            num:              o.num,
            label:            o.label ?? `${o.dashboard_nombre} — ${o.panel_titulo}`,
            dashboard_nombre: o.dashboard_nombre,
            panel_titulo:     o.panel_titulo,
            tiene_filtros:    o.tiene_filtros ?? false,
            dashboard_id:     o.dashboard_id,
            filtros_nombres:  o.filtros_nombres ?? '',
            panel_index:      o.panel_index,
            dashboard_url:    o.dashboard_url ?? '',
        }));
        return { text, options };
    } catch (_) {
        return { text: rawText };
    }
}

// ============================================================
// HELPERS DE CONSULTA
// ============================================================
// --- Detección de intent de ranking (ES / CA / EN, tolerante a errores de tilde) ---
export function detectRankingIntent(q: string): { topN: number | null; direction: 'Asc' | 'Desc' | null } {
    const norm = q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const words = new Set(norm.match(/\b\w+\b/g) ?? []);

    const descWords = new Set([
        'top', 'best', 'highest', 'most', 'largest', 'biggest', 'max', 'maximum', 'first',
        'mejor', 'mejores', 'mas', 'mayor', 'mayores', 'maximo', 'maximos',
        'primero', 'primeros', 'principal', 'principales',
        'millor', 'millors', 'major', 'majors', 'maxim', 'maxims', 'primer', 'primers',
    ]);
    const ascWords = new Set([
        'worst', 'lowest', 'least', 'smallest', 'min', 'minimum', 'last', 'bottom',
        'peor', 'peores', 'menor', 'menores', 'minimo', 'minimos', 'ultimo', 'ultimos',
        'pitjor', 'pitjors', 'minim', 'minims', 'ultim', 'ultims', 'darrer', 'darrers',
    ]);

    const isDesc = [...words].some(w => descWords.has(w));
    const isAsc  = [...words].some(w => ascWords.has(w));
    const direction: 'Asc' | 'Desc' | null = isDesc && !isAsc ? 'Desc' : isAsc && !isDesc ? 'Asc' : null;

    const nums = norm.match(/\b(\d+)\b/g);
    const topN = direction && nums ? (nums.map(Number).find(n => n > 0 && n <= 500) ?? null) : null;

    return { topN, direction };
}

