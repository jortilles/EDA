import { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';
import { HttpException } from '../global/model/index';
import { AIProviderFactory } from '../../services/prompt/providers/ai-provider.factory';
import { NormalizedMessage } from '../../services/prompt/providers/ai-provider.interface';
import { filterDatasourceForAI } from '../mcp/mcp.helpers';
import { ManagerConnectionService } from '../../services/connection/manager-connection.service';
import DataSource from '../datasource/model/datasource.model';
import Dashboard from '../dashboard/model/dashboard.model';
import AIUsage from './model/ai-usage.model';
import { DASHBOARD_SYSTEM_PROMPT, buildUserPrompt } from './ai-prompts';

const GRID_W = 40;
const KPI_H = 4;
const CHART_H = 12;
const TABLE_H = 15;

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
            const relations = (t.relations || [])
                .filter((r: any) => r.target_table)
                .map((r: any) => {
                    const srcCol = Array.isArray(r.source_column) ? r.source_column[0] : r.source_column;
                    const tgtCol = Array.isArray(r.target_column) ? r.target_column[0] : r.target_column;
                    return {
                        target_table: r.target_table,
                        on: srcCol && tgtCol ? `${tableName}.${srcCol} = ${r.target_table}.${tgtCol}` : undefined,
                    };
                });
            return { table_name: tableName, columns: cols, relations };
        })
        .filter((t: any) => t.columns.length > 0);

    console.log(`[AI Dashboard] Tablas enviadas al AI: ${simplified.length} — ${simplified.map((t: any) => t.table_name).join(', ')}`);

    return simplified;
}

function findMainTable(simplifiedTables: any[]): any {
    return simplifiedTables.reduce((best: any, t: any) =>
        t.columns.length > (best?.columns.length ?? 0) ? t : best
    , null);
}

// ── Sample data ───────────────────────────────────────────────────────────────

async function fetchTableSample(datasource_id: string, tableName: string): Promise<Record<string, any>[]> {
    try {
        const connection = await ManagerConnectionService.getConnection(datasource_id);
        connection.client = await connection.getclient();
        const rows = await connection.execSqlQuery(`SELECT * FROM "${tableName}" LIMIT 10`);
        return Array.isArray(rows) ? rows.slice(0, 10) : [];
    } catch (err: any) {
        console.warn(`[AI Dashboard] No se pudo obtener muestra de "${tableName}": ${err.message}`);
        return [];
    }
}

async function collectSampleData(
    datasource_id: string,
    mainTable: any,
    allTables: any[],
): Promise<Record<string, Record<string, any>[]>> {
    // Main table first, then tables it relates to (up to 4 total)
    const names: string[] = [mainTable.table_name];
    for (const rel of (mainTable.relations || [])) {
        if (names.length >= 4) break;
        if (allTables.find((t: any) => t.table_name === rel.target_table)) {
            names.push(rel.target_table);
        }
    }

    const result: Record<string, Record<string, any>[]> = {};
    await Promise.all(names.map(async name => {
        result[name] = await fetchTableSample(datasource_id, name);
    }));
    console.log(`[AI Dashboard] Muestra recogida — ${names.map(n => `${n}(${result[n].length})`).join(', ')}`);
    return result;
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

function buildGlobalFilterConfig(aiFilters: any[], simplifiedTables: any[], panelIds: string[]): any[] {
    return (aiFilters || []).map((f: any) => {
        const tableSchema = simplifiedTables.find((t: any) => t.table_name === f.table);
        const colSchema = tableSchema?.columns?.find((c: any) => c.column_name === f.column);
        const columnType = mapColumnType(colSchema?.column_type || 'text');

        let selectedItems: string[];
        let filter_type: string;
        let filter_elements: any[];

        if (f.op === 'year_eq') {
            const year = Number(f.value);
            selectedItems = [`${year}-01-01`, `${year}-12-31`];
            filter_type = 'between';
            filter_elements = [{ value1: [`${year}-01-01`] }, { value2: [`${year}-12-31`] }];
        } else if (f.op === 'between') {
            const [v1, v2] = Array.isArray(f.value) ? f.value : [f.value, f.value];
            selectedItems = [String(v1), String(v2)];
            filter_type = 'between';
            filter_elements = [{ value1: [String(v1)] }, { value2: [String(v2)] }];
        } else if (f.op === 'in') {
            const vals = Array.isArray(f.value) ? f.value : [f.value];
            selectedItems = vals.map(String);
            filter_type = 'in';
            filter_elements = [{ value1: vals.map(String) }];
        } else {
            selectedItems = [String(f.value)];
            filter_type = f.op;
            filter_elements = [{ value1: [String(f.value)] }];
        }

        return {
            id: uuidv4(),
            isGlobal: true,
            isAutocompleted: false,
            isMandatory: false,
            multipleSelection: true,
            queryMode: 'EDA',
            data: null,
            selectedTable: {
                table_name: f.table,
                display_name: { default: tableSchema?.table_name || f.table, localized: [] },
            },
            selectedColumn: {
                column_name: f.column,
                column_type: columnType,
                display_name: { default: colSchema?.display_name || f.column, localized: [] },
                aggregation_type: [],
                ordenation_type: 'Asc',
            },
            selectedItems,
            filter_type,
            filter_elements,
            panelList: panelIds,
            pathList: {},
            type: columnType,
            visible: 'public',
            applyToAll: true,
            filterBeforeGrouping: true,
        };
    });
}

function mapColumnType(raw: string): 'text' | 'numeric' | 'date' {
    if (['date', 'datetime', 'timestamp', 'timestamptz', 'time'].includes(raw)) return 'date';
    if (['numeric', 'integer', 'int2', 'int4', 'int8', 'float4', 'float8', 'decimal', 'number', 'double'].includes(raw)) return 'numeric';
    return 'text';
}

function buildFields(aiPanel: any, simplifiedTables: any[]): any[] {
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

function buildPanelFilters(aiFilters: any[], simplifiedTables: any[], panelTitle: string, isGlobal = false): any[] {
    return (aiFilters || []).map((f: any) => {
        const tableSchema = simplifiedTables.find((t: any) => t.table_name === f.table);
        const colSchema = tableSchema?.columns?.find((c: any) => c.column_name === f.column);
        if (!colSchema) console.warn(`[AI Dashboard] ⚠ Filtro${isGlobal ? ' global' : ''} "${panelTitle}": columna "${f.table}.${f.column}" NO encontrada`);

        const filter_column_type = mapColumnType(colSchema?.column_type || 'text');
        const base = {
            filter_table: f.table,
            filter_column: f.column,
            filter_column_type,
            isGlobal,
            filterBeforeGrouping: true,
        };

        if (f.op === 'year_eq') {
            const year = Number(f.value);
            return { ...base, filter_type: 'between', filter_elements: [{ value1: [`${year}-01-01`] }, { value2: [`${year}-12-31`] }] };
        }
        if (f.op === 'between') {
            const [v1, v2] = Array.isArray(f.value) ? f.value : [f.value, f.value];
            return { ...base, filter_type: 'between', filter_elements: [{ value1: [String(v1)] }, { value2: [String(v2)] }] };
        }
        if (f.op === 'in') {
            const vals = Array.isArray(f.value) ? f.value : [f.value];
            return { ...base, filter_type: 'in', filter_elements: [{ value1: vals.map(String) }] };
        }
        if (f.op === '!=' || f.op === 'neq') {
            return { ...base, filter_type: 'not_in', filter_elements: [{ value1: [String(f.value)] }] };
        }
        // '=', '>', '>=', '<', '<='
        return { ...base, filter_type: f.op, filter_elements: [{ value1: [String(f.value)] }] };
    });
}

function buildPanel(
    aiPanel: any,
    w: number, h: number, x: number, y: number,
    index: number,
    simplifiedTables: any[],
    datasource_id: string,
    dashboardFilters: any[] = [],
): any {
    const chartType: string = aiPanel.edaChart || aiPanel.chart_type || 'table';
    const fields = buildFields(aiPanel, simplifiedTables);
    const panelFilters = buildPanelFilters(aiPanel.filters, simplifiedTables, aiPanel.title, false);
    const globalFilters = buildPanelFilters(dashboardFilters, simplifiedTables, 'dashboard', true);
    const filters = [...globalFilters, ...panelFilters];
    return {
        id: uuidv4(),
        title: aiPanel.title || `Panel ${index + 1}`,
        description: aiPanel.description || '',
        type: 0,
        w, h, x, y, cols: w, rows: h,
        content: {
            query: {
                model_id: datasource_id,
                query: {
                    fields,
                    filters,
                    queryMode: 'EDA',
                    rootTable: aiPanel.fields?.find((f: any) => !f.agg || f.agg === 'none')?.table || aiPanel.fields?.[0]?.table || '',
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

function rowDims(index: number, total: number): { x: number; w: number } {
    const base = Math.floor(GRID_W / total);
    const x = base * index;
    return { x, w: index === total - 1 ? GRID_W - x : base };
}

function layoutPanels(aiPanels: any[], simplifiedTables: any[], datasource_id: string, dashboardFilters: any[] = []): any[] {
    const bp = (p: any, w: number, h: number, x: number, y: number, i: number) =>
        buildPanel(p, w, h, x, y, i, simplifiedTables, datasource_id, dashboardFilters);

    const kpiPanels   = aiPanels.filter((p: any) => (p.edaChart || p.chart_type) === 'kpi');
    const chartPanels = aiPanels.filter((p: any) => ['bar', 'line', 'doughnut'].includes(p.edaChart || p.chart_type));
    const tablePanels = aiPanels.filter((p: any) => (p.edaChart || p.chart_type) === 'table');

    // If AI returned exactly 2 KPIs, add a 3rd to avoid asymmetric layout
    if (kpiPanels.length === 2) {
        kpiPanels.push({ ...kpiPanels[0] });
    }

    console.log(`[AI Dashboard] Layout — KPIs: ${kpiPanels.length} | Gráficos: ${chartPanels.length} | Tablas: ${tablePanels.length}`);

    const kpiRowH   = kpiPanels.length   > 0 ? KPI_H   : 0;
    const chartRowH = chartPanels.length > 0 ? CHART_H : 0;

    return [
        ...kpiPanels.map((p, i) => {
            const { x, w } = rowDims(i, kpiPanels.length);
            return bp(p, w, KPI_H, x, 0, i);
        }),
        ...chartPanels.map((p, i) => {
            const { x, w } = rowDims(i, chartPanels.length);
            return bp(p, w, CHART_H, x, kpiRowH, kpiPanels.length + i);
        }),
        ...tablePanels.map((p, i) =>
            bp(p, GRID_W, TABLE_H, 0, kpiRowH + chartRowH, kpiPanels.length + chartPanels.length + i)
        ),
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
    if (simplifiedTables.length === 0) {
        return next(new HttpException(400, 'El datasource no tiene tablas visibles para la IA. Revisa la configuración de visibilidad (ia_visibility).'));
    }
    const schemaText = JSON.stringify(simplifiedTables, null, 2);

    // Find the table with most columns (most likely the main/fact table)
    const mainTable = findMainTable(simplifiedTables);
    console.log(`[AI Dashboard] Tabla principal: "${mainTable?.table_name}" (${mainTable?.columns.length} cols)`);

    const sampleData = mainTable
        ? await collectSampleData(datasource_id, mainTable, simplifiedTables)
        : {};

    const userPrompt = buildUserPrompt(schema.model_name, schemaText, sampleData, description);

    const panelsText = await callAI(config, DASHBOARD_SYSTEM_PROMPT, userPrompt);
    console.log(`[AI Dashboard] Respuesta IA (${panelsText.length} chars)`);

    let aiPanels: any[];
    let dashboardFilters: any[] = [];
    try {
        const jsonMatch = panelsText.trim().match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error('No se encontró JSON en la respuesta');
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
            // fallback: old array format
            aiPanels = parsed;
        } else {
            aiPanels = parsed.panels || [];
            dashboardFilters = parsed.dashboard_filters || [];
        }
        if (!Array.isArray(aiPanels) || aiPanels.length === 0) throw new Error('El array de paneles está vacío');
        console.log(`[AI Dashboard] Paneles: ${aiPanels.length} | Filtros dashboard: ${dashboardFilters.length}`);
        if (dashboardFilters.length) console.log(`  Filtros globales: ${dashboardFilters.map((f: any) => `${f.table}.${f.column}(${f.op}:${f.value})`).join(', ')}`);
        aiPanels.forEach((p, i) =>
            console.log(`  ${i + 1}. "${p.title}" [${p.chart_type}] ${(p.fields || []).map((f: any) => `${f.table}.${f.column}(${f.agg})`).join(', ')}`));
    } catch (err: any) {
        console.error('[AI Dashboard] Respuesta inválida:', panelsText);
        return next(new HttpException(500, `La IA no generó un formato válido: ${err.message}`));
    }

    const panels = layoutPanels(aiPanels, simplifiedTables, datasource_id, dashboardFilters);
    const panelIds = panels.map((p: any) => p.id);
    const globalFiltersConfig = buildGlobalFilterConfig(dashboardFilters, simplifiedTables, panelIds);

    const dashboard = new Dashboard({
        config: {
            ds: { _id: datasource_id },
            title,
            visible,
            panel: panels,
            filters: globalFiltersConfig,
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
