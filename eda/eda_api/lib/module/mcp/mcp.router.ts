import express, { Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import Dashboard from '../dashboard/model/dashboard.model';
import DataSource from '../datasource/model/datasource.model';
import User from '../admin/users/model/user.model';
import Group from '../admin/groups/model/group.model';

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
    if (!passwordOk) throw new Error('Credenciales incorrectas.');
    user.password = ':)';
    return jwt.sign({ user }, SEED, { expiresIn: 14400 });
}

// --- Helpers para obtener dashboards por rol ---
async function getAllDashboards(userId: string) {
    const groups = await Group.find({ users: { $in: userId } }).exec();
    const isAdmin = groups.some((g: any) => g.role === 'EDA_ADMIN_ROLE');
    const groupIds = groups.map((g: any) => g._id);

    if (isAdmin) {
        const all = await Dashboard.find({}, 'config.title config.visible').exec();
        return { dashboards: all, group: [], publics: [], shared: [] };
    }

    const [privates, groupDbs, publics, shared] = await Promise.all([
        Dashboard.find({ 'config.visible': 'private', 'config.createdBy': userId }, 'config.title config.visible').exec(),
        Dashboard.find({ 'config.visible': 'group', 'config.group': { $in: groupIds } }, 'config.title config.visible').exec(),
        Dashboard.find({ 'config.visible': 'public' }, 'config.title config.visible').exec(),
        Dashboard.find({ 'config.visible': 'shared', 'config.sharedWith': { $in: [userId] } }, 'config.title config.visible').exec(),
    ]);

    return { dashboards: privates, group: groupDbs, publics, shared };
}



// --- Filtrado ia_visibility ---
function filterDatasourceForAI(ds: any): any | null {

    const metadata = ds?.ds?.metadata ?? {};
    const modelVisibility: string = metadata.ia_visibility ?? 'FULL';
    // Si el modelo completo está oculto, no lo pasamos
    if (modelVisibility === 'NONE') return null;

    const tables: any[] = Array.isArray(ds?.ds?.model) ? ds.ds.model : [];
    const filteredTables = tables
        .filter((table: any) => (table.ia_visibility ?? 'FULL') !== 'NONE')
        .map((table: any) => {
            const tableVisibility: string = table.ia_visibility ?? 'FULL';
            const filteredColumns = (Array.isArray(table.columns) ? table.columns : []).filter((col: any) => (col.ia_visibility ?? 'FULL') !== 'NONE');
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

    return {
        _id: ds._id,
        model_name: metadata.model_name,
        ia_visibility: modelVisibility,
        tables: filteredTables,
    };
}

// --- MCP Server ---
function createMcpServer() {
    const server = new McpServer({ name: 'eda-mcp', version: '1.0.0' });

    server.registerTool(
        'list_dashboards',
        { description: 'Lista todos los dashboards accesibles en EDA (privados, de grupo, públicos y compartidos).' },
        async () => {
            let user: any;
            try {
                const token = await loginInternal();
                const decoded: any = jwt.verify(token, SEED);
                user = decoded.user;
            } catch (err: any) {
                return { content: [{ type: 'text', text: `Error de autenticación: ${err.message}` }], isError: true };
            }

            try {
                const { dashboards, group, publics, shared } = await getAllDashboards(user._id);

                const formatGroup = (label: string, items: any[] = []) => {
                    const lines = [`\n## ${label}`];
                    if (items.length === 0) lines.push('  (sin dashboards)');
                    for (const d of items) lines.push(`  - [${d._id}] ${d.config?.title ?? '(sin título)'}`);
                    return lines;
                };

                const lines = [
                    ...formatGroup('Privados', dashboards),
                    ...formatGroup('De grupo', group),
                    ...formatGroup('Públicos', publics),
                    ...formatGroup('Compartidos', shared),
                ];

                return { content: [{ type: 'text', text: 'Dashboards en EDA:\n' + lines.join('\n') }] };
            } catch (err: any) {
                return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
            }
        }
    );

    server.registerTool(
        'list_datasources',
        { description: 'Lista los datasources accesibles en EDA (excluye los marcados como NONE en ia_visibility).' },
        async () => {
            try {
                await loginInternal();
                const datasources = await DataSource.find({}, 'ds.metadata').exec();
                const lines = datasources
                    .filter((ds: any) => (ds.ds?.metadata?.ia_visibility ?? 'FULL') !== 'NONE')
                    .map((ds: any) => `  - [${ds._id}] ${ds.ds?.metadata?.model_name ?? '(sin nombre)'} [${ds.ds?.metadata?.ia_visibility ?? 'FULL'}]`);
                return {
                    content: [{
                        type: 'text',
                        text: 'Datasources en EDA:\n' + (lines.length ? lines.join('\n') : '  (sin datasources)'),
                    }],
                };
            } catch (err: any) {
                return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
            }
        }
    );

    (server as any).registerTool(
        'get_datasource',
        {
            description: 'Obtiene el detalle de un datasource de EDA por su ID, filtrado por ia_visibility (excluye tablas y columnas con NONE).',
            inputSchema: { id: z.string().describe('ID del datasource a consultar') },
        },
        async (args: any) => {
            const id: string = args.id;
            try {
                await loginInternal();
                const ds = await DataSource.findById(id).exec();
                if (!ds) return { content: [{ type: 'text', text: `Datasource no encontrado: ${id}` }], isError: true };
                const filtered = filterDatasourceForAI(ds);
                if (!filtered) return { content: [{ type: 'text', text: `Datasource ${id} excluido por ia_visibility: NONE` }], isError: true };
                return { content: [{ type: 'text', text: JSON.stringify(filtered, null, 2) }] };
            } catch (err: any) {
                return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
            }
        }
    );

    (server as any).registerTool(
        'get_dashboard',
        {
            description: 'Obtiene el contenido de un dashboard de EDA por su ID: título, panels con su título, datasource y campos mostrados.',
            inputSchema: { id: z.string().describe('ID del dashboard a consultar') },
        },
        async (args: any) => {
            const id: string = args.id;
            try {
                await loginInternal();
                const db: any = await Dashboard.findById(id).exec();
                if (!db) return { content: [{ type: 'text', text: `Dashboard no encontrado: ${id}` }], isError: true };

                const lines: string[] = [`# ${db.config?.title ?? '(sin título)'}`, ''];
                const panels = Array.isArray(db.config?.panel) ? db.config.panel : [];
                if (panels.length === 0) lines.push('(sin panels)');

                for (const panel of panels) {
                    lines.push(`## Panel: ${panel.title ?? '(sin título)'}`);
                    const modelId = panel.content?.query?.model_id;
                    if (modelId) lines.push(`  datasource: ${modelId}`);
                    const fields = panel.content?.query?.query?.fields ?? [];
                    if (fields.length > 0) {
                        lines.push('  campos:');
                        for (const f of fields) lines.push(`    - ${f.display_name ?? f.field_name}`);
                    }
                    lines.push('');
                }

                return { content: [{ type: 'text', text: lines.join('\n') }] };
            } catch (err: any) {
                return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
            }
        }
    );

    return server;
}

// --- Express router ---
const McpRouter = express.Router();

McpRouter.post('/', async (req: Request, res: Response) => {
    // callInterceptor sets req.query = undefined; restore it so the MCP SDK can access it
    if (!req.query) (req as any).query = (req as any).qs || {};

    console.log('[MCP] POST /ia/mcp — method:', req.body?.method, '| Accept:', req.headers.accept);

    try {
        const server = createMcpServer();
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

export default McpRouter;
