import express, { Request, Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { MCPAIProviderFactory } from '../../services/prompt/providers/mcp/mcp-ai-provider.factory';
import { MCPHistoryMessage } from '../../services/prompt/providers/mcp/mcp-ai-provider.interface';
import { NormalizedTool } from '../../services/prompt/providers/ai-provider.interface';
import { authGuard } from '../../guards/auth-guard';
import { buildEnhancedSystemPrompt, CHAT_MAIN_SYSTEM_PROMPT } from './mcp.prompts';
import * as MCPUtils from './mcp.helpers';
import * as mcpServer from './mcp.server';

const jwt    = require('jsonwebtoken');
const SEED   = require('../../../config/seed').SEED;

// ============================================================
// TIPOS Y FUNCIONES DE MEJORA
// ============================================================

// --- Express router ---
const McpRouter = express.Router();

// Log de arranque con valores clave
{
    const { EDA_APP_URL, MODEL, AVAILABLE, MAX_TOKENS, MCP_EMAIL, MCP_PASSWORD } = MCPUtils.getAnthropicConfig();
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
        const server = mcpServer.createMcpServer(requestUser);
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
    const { MODEL, AVAILABLE, MAX_TOKENS, EDA_APP_URL, MCP_URL } = MCPUtils.getAnthropicConfig();

    if (!AVAILABLE) {
        return res.status(503).json({ ok: false, response: 'El asistente de IA no está disponible. Configura la API key en la configuración.' });
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
        const reqUser = (req as any).user;
        const userToken = reqUser ? jwt.sign({ user: reqUser }, SEED, { expiresIn: 14400 }) : '';
        console.log('[CHAT] x-user-token a enviar — usuario:', reqUser?.email ?? reqUser?._id ?? '(ninguno)', '| token generado:', !!userToken);
        const lastUserMsg = [...messages].reverse().find((m: any) => m.role === 'user')?.content ?? '';
        const ctx = MCPUtils.createChatContext(reqUser || {}, typeof lastUserMsg === 'string' ? lastUserMsg : '');
        const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), {
            requestInit: { headers: { 'x-user-token': userToken } },
        });
        await mcpClient.connect(transport);
        console.log('[CHAT] Conexión MCP establecida OK');

        const { tools: mcpTools } = await mcpClient.listTools();
        console.log('[CHAT] Tools MCP disponibles (' + mcpTools.length + '):', mcpTools.map((t: any) => t.name).join(', '));

        const normalizedTools: NormalizedTool[] = mcpTools.map((tool: any) => ({
            name: tool.name,
            description: tool.description || '',
            parameters: tool.inputSchema || { type: 'object', properties: {} },
        }));

        const aiConfig = MCPUtils.getAnthropicConfig();
        const provider = MCPAIProviderFactory.create(aiConfig);

        const history: MCPHistoryMessage[] = messages.map((m: any) => ({
            type: m.role as 'user' | 'assistant',
            content: m.content,
        }));

        let iterations = 0;
        const MAX_ITERATIONS = 10;
        let lastExplorationOptions: any[] = [];

        while (iterations < MAX_ITERATIONS) {
            iterations++;
            console.log('[CHAT] Iteración', iterations, '— llamando a IA...');

            const turnResult = await provider.turn(
                [buildEnhancedSystemPrompt(reqUser || {}), CHAT_MAIN_SYSTEM_PROMPT],
                history,
                normalizedTools,
                MAX_TOKENS || 4096
            );

            console.log('[CHAT] done:', turnResult.done, '| toolCalls:', turnResult.toolCalls?.length ?? 0);

            if (turnResult.done) {
                const text = turnResult.text ?? '';
                const responsePayload: any = { ok: true, response: text };
                if (lastExplorationOptions.length > 1) {
                    // Siempre mostrar TODAS las opciones en el orden exacto del tool.
                    // El filtrado por números mencionados en texto era frágil (markdown bold lo rompía)
                    // y causaba desajuste entre el texto de la IA y los botones del frontend.
                    console.log('[CHAT] done — mostrando todas las opciones:', lastExplorationOptions.length);
                    responsePayload.options = lastExplorationOptions.map((o: any) => ({
                        num: o.opcion_num,
                        label: `${o.dashboard_nombre} — ${o.panel_titulo}`,
                        dashboard_nombre: o.dashboard_nombre,
                        panel_titulo: o.panel_titulo,
                        tiene_filtros: o.tiene_filtros ?? false,
                        dashboard_id: o.dashboard_id,
                        filtros_nombres: (o.alcance ?? '').replace(/^Filtros:\s*/i, '').replace(/^Sin filtros$/i, '') || '',
                        panel_index: o.panel_index,
                        dashboard_url: o.dashboard_url,
                    }));
                    lastExplorationOptions = [];
                }
                MCPUtils.finalizeChatContext(ctx);
                return res.status(200).json(responsePayload);
            }

            // Tool calls — ejecutar y añadir al historial normalizado
            const toolCalls = turnResult.toolCalls!;
            history.push({ type: 'assistant_tool_calls', toolCalls });

            const toolResults = await Promise.all(
                toolCalls.map(async (tc) => {
                    console.log('[CHAT] Ejecutando tool MCP:', tc.name, '| input:', JSON.stringify(tc.arguments));
                    let resultText = '';
                    const toolStart = Date.now();
                    try {
                        const TOOL_TIMEOUT_MS = MCPUtils.calculateDynamicTimeout(tc.arguments);
                        const timeoutPromise = new Promise<never>((_, reject) =>
                            setTimeout(() => reject(new Error(`Tool "${tc.name}" timeout tras ${TOOL_TIMEOUT_MS / 1000}s`)), TOOL_TIMEOUT_MS)
                        );
                        const result = await Promise.race([
                            mcpClient.callTool({ name: tc.name, arguments: tc.arguments }),
                            timeoutPromise,
                        ]);
                        resultText = MCPUtils.extractTextContent(result);
                        console.log('[CHAT] Tool MCP', tc.name, 'result length:', resultText.length);
                        MCPUtils.logToolCall(ctx, tc.name, tc.arguments, true, Date.now() - toolStart, 0);
                        if (tc.name === 'get_data_from_dashboard') {
                            try {
                                const parsed = JSON.parse(resultText);
                                if (Array.isArray(parsed?.opciones_unicas) && parsed.opciones_unicas.length > 1) {
                                    lastExplorationOptions = parsed.opciones_unicas;
                                } else {
                                    lastExplorationOptions = [];
                                }
                            } catch (_) {}
                        }
                    } catch (toolErr: any) {
                        console.error('[CHAT] Tool MCP error:', tc.name, toolErr.message);
                        resultText = `Error: ${toolErr.message}`;
                        MCPUtils.logToolCall(ctx, tc.name, tc.arguments, false, Date.now() - toolStart, 0, toolErr.message);
                    }
                    return { id: tc.id, content: resultText };
                })
            );

            for (const r of toolResults) {
                history.push({ type: 'tool_result', toolCallId: r.id, content: r.content });
            }
        }

        MCPUtils.finalizeChatContext(ctx);
        return res.status(200).json({ ok: true, response: '(Sin respuesta del asistente)' });

    } catch (err: any) {
        console.error('[CHAT] Error:', err.message);
        return res.status(500).json({ ok: false, response: `Error del asistente: ${err.message}` });
    } finally {
        try { await mcpClient.close(); } catch (_) {}
    }
});

McpRouter.get('/chat/config', authGuard, (_req: Request, res: Response) => {
    const { AVAILABLE } = MCPUtils.getAnthropicConfig();
    res.json({ available: AVAILABLE });
});

export default McpRouter;
