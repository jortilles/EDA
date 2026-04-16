import express, { Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import * as path from 'path';
import { authGuard } from '../../guards/auth-guard';
import Dashboard from '../dashboard/model/dashboard.model';
import DataSource from '../datasource/model/datasource.model';
import User from '../admin/users/model/user.model';
import Group from '../admin/groups/model/group.model';

const getAnthropicConfig = () => {
    const configPath = path.resolve(__dirname, '../../../config/anthropic.config.js');
    delete require.cache[require.resolve(configPath)];
    return require(configPath);
};

const LOCALES = ['/es', '/ca', '/en', '/pl', '/fr'];

function getBaseUrl(): string {
    const { EDA_APP_URL } = getAnthropicConfig();
    if (!EDA_APP_URL) return '';
    const hasLocale = LOCALES.some(l => EDA_APP_URL.includes(l));
    return hasLocale ? EDA_APP_URL : `${EDA_APP_URL}/es`;
}

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const SEED = require('../../../config/seed').SEED;
const eda_api_config = require('../../../config/eda_api_config');

const MCP_EMAIL: string = eda_api_config.mcp_email || '';
const MCP_PASSWORD: string = eda_api_config.mcp_password || '';

// --- Auth interno (sin HTTP) ---
async function loginInternal(): Promise<string> {

    console.log('[MCP] loginInternal — email:', MCP_EMAIL || '(vacío)', '| password configurado:', !!MCP_PASSWORD);
    if (!MCP_EMAIL || !MCP_PASSWORD) {
        throw new Error('MCP_EMAIL y MCP_PASSWORD no están configurados en el servidor.');
    }
    const user: any = await User.findOne({ email: MCP_EMAIL }).exec();
    console.log('[MCP] Usuario encontrado:', user ? user.email : 'NO ENCONTRADO');
    if (!user) throw new Error(`Usuario no encontrado: ${MCP_EMAIL}`);
    const passwordOk = bcrypt.compareSync(MCP_PASSWORD, user.password);
    console.log('[MCP] loginInternal — password válido:', passwordOk);
    if (!passwordOk) throw new Error('Credenciales incorrectas.');
    user.password = ':)';
    const token = jwt.sign({ user }, SEED, { expiresIn: 14400 });
    console.log('[MCP] loginInternal — token generado OK para:', user.email, '| role:', user.role);
    return token;
}

// --- Helpers para obtener dashboards por usuario ---
// Nomenclatura igual que el home:
//   privados → visible:'private',  campo raíz: user = userId
//   grupo    → visible:'group',    campo raíz: group contiene groupIds del usuario
//   comunes  → visible:'public'|'common'
//   publicos → visible:'shared'|'open'
// Si es admin, devuelve TODOS clasificados por visibilidad.
async function getAllDashboards(userId: string) {
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



// --- Helper SQL por tipo de BD ---
// function buildSelectQuery(dbType: string, cols: string, table: string, limit: number): string {
//     switch (dbType) {
//         case 'sqlserver':
//             return `SELECT TOP ${limit} ${cols} FROM ${table} as tabla`;
//         case 'oracle':
//             return `SELECT ${cols} FROM ${table} as tabla FETCH FIRST ${limit} ROWS ONLY`;
//         default:
//             // mysql, postgres, vertica, clickhouse, snowflake, bigquery, etc.
//             return `SELECT ${cols} FROM ${table} LIMIT ${limit}`;
//     }
// }

// --- Filtrado ia_visibility ---
function filterDatasourceForAI(ds: any): any | null {
    const raw = ds?.toObject ? ds.toObject() : ds;
    console.log('[MCP] filterDatasource - keys ds:', Object.keys(raw?.ds ?? {}));
    console.log('[MCP] filterDatasource - model type:', typeof raw?.ds?.model, '| isArray:', Array.isArray(raw?.ds?.model), '| length:', raw?.ds?.model?.length);

    const metadata = raw?.ds?.metadata ?? {};
    const modelVisibility: string = metadata.ia_visibility ?? 'FULL';
    // Si el modelo completo está oculto, no lo pasamos
    if (modelVisibility === 'NONE') return null;

    const modelRaw = raw?.ds?.model;
    const tables: any[] = Array.isArray(modelRaw)
        ? modelRaw
        : (modelRaw && typeof modelRaw === 'object' ? Object.values(modelRaw) : []);
    const filteredTables = tables
        .filter((table: any) => (table.ia_visibility ?? 'FULL') !== 'NONE')
        .map((table: any) => {
            const tableVisibility: string = table.ia_visibility ?? 'FULL';
            const colsRaw = table.columns;
            const allColumns: any[] = Array.isArray(colsRaw) ? colsRaw : (colsRaw && typeof colsRaw === 'object' ? Object.values(colsRaw) : []);
            const filteredColumns = allColumns.filter((col: any) => (col.ia_visibility ?? 'FULL') !== 'NONE');
            // DECLARATION: solo nombre y tipo, sin descripción ni detalles extra
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
            // FULL: tabla con columnas filtradas (columnas DECLARATION solo nombre+tipo)
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

    console.log('[MCP] filterDatasource - tables after filter:', filteredTables.length);

    return {
        _id: raw._id,
        model_name: metadata.model_name,
        model_description: metadata.model_description ?? undefined,
        ia_visibility: modelVisibility,
        tables: filteredTables,
    };
}

// --- MCP Server ---
async function resolveUser(requestUser?: any): Promise<any> {
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

function createMcpServer(requestUser?: any) {
    console.log('[MCP] createMcpServer - registrando tools...');
    const server = new McpServer({ name: 'eda-mcp', version: '1.0.0' });

    server.registerTool(
        'list_dashboards',
        { description: 'Lista todos los dashboards accesibles en EDA (privados, de grupo, públicos y compartidos).' },
        async () => {
            console.log('[MCP] tool: list_dashboards - ejecutando');
            let user: any;
            try {
                user = await resolveUser(requestUser);
                console.log('[MCP] list_dashboards — usuario:', user?.email ?? user?._id ?? '(desconocido)');
            } catch (err: any) {
                return { content: [{ type: 'text', text: `Error de autenticación: ${err.message}` }], isError: true };
            }

            try {
                const { privados, grupo, comunes, publicos } = await getAllDashboards(user._id.toString());

                const baseUrl = getBaseUrl();
                console.log('[MCP] list_dashboards — baseUrl:', baseUrl || '(vacío)');
                const formatGroup = (label: string, items: any[] = []) => {
                    const lines = [`\n## ${label} (${items.length})`];
                    if (items.length === 0) lines.push('  (sin dashboards)');
                    for (const d of items) {
                        const link = baseUrl ? ` — ${baseUrl}/#/dashboard/${encodeURIComponent(d._id)}` : '';
                        lines.push(`  - [${d._id}] ${d.config?.title ?? '(sin título)'}${link}`);
                    }
                    return lines;
                };

                const total = privados.length + grupo.length + comunes.length + publicos.length;
                const lines = [
                    `Total: ${total} dashboards (${privados.length} privados, ${grupo.length} de grupo, ${comunes.length} comunes, ${publicos.length} públicos)`,
                    ...formatGroup('Privados', privados),
                    ...formatGroup('De grupo', grupo),
                    ...formatGroup('Comunes', comunes),
                    ...formatGroup('Públicos', publicos),
                ];

                return { content: [{ type: 'text', text: 'Dashboards en EDA:\n' + lines.join('\n') }] };
            } catch (err: any) {
                console.error('[MCP] list_dashboards error:', err.message, err.stack);
                return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
            }
        }
    );

    console.log('[MCP] createMcpServer - list_dashboards registrado');

    server.registerTool(
        'list_datasources',
        { description: 'Lista los datasources accesibles en EDA (excluye los marcados como NONE en ia_visibility).' },
        async () => {
            console.log('[MCP] tool: list_datasources - ejecutando');
            try {
                await resolveUser(requestUser);
                const baseUrl = getBaseUrl();
                console.log('[MCP] list_datasources — baseUrl:', baseUrl || '(vacío)');
                const datasources = await DataSource.find({}, 'ds.metadata').exec();
                const lines = datasources
                    .filter((ds: any) => (ds.ds?.metadata?.ia_visibility ?? 'FULL') !== 'NONE')
                    .map((ds: any) => {
                        const link = baseUrl ? ` — ${baseUrl}/#/data-source/${encodeURIComponent(ds._id)}` : '';
                        return `  - [${ds._id}] ${ds.ds?.metadata?.model_name ?? '(sin nombre)'} [${ds.ds?.metadata?.ia_visibility ?? 'FULL'}]${link}`;
                    });
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

    (server as any).registerTool(
        'get_datasource',
        {
            description: 'Obtiene el detalle de un datasource de EDA por su ID, filtrado por ia_visibility (excluye tablas y columnas con NONE).',
            inputSchema: { id: z.string().describe('ID del datasource a consultar') },
        },
        async (args: any) => {
            console.log('[MCP] tool: get_datasource - args:', JSON.stringify(args));
            const id: string = args.id;
            try {
                await resolveUser(requestUser);
                const ds = await DataSource.findById(id).exec();
                if (!ds) return { content: [{ type: 'text', text: `Datasource no encontrado: ${id}` }], isError: true };
                const filtered = filterDatasourceForAI(ds);
                if (!filtered) return { content: [{ type: 'text', text: `Datasource ${id} excluido por ia_visibility: NONE` }], isError: true };
                const baseUrl = getBaseUrl();
                console.log('[MCP] get_datasource — baseUrl:', baseUrl || '(vacío)', '| id:', id);
                const url = baseUrl ? `URL: ${baseUrl}/#/data-source/${encodeURIComponent(id)}\n\n` : '';
                return { content: [{ type: 'text', text: `${url}${JSON.stringify(filtered, null, 2)}` }] };
            } catch (err: any) {
                console.error('[MCP] get_datasource error:', err.message, err.stack);
                return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
            }
        }
    );

    console.log('[MCP] createMcpServer - get_datasource registrado');

    (server as any).registerTool(
        'get_dashboard',
        {
            description: 'Obtiene el contenido de un dashboard de EDA por su ID: título, panels con su título, datasource y campos mostrados.',
            inputSchema: { id: z.string().describe('ID del dashboard a consultar') },
        },
        async (args: any) => {
            console.log('[MCP] tool: get_dashboard - args:', JSON.stringify(args));
            const id: string = args.id;
            try {
                await resolveUser(requestUser);
                const db: any = await Dashboard.findById(id).exec();
                if (!db) return { content: [{ type: 'text', text: `Dashboard no encontrado: ${id}` }], isError: true };

                const baseUrl = getBaseUrl();
                console.log('[MCP] get_dashboard — baseUrl:', baseUrl || '(vacío)', '| id:', id);
                const dashboardLink = baseUrl ? `${baseUrl}/#/dashboard/${encodeURIComponent(id)}` : '';
                const panels = Array.isArray(db.config?.panel) ? db.config.panel : [];

                // Agrupar datasources únicos
                const datasourceIds: string[] = [...new Set<string>(
                    panels.map((p: any) => p.content?.query?.model_id).filter(Boolean) as string[]
                )];

                const lines: string[] = [
                    `Dashboard: ${db.config?.title ?? '(sin título)'}`,
                    ...(dashboardLink ? [`Dashboard URL / LINK: ${dashboardLink}`] : []),
                    `Visibilidad: ${db.config?.visible ?? '(desconocida)'}`,
                    `Panels: ${panels.length}`,
                    ...(datasourceIds.length > 0 ? [`Datasource(s): ${datasourceIds.join(', ')}`] : []),
                    '',
                ];

                if (panels.length === 0) {
                    lines.push('(sin panels)');
                } else {
                    lines.push('--- Panels ---');
                    for (let i = 0; i < panels.length; i++) {
                        const panel = panels[i];
                        const fields: any[] = panel.content?.query?.query?.fields ?? [];
                        const fieldNames = fields.map((f: any) => f.display_name ?? f.field_name).filter(Boolean);
                        lines.push(`${i + 1}. ${panel.title ?? '(sin título)'}`);
                        if (fieldNames.length > 0) lines.push(`   Campos: ${fieldNames.join(', ')}`);
                        const chartType = panel.content?.chart_type ?? panel.content?.edaChart ?? null;
                        if (chartType) lines.push(`   Tipo: ${chartType}`);
                    }
                }
                console.log('[MCP] get_dashboard - resultado:\n' + lines.join('\n'));
                return { content: [{ type: 'text', text: lines.join('\n') }] };
            } catch (err: any) {
                console.error('[MCP] get_dashboard error:', err.message, err.stack);
                return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
            }
        }
    );

    console.log('[MCP] createMcpServer - get_dashboard registrado');

    // (server as any).registerTool(
    //     'query_datasource',
    //     {
    //         description: 'Ejecuta una consulta SQL simple sobre una tabla de un datasource de EDA y devuelve las primeras filas. Útil para explorar datos reales.',
    //         inputSchema: {
    //             datasource_id: z.string().describe('ID del datasource'),
    //             table_name: z.string().describe('Nombre de la tabla a consultar (puede incluir schema: schema.tabla)'),
    //             limit: z.number().optional().describe('Número máximo de filas (por defecto 50, máximo 200)'),
    //         },
    //     },
    //     async (args: any) => {
    //         console.log('[MCP] tool: query_datasource - args:', JSON.stringify(args));
    //         const { datasource_id, table_name, limit: rawLimit } = args;
    //         const limit = Math.min(rawLimit ?? 50, 200);
    //         console.log('[MCP] query_datasource - datasource_id:', datasource_id, '| table:', table_name, '| limit:', limit);

    //         if (!/^[\w.]+$/.test(table_name)) {
    //             return { content: [{ type: 'text', text: 'Nombre de tabla inválido.' }], isError: true };
    //         }

    //         try {
    //             await loginInternal();

    //             // Obtener modelo para filtrar columnas FULL únicamente
    //             const dsDoc = await DataSource.findById(datasource_id).exec();
    //             if (!dsDoc) return { content: [{ type: 'text', text: `Datasource no encontrado: ${datasource_id}` }], isError: true };

    //             const raw = (dsDoc as any).toObject ? (dsDoc as any).toObject() : dsDoc;
    //             const modelRaw = raw?.ds?.model;
    //             const allTables: any[] = Array.isArray(modelRaw) ? modelRaw
    //                 : (modelRaw && typeof modelRaw === 'object' ? Object.values(modelRaw) : []);

    //             // Busca la tabla por table_name (la parte después del punto si hay schema.tabla)
    //             const bareTableName = table_name.includes('.') ? table_name.split('.').pop() : table_name;
    //             const tableMeta = allTables.find((t: any) =>
    //                 t.table_name === table_name || t.table_name === bareTableName
    //             );

    //             let selectCols = '*';
    //             if (tableMeta) {
    //                 const colsRaw = tableMeta.columns;
    //                 const cols: any[] = Array.isArray(colsRaw) ? colsRaw
    //                     : (colsRaw && typeof colsRaw === 'object' ? Object.values(colsRaw) : []);
    //                 const fullCols = cols
    //                     .filter((c: any) => (c.ia_visibility ?? 'FULL') === 'FULL')
    //                     .map((c: any) => c.column_name)
    //                     .filter(Boolean);
    //                 if (fullCols.length > 0) selectCols = fullCols.join(', ');
    //             }

    //             const connection = await ManagerConnectionService.getConnection(datasource_id);
    //             if (!connection) {
    //                 return { content: [{ type: 'text', text: `No se pudo obtener conexión para el datasource: ${datasource_id}` }], isError: true };
    //             }
    //             connection.client = await connection.getclient();
    //             const dbType: string = raw?.ds?.connection?.type ?? '';
    //             const sql = buildSelectQuery(dbType, selectCols, table_name, limit);
    //             console.log('[MCP] query_datasource - SQL:', sql);
    //             const rows = await connection.execSqlQuery(sql);

    //             if (!rows || rows.length === 0) {
    //                 return { content: [{ type: 'text', text: `La tabla ${table_name} no devolvió filas.` }] };
    //             }

    //             return { content: [{ type: 'text', text: JSON.stringify(rows, null, 2) }] };
    //         } catch (err: any) {
    //             console.error('[MCP] query_datasource error:', err.message);
    //             return { content: [{ type: 'text', text: `Error al consultar: ${err.message}` }], isError: true };
    //         }
    //     }
    // );

    server.registerTool(
        'server_status',
        { description: 'Devuelve el estado del servidor MCP de EDA: configuración activa, credenciales MCP, conteo de dashboards y datasources, y estado de autenticación.' },
        async () => {
            console.log('[MCP] tool: server_status - ejecutando');
            const { EDA_APP_URL, MODEL, AVAILABLE, MAX_TOKENS } = getAnthropicConfig();

            const lines: string[] = [
                '# Estado del servidor EDA MCP',
                '',
                '## Configuración',
                `  EDA_APP_URL : ${EDA_APP_URL || '(no configurado)'}`,
                `  MODEL       : ${MODEL || '(no configurado)'}`,
                `  AVAILABLE   : ${AVAILABLE}`,
                `  MAX_TOKENS  : ${MAX_TOKENS}`,
                '',
                '## Credenciales MCP',
                `  MCP_EMAIL   : ${MCP_EMAIL || '(no configurado)'}`,
                `  MCP_PASSWORD: ${MCP_PASSWORD ? '(configurado)' : '(no configurado)'}`,
                '',
            ];

            // Test autenticación
            try {
                const user = await resolveUser(requestUser);
                lines.push('## Autenticación');
                lines.push(`  Estado : OK`);
                lines.push(`  Fuente : ${requestUser ? 'usuario de la sesión' : 'usuario MCP del config'}`);
                lines.push(`  Usuario: ${user?.email ?? '(desconocido)'}`);
                lines.push(`  Rol    : ${user?.role ?? '(desconocido)'}`);
                lines.push('');
            } catch (authErr: any) {
                lines.push('## Autenticación');
                lines.push(`  Estado : ERROR — ${authErr.message}`);
                lines.push('');
            }

            // Conteo de dashboards y datasources
            try {
                const [totalDashboards, totalDatasources] = await Promise.all([
                    Dashboard.countDocuments().exec(),
                    DataSource.countDocuments().exec(),
                ]);
                lines.push('## Base de datos');
                lines.push(`  Dashboards : ${totalDashboards}`);
                lines.push(`  Datasources: ${totalDatasources}`);
                lines.push('');
            } catch (dbErr: any) {
                lines.push('## Base de datos');
                lines.push(`  ERROR: ${dbErr.message}`);
                lines.push('');
            }

            const statusText = lines.join('\n');
            console.log('[MCP] server_status:\n' + statusText);
            return { content: [{ type: 'text', text: statusText }] };
        }
    );

    console.log('[MCP] createMcpServer - server_status registrado. Total tools: 5');

    return server;
}

// --- Express router ---
const McpRouter = express.Router();

// Log de arranque con valores clave
{
    const { EDA_APP_URL, MODEL, AVAILABLE, MAX_TOKENS } = getAnthropicConfig();
    console.log('[MCP] ========== ROUTER INICIADO ==========');
    console.log('[MCP] EDA_APP_URL :', EDA_APP_URL || '(no configurado)');
    console.log('[MCP] MODEL       :', MODEL || '(no configurado)');
    console.log('[MCP] AVAILABLE   :', AVAILABLE);
    console.log('[MCP] MAX_TOKENS  :', MAX_TOKENS);
    console.log('[MCP] MCP_EMAIL   :', MCP_EMAIL || '(no configurado)');
    console.log('[MCP] MCP_PASSWORD:', MCP_PASSWORD ? '(configurado)' : '(no configurado)');
    console.log('[MCP] =========================================');
}

McpRouter.post('/', async (req: Request, res: Response) => {
    // callInterceptor sets req.query = undefined; restore it so the MCP SDK can access it
    if (!req.query) (req as any).query = (req as any).qs || {};

    console.log('[MCP] POST /ia/mcp — method:', req.body?.method, '| tool:', req.body?.params?.name ?? '-', '| Accept:', req.headers.accept);

    // Intentar recuperar el usuario del header x-user-token (enviado desde /chat)
    let requestUser: any = null;
    const userToken = req.headers['x-user-token'] as string;
    console.log('[MCP] x-user-token presente:', !!userToken);
    if (userToken) {
        console.log('[MCP] Intentando verificar x-user-token...');
        try {
            const decoded: any = jwt.verify(userToken, SEED);
            requestUser = decoded.user;
            console.log('[MCP] x-user-token OK — usuario:', requestUser?.email ?? '(sin email)', '| id:', requestUser?._id ?? '(sin id)', '| role:', requestUser?.role ?? '(sin role)');
        } catch (e: any) {
            console.warn('[MCP] x-user-token inválido:', e.message, '→ fallback a loginInternal');
        }
    } else {
        console.log('[MCP] Sin x-user-token → se usará loginInternal con el usuario del config');
    }

    try {
        const server = createMcpServer(requestUser);
        const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
        res.on('close', () => transport.close());
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
    } catch (err: any) {
        console.error('[MCP] Error handling request:', err.message);
        if (!res.headersSent) {
            res.status(500).json({ error: err.message });
        }
    }
});

McpRouter.get('/', (_req: Request, res: Response) => {
    res.json({ service: 'eda-mcp', version: '1.0.0', status: 'ok', transport: 'Streamable HTTP' });
});

McpRouter.post('/chat', authGuard, async (req: Request, res: Response) => {
    const { API_KEY, MODEL, AVAILABLE, MAX_TOKENS, EDA_APP_URL, MCP_URL } = getAnthropicConfig();

    if (!AVAILABLE) {
        return res.status(503).json({ ok: false, response: 'El asistente de IA no está disponible. Configura la API key de Anthropic.' });
    }

    const { messages } = req.body;
    const userId = (req as any).user?._id?.toString() ?? '';

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ ok: false, response: 'Se requiere el campo messages[].' });
    }

    console.log('[CHAT] POST /ia/chat — mensajes:', messages.length, '| user:', userId);
    console.log('[CHAT] Config — MODEL:', MODEL, '| MAX_TOKENS:', MAX_TOKENS, '| EDA_APP_URL:', EDA_APP_URL || '(no configurado)');

    const mcpClient = new Client({ name: 'eda-chat', version: '1.0.0' });

    try {
        console.log('[CHAT] Conectando a MCP:', MCP_URL || '(no configurado)');
        // authGuard ya verificó el JWT y dejó req.user disponible — generamos un token fresco desde ahí
        const reqUser = (req as any).user;
        const userToken = reqUser ? jwt.sign({ user: reqUser }, SEED, { expiresIn: 14400 }) : '';
        console.log('[CHAT] x-user-token a enviar — usuario:', reqUser?.email ?? reqUser?._id ?? '(ninguno)', '| token generado:', !!userToken);
        const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), {
            requestInit: { headers: { 'x-user-token': userToken } },
        });
        await mcpClient.connect(transport);
        console.log('[CHAT] Conexión MCP establecida OK');

        const { tools: mcpTools } = await mcpClient.listTools();
        console.log('[CHAT] Tools MCP disponibles (' + mcpTools.length + '):', mcpTools.map((t: any) => t.name).join(', '));

        const anthropicTools: Anthropic.Tool[] = mcpTools.map((tool: any) => ({
            name: tool.name,
            description: tool.description || '',
            input_schema: tool.inputSchema || { type: 'object', properties: {} },
        }));

        const anthropic = new Anthropic({ apiKey: API_KEY });
        const history: Anthropic.MessageParam[] = messages.map((m: any) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
        }));

        let iterations = 0;
        const MAX_ITERATIONS = 10;

        while (iterations < MAX_ITERATIONS) {
            iterations++;
            console.log('[CHAT] Iteración', iterations, '— llamando a Anthropic...');

            const response = await anthropic.messages.create({
                model: MODEL || 'claude-opus-4-6',
                max_tokens: MAX_TOKENS || 4096,
                system: `Eres un asistente de análisis de datos integrado en EDA (Enterprise Data Analytics). Tienes acceso a los datasources y dashboards del sistema mediante herramientas MCP.

REGLA IMPORTANTE - URLs:
- Los resultados de list_dashboards y list_datasources incluyen la URL de cada elemento al final de la línea (formato: " — https://...").
- Cuando listes dashboards o datasources, SIEMPRE incluye su URL en la respuesta al usuario.
- Si el usuario pide el link de un elemento concreto y ya tienes la lista en el contexto, extrae la URL directamente sin llamar a la herramienta de nuevo.
- Nunca digas que no tienes acceso a los links si los datos ya están en el contexto de la conversación.
- NUNCA inventes ni construyas URLs. Si no tienes la URL de un elemento en el contexto actual, llama a la herramienta correspondiente para obtenerla o indica que no dispones del link.
- Asegurate SIEMPRE de respetar los links y urls que te proporciona el mcp. El mpc te devuelve ${'SERVIDOR'}${'LOCALE'}${'PATH'} y debes respetarlo. 
Responde siempre en el idioma del usuario. Sé conciso y útil.`,
                messages: history,
                tools: anthropicTools,
            });

            console.log('[CHAT] stop_reason:', response.stop_reason, '| content blocks:', response.content.length);

            if (response.stop_reason === 'end_turn') {
                const text = (response.content.find((b: any) => b.type === 'text') as any)?.text ?? '';
                return res.status(200).json({ ok: true, response: text });
            }

            if (response.stop_reason === 'tool_use') {
                const toolBlocks = response.content.filter((b: any) => b.type === 'tool_use') as any[];
                history.push({ role: 'assistant', content: response.content });

                const TOOL_TIMEOUT_MS = 20_000;
                const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
                    toolBlocks.map(async (block: any) => {
                        console.log('[CHAT] Ejecutando tool MCP:', block.name, '| input:', JSON.stringify(block.input));
                        let resultText = '';
                        try {
                            const timeoutPromise = new Promise<never>((_, reject) =>
                                setTimeout(() => reject(new Error(`Tool "${block.name}" timeout tras ${TOOL_TIMEOUT_MS / 1000}s`)), TOOL_TIMEOUT_MS)
                            );
                            const result = await Promise.race([
                                mcpClient.callTool({ name: block.name, arguments: block.input }),
                                timeoutPromise,
                            ]);
                            resultText = (result.content as any[])
                                .filter((c: any) => c.type === 'text')
                                .map((c: any) => c.text)
                                .join('\n');
                            console.log('[CHAT] Tool MCP', block.name, 'result length:', resultText.length);
                        } catch (toolErr: any) {
                            console.error('[CHAT] Tool MCP error:', block.name, toolErr.message);
                            resultText = `Error: ${toolErr.message}`;
                        }
                        return {
                            type: 'tool_result' as const,
                            tool_use_id: block.id,
                            content: resultText,
                        };
                    })
                );

                history.push({ role: 'user', content: toolResults });
                continue;
            }

            break;
        }

        const lastAssistantText = [...history].reverse()
            .reduce((acc: any[], m: any) => acc.concat(Array.isArray(m.content) ? m.content : []), [])
            .find((b: any) => b.type === 'text')?.text ?? '';
        return res.status(200).json({ ok: true, response: lastAssistantText || '(Sin respuesta del asistente)' });

    } catch (err: any) {
        console.error('[CHAT] Error:', err.message);
        return res.status(500).json({ ok: false, response: `Error del asistente: ${err.message}` });
    } finally {
        try { await mcpClient.close(); } catch (_) {}
    }
});

McpRouter.get('/chat/config', authGuard, (_req: Request, res: Response) => {
    const { AVAILABLE } = getAnthropicConfig();
    res.json({ available: AVAILABLE });
});

export default McpRouter;
