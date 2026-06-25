import { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';
import { HttpException } from '../global/model/index';
import { AIProviderFactory } from '../../services/prompt/providers/ai-provider.factory';
import { NormalizedMessage } from '../../services/prompt/providers/ai-provider.interface';
import { filterDatasourceForAI } from '../mcp/mcp.helpers';
import DataSource from '../datasource/model/datasource.model';
import Dashboard from '../dashboard/model/dashboard.model';
import AIUsage from './model/ai-usage.model';
import {
    DASHBOARD_SYSTEM_PROMPT,
    buildStandardUserPrompt,
    buildExplicitUserPrompt,
} from './ai-prompts';

const STANDARD_MODE_PATTERN = /\b(registro|dashboard|informe|análisis|panel|resumen|reporte)\s+(de|del|de\s+los?|de\s+las?)\b/i;

const GRID_W = 40;   // gridster minCols/maxCols = 40
const KPI_H = 8;
const CHART_H = 12;
const TABLE_H = 15;
const FALLBACK_H = 10;
const FALLBACK_COLS = 2;

// ── Schema helpers ────────────────────────────────────────────────────────────

function buildSimplifiedTables(schema: any): any[] {
    const allTables: any[] = schema.tables || [];
    const visibleTables = allTables.filter((t: any) => t.visible !== false && (t.table_name || t.name));

    console.log(`[AI Dashboard] Tablas visibles: ${visibleTables.length} | ocultas: ${allTables.length - visibleTables.length}`);

    const simplified = visibleTables
        .map((t: any) => {
            const tableName: string = t.table_name || t.name;
            const cols = (t.columns || [])
                .filter((c: any) => c.column_name || c.name)
                .map((c: any) => ({
                    column_name: c.column_name || c.name,
                    display_name: c.display_name?.default || c.display_name || c.column_name || c.name,
                    column_type: c.column_type || c.type || 'text',
                }));
            const joins_with: string[] = (t.relations || []).map((r: any) => r.target_table).filter(Boolean);
            return { table_name: tableName, columns: cols, joins_with };
        })
        .filter((t: any) => t.columns.length > 0);

    console.log(`[AI Dashboard] Tablas enviadas al AI: ${simplified.length}`);
    simplified.forEach((t: any) =>
        console.log(`  - ${t.table_name} (${t.columns.length} cols, joins: [${t.joins_with.join(', ')}])`));

    return simplified;
}

// ── AI call ───────────────────────────────────────────────────────────────────

async function callAI(config: any, systemPrompt: string, userPrompt: string): Promise<string> {
    if (config.PROVIDER === 'anthropic') {
        const anthropic = new Anthropic({ apiKey: config.API_KEY });
        const response = await anthropic.messages.create({
            model: config.MODEL,
            max_tokens: config.MAX_TOKENS || 4096,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
        });
        return response.content
            .filter((b: any) => b.type === 'text')
            .map((b: any) => (b as Anthropic.TextBlock).text)
            .join('');
    }

    const provider = AIProviderFactory.create(config);
    const messages: NormalizedMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
    ];
    const result = await provider.complete(messages, []);
    return result.text ?? '';
}

// ── Panel builders ────────────────────────────────────────────────────────────

function buildFields(aiPanel: any, simplifiedTables: any[], datasource_id: string): any[] {
    return (aiPanel.fields || []).map((f: any, fieldIndex: number) => {
        const tableSchema = simplifiedTables.find((t: any) => t.table_name === f.table);
        const colSchema = tableSchema?.columns?.find((c: any) => c.column_name === f.column);
        if (!tableSchema) console.warn(`[AI Dashboard] ⚠ Panel "${aiPanel.title}": tabla "${f.table}" NO encontrada`);
        else if (!colSchema) console.warn(`[AI Dashboard] ⚠ Panel "${aiPanel.title}": columna "${f.column}" NO encontrada en "${f.table}"`);
        return {
            table_id: f.table,
            column_name: f.column,
            column_type: colSchema?.column_type || 'text',
            old_column_type: colSchema?.column_type || 'text',
            display_name: f.label || colSchema?.display_name || f.column,
            format: null,
            aggregation_type: f.agg || 'none',
            column_granted_roles: [],
            row_granted_roles: [],
            ordenation_type: f.sort || 'No',
            order: fieldIndex,
        };
    });
}

function buildPanel(
    aiPanel: any,
    w: number, h: number, x: number, y: number,
    index: number,
    simplifiedTables: any[],
    datasource_id: string,
): any {
    const chartType: string = aiPanel.edaChart || aiPanel.chart_type || 'table';
    const fields = buildFields(aiPanel, simplifiedTables, datasource_id);
    return {
        id: uuidv4(),
        title: aiPanel.title || `Panel ${index + 1}`,
        type: 0,
        w, h, x, y, cols: w, rows: h,
        content: {
            query: {
                model_id: datasource_id,
                query: {
                    fields,
                    filters: [],
                    queryMode: 'EDA',
                    rootTable: aiPanel.fields?.[0]?.table || '',
                    joinType: 'inner',
                    queryLimit: aiPanel.queryLimit || 1000,
                    groupByEnabled: true,
                },
                output: { labels: fields.map((f: any) => f.column_name), data: [] },
            },
            chart: chartType,
            edaChart: chartType,
        },
    };
}

// ── Layout ────────────────────────────────────────────────────────────────────

function layoutPanels(
    aiPanels: any[],
    isStandardMode: boolean,
    simplifiedTables: any[],
    datasource_id: string,
): any[] {
    const bp = (p: any, w: number, h: number, x: number, y: number, i: number) =>
        buildPanel(p, w, h, x, y, i, simplifiedTables, datasource_id);

    if (!isStandardMode) {
        return aiPanels.map((p, i) => {
            const w = Math.floor(GRID_W / FALLBACK_COLS);
            return bp(p, w, FALLBACK_H, (i % FALLBACK_COLS) * w, Math.floor(i / FALLBACK_COLS) * FALLBACK_H, i);
        });
    }

    const kpiPanels   = aiPanels.filter((p: any) => (p.edaChart || p.chart_type) === 'kpi');
    const chartPanels = aiPanels.filter((p: any) => ['bar', 'line', 'doughnut'].includes(p.edaChart || p.chart_type));
    const tablePanels = aiPanels.filter((p: any) => (p.edaChart || p.chart_type) === 'table');

    console.log(`[AI Dashboard] Layout — KPIs: ${kpiPanels.length} | Gráficos: ${chartPanels.length} | Tablas: ${tablePanels.length}`);

    const kpiW   = kpiPanels.length   > 0 ? Math.floor(GRID_W / kpiPanels.length)   : GRID_W;
    const chartW = chartPanels.length > 0 ? Math.floor(GRID_W / chartPanels.length) : GRID_W;
    const kpiRowH   = kpiPanels.length   > 0 ? KPI_H   : 0;
    const chartRowH = chartPanels.length > 0 ? CHART_H : 0;

    return [
        ...kpiPanels.map((p, i)   => bp(p, kpiW,   KPI_H,   i * kpiW,   0,                    i)),
        ...chartPanels.map((p, i) => bp(p, chartW,  CHART_H, i * chartW, kpiRowH,               kpiPanels.length + i)),
        ...tablePanels.map((p, i) => bp(p, GRID_W,  TABLE_H, 0,          kpiRowH + chartRowH,   kpiPanels.length + chartPanels.length + i)),
    ];
}

// ── Rate limit helper ─────────────────────────────────────────────────────────

async function checkRateLimits(userId: string, config: any, res: Response): Promise<boolean> {
    const { LIMIT, MAX_LIMIT } = config;
    const totalCount = await AIUsage.countDocuments({});
    if (totalCount >= MAX_LIMIT) {
        res.status(429).json({ ok: false, response: 'El sistema ha alcanzado el límite máximo de consultas disponibles.' });
        return false;
    }
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end   = new Date(); end.setHours(23, 59, 59, 999);
    const todayCount = await AIUsage.countDocuments({ user: userId, createdAt: { $gte: start, $lte: end } });
    if (todayCount >= LIMIT) {
        res.status(429).json({ ok: false, response: `Has alcanzado el límite diario de ${LIMIT} consultas. Inténtalo de nuevo mañana.` });
        return false;
    }
    return true;
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function generateDashboard(req: Request, res: Response, next: NextFunction, config: any): Promise<void> {
    const { datasource_id, description, title, visible, group } = req.body;
    if (!datasource_id || !description || !title) {
        return next(new HttpException(400, 'datasource_id, description y title son obligatorios'));
    }

    const userId = (req as any).user?._id;
    const allowed = await checkRateLimits(userId, config, res);
    if (!allowed) return;

    const ds = await DataSource.findById(datasource_id);
    if (!ds) return next(new HttpException(404, 'Datasource no encontrado'));

    const schema = filterDatasourceForAI(ds);
    if (!schema) return next(new HttpException(400, 'Datasource no disponible para IA'));
    console.log(`[AI Dashboard] Datasource: "${schema.model_name}"`);

    const simplifiedTables = buildSimplifiedTables(schema);
    const schemaText = JSON.stringify(simplifiedTables, null, 2);

    const isStandardMode = STANDARD_MODE_PATTERN.test(description);
    console.log(`[AI Dashboard] Modo: ${isStandardMode ? 'ESTÁNDAR' : 'EXPLÍCITO'} | "${description}"`);

    const userPrompt = isStandardMode
        ? buildStandardUserPrompt(schema.model_name, schemaText, description)
        : buildExplicitUserPrompt(schema.model_name, schemaText, description);

    const panelsText = await callAI(config, DASHBOARD_SYSTEM_PROMPT, userPrompt);
    console.log(`[AI Dashboard] Respuesta IA raw:\n${panelsText}`);

    let aiPanels: any[];
    try {
        const jsonMatch = panelsText.trim().match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error('No se encontró array JSON en la respuesta');
        aiPanels = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(aiPanels) || aiPanels.length === 0) throw new Error('El array de paneles está vacío');
        console.log(`[AI Dashboard] Paneles: ${aiPanels.length}`);
        aiPanels.forEach((p, i) =>
            console.log(`  ${i + 1}. "${p.title}" [${p.chart_type}] ${(p.fields || []).map((f: any) => `${f.table}.${f.column}(${f.agg})`).join(', ')}`));
    } catch (err: any) {
        console.error('[AI Dashboard] Respuesta inválida:', panelsText);
        return next(new HttpException(500, `La IA no generó un formato válido: ${err.message}`));
    }

    const panels = layoutPanels(aiPanels, isStandardMode, simplifiedTables, datasource_id);

    const dashboard = new Dashboard({
        config: {
            ds: { _id: datasource_id },
            title,
            visible,
            panel: panels,
            author: req.user.name,
            tag: null,
            refreshTime: null,
            clickFiltersEnabled: true,
            styles: {},
            external: null,
        },
        user: req.user._id,
        group: visible === 'group' && group ? group : [],
    });

    await dashboard.save();
    await AIUsage.create({ user: userId, prompt: description, modelUsed: config.MODEL });
    res.status(201).json({ ok: true, dashboard });
}
