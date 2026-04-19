// import OpenAI from "openai";
// import * as path from 'path';
// import { PromptUtil } from '../../utils/prompt.util';
// import QueryResolver from '../../services/prompt/query/query-resolver.service'

// const getChatgptConfig = () => {
//     const configPath = path.resolve(__dirname, '../../../config/chatgpt.config.js');
//     delete require.cache[require.resolve(configPath)];
//     return require(configPath);
// };

// interface FilterResolutionState {
//     state: 'get_all' | 'search_pattern' | 'user_selected';
//     unresolvedFilter: any;
//     pendingResult: any;
//     pattern?: string;
//     selectedValues?: any[];
// }

// interface PromptParams {
//     dataSource_id?: string;
//     filterResolution?: FilterResolutionState;
// }

// interface PromptParameters {
//     text: string,
//     history: any[],
//     data: any[],
//     schema: any[],
//     parameters?: PromptParams
// }

// export class PromptService {

//     static async processPrompt(params: PromptParameters) {

//         const { text, history, data, schema, parameters } = params;
//         const { API_KEY, MODEL, CONTEXT } = getChatgptConfig();
//         const openai = new OpenAI({ apiKey: API_KEY });

//         if(PromptUtil.isForbidden(text)) {
//             return {
//                 ok: false,
//                 response: "No puedo responder a esa pregunta, intentelo nuevamente."
//             }
//         }

//         //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//         ///////////////////////////////////////////////////////  Filter Resolution  //////////////////////////////////////////////////////
//         //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        
//         // Si el frontend envía un estado de resolución, respondemos sin llamar a OpenAI
//         if (parameters?.filterResolution) {
//             const { state, unresolvedFilter, pendingResult, pattern, selectedValues } = parameters.filterResolution;

//             // El usuario quiere ver todas las opciones disponibles
//             if (state === 'get_all') {
//                 const options = await QueryResolver.getAllFilterOptions(unresolvedFilter, parameters);
//                 if (options.length === 0) {
//                     return {
//                         type: 'awaiting_resolution',
//                         output_text: `No hay valores disponibles en la columna "${unresolvedFilter.column}". ¿Quieres reformular tu consulta?`,
//                         unresolvedFilter,
//                         pendingResult
//                     };
//                 }
//                 const numberedList = options.map((opt: string, i: number) => `${i + 1}. ${opt}`).join('\n');
//                 return {
//                     type: 'awaiting_selection',
//                     output_text: `Opciones disponibles para "${unresolvedFilter.column}":\n\n${numberedList}\n\n¿Cuáles quieres usar?`,
//                     options,
//                     unresolvedFilter,
//                     pendingResult
//                 };
//             }

//             // El usuario proporciona un patrón de búsqueda
//             if (state === 'search_pattern') {
//                 const options = await QueryResolver.searchFilterByPattern(unresolvedFilter, pattern!, parameters);
//                 if (options.length === 0) {
//                     return {
//                         type: 'awaiting_resolution',
//                         output_text: `No encontré ningún valor parecido a "${pattern}". ¿Quieres ver todas las opciones disponibles o prefieres darme otro patrón de búsqueda?`,
//                         unresolvedFilter,
//                         pendingResult
//                     };
//                 }
//                 const numberedList = options.map((opt: string, i: number) => `${i + 1}. ${opt}`).join('\n');
//                 return {
//                     type: 'awaiting_selection',
//                     output_text: `Encontré estas opciones parecidas a "${pattern}":\n\n${numberedList}\n\n¿Cuáles quieres usar?`,
//                     options,
//                     unresolvedFilter,
//                     pendingResult
//                 };
//             }

//             // El usuario ha seleccionado los valores definitivos
//             if (state === 'user_selected') {
//                 const resolvedFilter = QueryResolver.getFilters([{ ...unresolvedFilter, values: selectedValues }])[0];
//                 return {
//                     type: 'query_ready',
//                     output_text: 'Se ha configurado con éxito la consulta solicitada, con los valores selecionados.',
//                     currentQuery: pendingResult.currentQuery,
//                     principalTable: pendingResult.principalTable,
//                     selectedFilters: [...pendingResult.resolvedFilters, resolvedFilter],
//                     filteredColumns: pendingResult.filteredColumns
//                 };
//             }
//         }

//         // Sanitizar history: solo dejamos { role, content }
//         // Falta crear un tool para esta funcion para optimizar este tipo de filtrado
//         const safeHistory = Array.isArray(history) ? history.map((m: any) => {
//             // content puede llegar en distintos formatos, normalizamos a string
//             let content = "";
//             if (typeof m.content === "string") content = m.content;
//             else if (m.content && typeof m.content === "object") {
//                 // Si la estructura de content es similar a esto:  { text: '...' }:
//                 content = m.content.text ?? JSON.stringify(m.content);
//             } else {
//                 content = String(m.content ?? "");
//             }

//             // Devolvemos los campos permitidos para la API
//             return {
//                 role: m.role === "assistant" ? "assistant" : m.role === "system" ? "system" : "user",
//                 content: content,
//             };
//         }) : [];


//         // System prompt unificado + historial previo + mensaje actual del usuario
//         const messages: any = [
//             { role: "system", content: `${CONTEXT}\n\n${PromptUtil.buildSystemMessage(schema)}` },
//             ...safeHistory, // historial de la conversación
//             { role: "user", content: text } // ultimo mensaje que acaba de enviar el usuario
//         ];

        
//         //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//         //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//         ///////////////////////////////////////////////////////  Function Calling ////////////////////////////////////////////////////////
//         //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//         //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


//         // Agregación de todas las funciones de llamada
//         const tools: any[] = [getAssistantResponseTool, getFieldsTool, getFiltersTool];

//         // Consulta a la api de openAI
//         let response: any = await openai.responses.create({
//             model: MODEL,
//             input: messages,
//             tools: tools,
//             tool_choice: "required", // Obliga que las funciones tools sean utilizadas
//         })

//         const toolGetAssistantResponse: any = response.output?.find((tool: any) => tool.type === "function_call" && tool.name === "getAssistantResponse");
//         const toolGetFields: any = response.output?.find((tool: any) => tool.type === "function_call" && tool.name === "getFields");
//         const toolGetFilters: any = response.output?.find((tool: any) => tool.type === "function_call" && tool.name === "getFilters");

//         console.log('toolGetAssistantResponse ::::::::::::::::::::::: ', toolGetAssistantResponse);
//         console.log('toolGetFields ::::::::::::::::::::::: ', toolGetFields);
//         console.log('toolGetFilters ::::::::::::::::::::::: ', toolGetFilters);

//         // Filtro que permite respuesta amable del asistente al usuario
//         if (toolGetAssistantResponse) {
//             try {
//                 const args = toolGetAssistantResponse.arguments ? JSON.parse(toolGetAssistantResponse.arguments) : {};
//                 return { output_text: args.message ?? 'Hola, ¿en qué puedo ayudarte?' };
//             } catch {
//                 return { output_text: 'Hola, ¿en qué puedo ayudarte?' };
//             }
//         }  

//         // En caso de que si identifique que el usuario desea tablas o campos, pero no se pudo identificar ninguno
//         if (!toolGetFields) {
//             return { output_text: 'No pude identificar los campos necesarios. ¿Podrías reformular la consulta?' };
//         }

//         // Creación del objeto que se envia al frontend como respuesta, sin mutar el response de OpenAI
//         const result: any = {
//             output_text: '',
//             currentQuery: [],
//             principalTable: null,
//             selectedFilters: [],
//             filteredColumns: [],
//             queryLimit: 5000,
//         };      

//         if (toolGetFields) {
//             let args: any = {};

//             try {
//                 args = toolGetFields.arguments ? JSON.parse(toolGetFields.arguments) : {};
//             } catch (error) {
//                 console.error("Invalid getFields arguments:", toolGetFields.arguments);
//                 console.log("Error:", error);
//                 return { output_text: 'No se pudieron procesar los campos solicitados. Por favor, reformula la consulta.' };
//             }

//             const tables = Array.isArray(args.tables) ? args.tables : [];
//             result.queryLimit = typeof args.limit === 'number' ? args.limit : 5000;

//             if (tables.length === 0) {
//                 return { output_text: 'No se encontraron tablas en la consulta. Por favor, especifica la tabla.', currentQuery: [], principalTable: null, selectedFilters: [] };
//             }

//             const principalTable = tables[0].table ?? null;
//             const currentQueryTool = QueryResolver.getFields(tables, data);

//             result.currentQuery = currentQueryTool;
//             result.principalTable = principalTable;
//             result.output_text = currentQueryTool.length === 0 ? 'Podrías ser más preciso en tu consulta.' : 'Se ha configurado con éxito la consulta solicitada.';
//         }

//         if (toolGetFilters) {
//             let args: any = {};

//             try {
//                 args = toolGetFilters.arguments ? JSON.parse(toolGetFilters.arguments) : {};
//             } catch (error) {
//                 console.error("Invalid getFilters arguments:", toolGetFilters.arguments);
//                 console.log("Error:", error);
//                 result.selectedFilters = [];
//                 result.filteredColumns = [];
//                 return result;
//             }

//             const filters = Array.isArray(args.filters) ? args.filters : [];
//             const currentQuery = result.currentQuery;

//             // Validación de filtros de texto contra la BD (solo si hay conexión disponible)
//             if (filters.length > 0 && parameters?.dataSource_id) {
//                 const validation = await QueryResolver.validateTextFilters(filters, parameters);
//                 if (validation.unresolvedFilter) {
//                     // Trae automáticamente todas las opciones y las presenta numeradas
//                     const options = await QueryResolver.getAllFilterOptions(validation.unresolvedFilter, parameters);
//                     const numberedList = options.map((opt: string, i: number) => `${i + 1}. ${opt}`).join('\n');
//                     const notFoundText = validation.notFound.join('", "');
//                     return {
//                         type: 'awaiting_resolution',
//                         output_text: `No encontré "${notFoundText}" en la columna "${validation.unresolvedFilter.column}". Aquí tienes las opciones disponibles:\n\n${numberedList}\n\n¿Cuáles quieres usar?`,
//                         options,
//                         unresolvedFilter: validation.unresolvedFilter,
//                         pendingResult: {
//                             currentQuery: result.currentQuery,
//                             principalTable: result.principalTable,
//                             filteredColumns: QueryResolver.getFilteredColumns(validation.resolvedFiltersRaw, currentQuery),
//                             resolvedFilters: QueryResolver.getFilters(validation.resolvedFiltersRaw)
//                         }
//                     };
//                 }
//             }

//             result.selectedFilters = filters.length === 0 ? [] : QueryResolver.getFilters(filters);
//             result.filteredColumns = filters.length === 0 ? [] : QueryResolver.getFilteredColumns(filters, currentQuery);
//         }

//         return result;
//     }

// }