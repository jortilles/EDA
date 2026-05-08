import * as path from 'path';
import { PromptUtil } from '../../utils/prompt.util';
import QueryResolver from './query/query-resolver.service';
import { AIProviderFactory } from './providers/ai-provider.factory';
import { NormalizedMessage } from './providers/ai-provider.interface';
import { AI_TOOLS } from './prompt-tools.definition';

const getAiConfig = () => {
    const configPath = path.resolve(__dirname, '../../../config/ai.config.js');
    delete require.cache[require.resolve(configPath)];
    return require(configPath);
};

interface FilterResolutionState {
    state: 'get_all' | 'search_pattern' | 'user_selected';
    unresolvedFilter: any;
    pendingResult: any;
    pattern?: string;
    selectedValues?: any[];
}

interface PromptParams {
    dataSource_id?: string;
    filterResolution?: FilterResolutionState;
}

interface PromptParameters {
    text: string,
    history: any[],
    data: any[],
    schema: any[],
    parameters?: PromptParams
}

export class PromptService {

    private static filterSchemaForAI(schema: any[]): any[] {
        return schema
            .map((table: any) => ({
                ...table,
                columns: (table.columns ?? []).filter((col: any) => col.ia_visibility !== 'NONE')
            }))
            .filter((table: any) => table.columns.length > 0);
    }

    private static suggestCharts(currentQuery: any[]): { type: string, subType: string, label: string }[] {
        
        const numeric = currentQuery.filter((c: any) => c.column_type === 'numeric');
        const text    = currentQuery.filter((c: any) => c.column_type === 'text');
        const date    = currentQuery.filter((c: any) => c.column_type === 'date');
        const coord   = currentQuery.filter((c: any) => c.column_type === 'coordinate');

        console.log('numeric: ', numeric.length)
        console.log('text: ', text.length)
        console.log('date: ', date.length)
        console.log('coord: ', coord.length)

        const suggestions: { type: string, subType: string, label: string }[] = [];

        // Coordinate map
        if (coord.length === 2) {
            suggestions.push({ type: 'coordinatesMap', subType: 'coordinatesMap', label: 'Mapa' });
        }

        // KPI: exactly 1 column, numeric
        if (currentQuery.length === 1 && numeric.length === 1) {
            suggestions.push({ type: 'kpi', subType: 'kpi', label: 'KPI' });
        }

        // Knob (Velocímetro): 1 or 2 columns, all numeric
        if (currentQuery.length <= 2 && numeric.length === currentQuery.length && numeric.length >= 1) {
            suggestions.push({ type: 'knob', subType: 'knob', label: 'Velocímetro' });
        }

        // Pie & Polar: exactly 1 numeric + 1 text or date (2 columns total)
        if (currentQuery.length === 2 && numeric.length === 1 || (currentQuery.length === 2 && numeric.length === 2)) {
            suggestions.push({ type: 'doughnut',  subType: 'doughnut',  label: 'Pastel' });
            suggestions.push({ type: 'polarArea', subType: 'polarArea', label: 'Área polar' });
            suggestions.push({ type: 'kpibar', subType: 'kpibar', label: 'Kpi Bar' });
            suggestions.push({ type: 'kpiline', subType: 'kpiline', label: 'Kpi Line' });
            suggestions.push({ type: 'kpiline', subType: 'kpiarea', label: 'Kpi Area' });
        }

        // Bar & Line
        if (numeric.length>=1 && currentQuery.length>1 && (currentQuery.length - numeric.length)<2 || numeric.length===1 && currentQuery.length>1 && currentQuery.length<4) {
            suggestions.push({ type: 'line', subType: 'line', label: 'Líneas' });
            suggestions.push({ type: 'line', subType: 'area', label: 'Área' });
            suggestions.push({ type: 'bar', subType: 'bar',           label: 'Barras' });
            suggestions.push({ type: 'bar', subType: 'horizontalBar', label: 'Barras horizontales' });
            suggestions.push({ type: 'bar', subType: 'stackedbar', label: 'Barras apiladas' });
        }

        // Histogram: exactly 1 numeric column only
        if (currentQuery.length === 1 && numeric.length === 1) {
            suggestions.push({ type: 'bar', subType: 'histogram', label: 'Histograma' });
        }

        if ((currentQuery.length-numeric.length) === 1 && numeric.length >= 1 && currentQuery.length>=2) {
            suggestions.push({ type: 'radar', subType: 'radar', label: 'Radar' });
        }

        if (currentQuery.length === 3 && numeric.length === 1 ) {
            suggestions.push({ type: 'bar', subType: 'pyramid', label: 'Piramide' });
        }

        if (currentQuery.length > 2 && (currentQuery.length-numeric.length)>=1 && numeric.length === 1 ) {
            suggestions.push({ type: 'sunburst', subType: 'sunburst', label: 'Sunburst' });
        }

        if (currentQuery.length > 2 ) {
            suggestions.push({ type: 'treetable', subType: 'treetable', label: 'Tabla árbol' });
        }

        if (numeric.length === 1 && (currentQuery.length-numeric.length) === 1) {
            suggestions.push({ type: 'funnel', subType: 'funnel', label: 'Funnel' });
        }

        if (numeric.length === 1 && (currentQuery.length-numeric.length) > 0) {
            suggestions.push({ type: 'treeMap', subType: 'treeMap', label: 'TreeMap' });
        }

        // Crosstable: at least 3 columns, at least 1 numeric
        if (currentQuery.length > 2 && numeric.length >= 1) {
            suggestions.push({ type: 'crosstable', subType: 'crosstable', label: 'Tabla cruzada' });
        }

        // Table: always
        suggestions.push({ type: 'table', subType: 'table', label: 'Tabla' });

        return suggestions;
    }

    private static isDeclarationColumn(column: string, table: string, schema: any[]): boolean {
        const tableSchema = schema.find((t: any) => t.table?.toLowerCase() === table?.toLowerCase());
        const col = tableSchema?.columns?.find((c: any) => c.column?.toLowerCase() === column?.toLowerCase());
        return col?.ia_visibility === 'DECLARATION';
    }

    static async generateSuggestions(schema: any[]): Promise<string[]> {
        const config = getAiConfig();
        const provider = AIProviderFactory.create(config);

        // Filtracion de solo columnas permitidas, es decir difenretes de NONE
        const visibleSchema = PromptService.filterSchemaForAI(schema);

        const schemaText = visibleSchema.map((t: any) =>
            `Tabla: ${t.table}${t.description ? ` (${t.description})` : ''}\nColumnas: ${t.columns.map((c: any) => `${c.column} (${c.column_type})`).join(', ')}`
        ).join('\n\n');

        const { text } = await provider.complete([
            { role: 'system', content: 'Eres un asistente de análisis de datos. Dado un esquema de base de datos, genera exactamente 3 preguntas cortas y naturales en español que un usuario de negocio querría hacer sobre estos datos. Devuelve SOLO un array JSON de strings, sin explicación ni markdown. Ejemplo: ["Pregunta 1", "Pregunta 2", "Pregunta 3"]' },
            { role: 'user', content: `Esquema disponible:\n${schemaText}\n\nGenera 3 preguntas de inicio.` }
        ], []);

        try {
            const parsed = JSON.parse(text ?? '[]');
            return Array.isArray(parsed) ? parsed.slice(0, 4) : [];
        } catch {
            return [];
        }
    }

    static async processPrompt(params: PromptParameters) {

        const { text, history, data, schema, parameters } = params;
        const config = getAiConfig();
        const provider = AIProviderFactory.create(config);

        if (PromptUtil.isForbidden(text)) {
            return {
                ok: false,
                response: "No puedo responder a esa pregunta, intentelo nuevamente."
            }
        }

        //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////  Filter Resolution  //////////////////////////////////////////////////////
        //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        if (parameters?.filterResolution) {
            const { state, unresolvedFilter, pendingResult, pattern, selectedValues } = parameters.filterResolution;

            if (state === 'get_all') {
                if (PromptService.isDeclarationColumn(unresolvedFilter.column, unresolvedFilter.table, schema)) {
                    return {
                        type: 'awaiting_resolution',
                        output_text: `No puedo mostrar los valores disponibles para la columna "${unresolvedFilter.column}" ya que está configurada con acceso restringido. Por favor, escribe el valor directamente.`,
                        unresolvedFilter,
                        pendingResult
                    };
                }
                const options = await QueryResolver.getAllFilterOptions(unresolvedFilter, parameters);
                if (options.length === 0) {
                    return {
                        type: 'awaiting_resolution',
                        output_text: `No hay valores disponibles en la columna "${unresolvedFilter.column}". ¿Quieres reformular tu consulta?`,
                        unresolvedFilter,
                        pendingResult
                    };
                }
                const numberedList = options.map((opt: string, i: number) => `${i + 1}. ${opt}`).join('\n');
                return {
                    type: 'awaiting_selection',
                    output_text: `Opciones disponibles para "${unresolvedFilter.column}":\n\n${numberedList}\n\n¿Cuáles quieres usar?`,
                    options,
                    unresolvedFilter,
                    pendingResult
                };
            }

            if (state === 'search_pattern') {
                if (PromptService.isDeclarationColumn(unresolvedFilter.column, unresolvedFilter.table, schema)) {
                    return {
                        type: 'awaiting_resolution',
                        output_text: `No puedo mostrar los valores disponibles para la columna "${unresolvedFilter.column}" ya que está configurada con acceso restringido. Por favor, escribe el valor directamente.`,
                        unresolvedFilter,
                        pendingResult
                    };
                }
                const options = await QueryResolver.searchFilterByPattern(unresolvedFilter, pattern!, parameters);
                if (options.length === 0) {
                    return {
                        type: 'awaiting_resolution',
                        output_text: `No encontré ningún valor parecido a "${pattern}". ¿Quieres ver todas las opciones disponibles o prefieres darme otro patrón de búsqueda?`,
                        unresolvedFilter,
                        pendingResult
                    };
                }
                const numberedList = options.map((opt: string, i: number) => `${i + 1}. ${opt}`).join('\n');
                return {
                    type: 'awaiting_selection',
                    output_text: `Encontré estas opciones parecidas a "${pattern}":\n\n${numberedList}\n\n¿Cuáles quieres usar?`,
                    options,
                    unresolvedFilter,
                    pendingResult
                };
            }

            if (state === 'user_selected') {
                const resolvedFilter = QueryResolver.getFilters([{ ...unresolvedFilter, values: selectedValues }])[0];
                const allFilters = [...pendingResult.resolvedFilters, resolvedFilter];

                const tablesInvolved = [...new Set(pendingResult.currentQuery.map((c: any) => c.table_id))].join(', ');

                const fieldLines = pendingResult.currentQuery.map((c: any) => {
                    const label = c.display_name?.default ?? c.column_name;
                    const selectedAgg = c.aggregation_type?.find((a: any) => a.selected);
                    const aggLabel = selectedAgg && selectedAgg.value !== 'none' ? ` — ${selectedAgg.display_name}` : '';
                    return `  • ${label}${aggLabel}`;
                }).join('\n');

                const filterTypeLabel: Record<string, string> = {
                    '=': '=', '!=': '≠', '>': '>', '<': '<', '>=': '≥', '<=': '≤',
                    'like': 'contiene', 'not_like': 'no contiene',
                    'in': 'en', 'not_in': 'no en', 'between': 'entre',
                    'not_null': 'no es nulo', 'not_null_nor_empty': 'no es nulo ni vacío', 'null_or_empty': 'es nulo o vacío',
                };
                const filterLines = allFilters.map((f: any) => {
                    const op = filterTypeLabel[f.filter_type] ?? f.filter_type;
                    const v1 = f.filter_elements?.[0]?.value1;
                    const v2 = f.filter_elements?.[1]?.value2;
                    const values = f.filter_type === 'between' && v1 && v2
                        ? `${v1[0]} y ${v2[0]}`
                        : Array.isArray(v1) && v1.length > 0 ? v1.join(', ') : '';
                    return `  • ${f.filter_column} ${op}${values ? ` ${values}` : ''}`;
                }).join('\n');

                const structuredSummary = `Tabla: **${tablesInvolved}**\n\nCampos seleccionados:\n${fieldLines}\n\nFiltros aplicados:\n${filterLines}`;

                const { text: summaryText } = await provider.complete([
                    { role: 'system', content: 'Eres un asistente de análisis de datos. Responde siempre en español, de forma breve y natural. Sin emojis.' },
                    { role: 'user', content: `El usuario confirmó los valores de un filtro y la consulta quedó completamente configurada:\n\n${structuredSummary}\n\nGenera una frase corta y natural confirmando que la configuración está lista.` }
                ], []);

                return {
                    type: 'query_ready',
                    output_text: `${summaryText ?? 'Consulta configurada con los valores seleccionados.'}\n\n${structuredSummary}`,
                    currentQuery: pendingResult.currentQuery,
                    principalTable: pendingResult.principalTable,
                    selectedFilters: allFilters,
                    filteredColumns: pendingResult.filteredColumns
                };
            }
        }

        //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////  Preparación mensajes  ///////////////////////////////////////////////////
        //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        const safeHistory: NormalizedMessage[] = Array.isArray(history) ? history.map((m: any) => {
            let content = "";
            if (typeof m.content === "string") content = m.content;
            else if (m.content && typeof m.content === "object") {
                content = m.content.text ?? JSON.stringify(m.content);
            } else {
                content = String(m.content ?? "");
            }
            return {
                role: m.role === "assistant" ? "assistant" : m.role === "system" ? "system" : "user",
                content,
            };
        }) : [];

        // Filtracion de solo columnas permitidas, es decir difenretes de NONE
        const visibleSchema = PromptService.filterSchemaForAI(schema);

        const messages: NormalizedMessage[] = [
            { role: "system", content: `${config.CONTEXT}\n\n${PromptUtil.buildSystemMessage(visibleSchema)}` },
            ...safeHistory,
            { role: "user", content: text }
        ];

        //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////  Function Calling  ///////////////////////////////////////////////////////
        //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        const { toolCalls } = await provider.complete(messages, AI_TOOLS);

        const toolGetAssistantResponse = toolCalls.find(t => t.name === "getAssistantResponse");
        const toolGetFields = toolCalls.find(t => t.name === "getFields");
        const toolGetFilters = toolCalls.find(t => t.name === "getFilters");

        console.log('toolGetAssistantResponse: ',toolGetAssistantResponse)
        console.log('toolGetFields: ',toolGetFields)
        console.log('toolGetFilters: ',toolGetFilters)


        if (toolGetAssistantResponse) {
            return { output_text: toolGetAssistantResponse.arguments?.message ?? 'Hola, ¿en qué puedo ayudarte?' };
        }

        if (!toolGetFields) {
            return { output_text: 'No pude identificar los campos necesarios. ¿Podrías reformular la consulta?' };
        }

        // Definición del Result enviado al Frontend
        const result: any = {
            output_text: '',
            currentQuery: [],
            principalTable: null,
            selectedFilters: [],
            filteredColumns: [],
            queryLimit: 5000,
        };

        if (toolGetFields) {
            const args = toolGetFields.arguments ?? {};
            const tables = Array.isArray(args.tables) ? args.tables : [];
            result.queryLimit = typeof args.limit === 'number' ? args.limit : 5000;

            if (tables.length === 0) {
                return { output_text: 'No se encontraron tablas en la consulta. Por favor, especifica la tabla.', currentQuery: [], principalTable: null, selectedFilters: [] };
            }

            const principalTable = tables[0].table ?? null;
            const currentQueryTool = QueryResolver.getFields(tables, data);

            result.currentQuery = currentQueryTool;
            result.principalTable = principalTable;
            result.suggestedCharts = currentQueryTool.length > 0 ? PromptService.suggestCharts(currentQueryTool) : [];

            if (currentQueryTool.length === 0) {
                result.output_text = 'Podrías ser más preciso en tu consulta.';
            } else {
                const tablesInvolved = [...new Set(currentQueryTool.map((c: any) => c.table_id))].join(', ');
                const fieldLines = currentQueryTool.map((c: any) => {
                    const label = c.display_name?.default ?? c.column_name;
                    const selectedAgg = c.aggregation_type?.find((a: any) => a.selected);
                    const aggLabel = selectedAgg && selectedAgg.value !== 'none' ? ` — ${selectedAgg.display_name}` : '';
                    return `  • ${label}${aggLabel}`;
                }).join('\n');
                const limitLine = result.queryLimit !== 5000 ? `\n\nLímite de filas: ${result.queryLimit}` : '';
                const structuredSummary = `Tabla: **${tablesInvolved}**\n\nCampos seleccionados:\n${fieldLines}${limitLine}`;

                const { text: summaryText } = await provider.complete([
                    { role: 'system', content: 'Eres un asistente de análisis de datos. Responde siempre en español, de forma breve y natural. Sin emojis.' },
                    { role: 'user', content: `El usuario solicitó una consulta y se configuró lo siguiente:\n\n${structuredSummary}\n\nGenera una frase corta y natural confirmando la configuración realizada.` }
                ], []);

                result.output_text = `${summaryText ?? 'Consulta configurada correctamente.'}\n\n${structuredSummary}`;
            }
        }

        if (toolGetFilters) {
            const args = toolGetFilters.arguments ?? {};
            const filters = Array.isArray(args.filters) ? args.filters : [];
            const currentQuery = result.currentQuery;

            if (filters.length > 0 && parameters?.dataSource_id) {
                const validation = await QueryResolver.validateTextFilters(filters, parameters);
                if (validation.unresolvedFilter) {
                    const { unresolvedFilter } = validation;
                    const notFoundText = validation.notFound.join('", "');

                    if (PromptService.isDeclarationColumn(unresolvedFilter.column, unresolvedFilter.table, schema)) {
                        return {
                            type: 'awaiting_resolution',
                            output_text: `No puedo mostrar los valores disponibles para la columna "${unresolvedFilter.column}" ya que está configurada con acceso restringido. Por favor, escribe el valor directamente.`,
                            unresolvedFilter,
                            pendingResult: {
                                currentQuery: result.currentQuery,
                                principalTable: result.principalTable,
                                filteredColumns: QueryResolver.getFilteredColumns(validation.resolvedFiltersRaw, result.currentQuery),
                                resolvedFilters: QueryResolver.getFilters(validation.resolvedFiltersRaw)
                            }
                        };
                    }

                    const options = await QueryResolver.getAllFilterOptions(unresolvedFilter, parameters);
                    const numberedList = options.map((opt: string, i: number) => `${i + 1}. ${opt}`).join('\n');
                    return {
                        type: 'awaiting_resolution',
                        output_text: `No encontré "${notFoundText}" en la columna "${unresolvedFilter.column}". Aquí tienes las opciones disponibles:\n\n${numberedList}\n\n¿Cuáles quieres usar?`,
                        options,
                        unresolvedFilter: validation.unresolvedFilter,
                        pendingResult: {
                            currentQuery: result.currentQuery,
                            principalTable: result.principalTable,
                            filteredColumns: QueryResolver.getFilteredColumns(validation.resolvedFiltersRaw, currentQuery),
                            resolvedFilters: QueryResolver.getFilters(validation.resolvedFiltersRaw)
                        }
                    };
                }
            }

            result.selectedFilters = filters.length === 0 ? [] : QueryResolver.getFilters(filters);
            result.filteredColumns = filters.length === 0 ? [] : QueryResolver.getFilteredColumns(filters, currentQuery);

            if (filters.length > 0) {
                const filterTypeLabel: Record<string, string> = {
                    '=': '=', '!=': '≠', '>': '>', '<': '<', '>=': '≥', '<=': '≤',
                    'like': 'contiene', 'not_like': 'no contiene',
                    'in': 'en', 'not_in': 'no en',
                    'between': 'entre',
                    'not_null': 'no es nulo',
                    'not_null_nor_empty': 'no es nulo ni vacío',
                    'null_or_empty': 'es nulo o vacío',
                };
                const filterLines = filters.map((f: any) => {
                    const op = filterTypeLabel[f.filter_type] ?? f.filter_type;
                    const values = Array.isArray(f.values) && f.values.length > 0
                        ? f.filter_type === 'between'
                            ? `${f.values[0]} y ${f.values[1]}`
                            : f.values.join(', ')
                        : '';
                    return `  • ${f.column} ${op}${values ? ` ${values}` : ''}`;
                }).join('\n');
                result.output_text += `\n\nFiltros aplicados:\n${filterLines}`;
            }
        }

        return result;
    }

}
