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
                return {
                    type: 'query_ready',
                    output_text: 'Se ha configurado con éxito la consulta solicitada, con los valores selecionados.',
                    currentQuery: pendingResult.currentQuery,
                    principalTable: pendingResult.principalTable,
                    selectedFilters: [...pendingResult.resolvedFilters, resolvedFilter],
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

        const messages: NormalizedMessage[] = [
            { role: "system", content: `${config.CONTEXT}\n\n${PromptUtil.buildSystemMessage(schema)}` },
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

        if (toolGetAssistantResponse) {
            return { output_text: toolGetAssistantResponse.arguments?.message ?? 'Hola, ¿en qué puedo ayudarte?' };
        }

        if (!toolGetFields) {
            return { output_text: 'No pude identificar los campos necesarios. ¿Podrías reformular la consulta?' };
        }

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
                    const options = await QueryResolver.getAllFilterOptions(validation.unresolvedFilter, parameters);
                    const numberedList = options.map((opt: string, i: number) => `${i + 1}. ${opt}`).join('\n');
                    const notFoundText = validation.notFound.join('", "');
                    return {
                        type: 'awaiting_resolution',
                        output_text: `No encontré "${notFoundText}" en la columna "${validation.unresolvedFilter.column}". Aquí tienes las opciones disponibles:\n\n${numberedList}\n\n¿Cuáles quieres usar?`,
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
        }

        return result;
    }

}
