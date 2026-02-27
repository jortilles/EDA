import OpenAI from "openai";
import { API_KEY, MODEL, CONTEXT } from '../../../config/chatgpt.config';
import { PromptUtil } from '../../utils/prompt.util';
import QueryResolver from '../../services/prompt/query/query-resolver.service'

// Singleton: una sola instancia reutilizada por todas las llamadas
const openai = new OpenAI({ apiKey: API_KEY });

interface PromptParameters {
    text: string,
    history: any[],
    data: any[],
    schema: any[],
    firstTime?: boolean
}

export class PromptService {

    static async processPrompt(params: PromptParameters) {
        
        const { text, history, data, schema, firstTime } = params;

        if(PromptUtil.isForbidden(text)) {
            return {
                ok: false,
                response: "No puedo responder a esa pregunta, intentelo nuevamente."
            }
        }

        // Sanitizar history: solo dejamos { role, content }
        const safeHistory = Array.isArray(history) ? history.map((m: any) => {
            // content puede llegar en distintos formatos, normalizamos a string
            let content = "";
            if (typeof m.content === "string") content = m.content;
            else if (m.content && typeof m.content === "object") {
                // Si la estructura de content es similar a esto:  { text: '...' }:
                content = m.content.text ?? JSON.stringify(m.content);
            } else {
                content = String(m.content ?? "");
            }

            // Devolvemos los campos permitidos para la API
            return {
                role: m.role === "assistant" ? "assistant" : m.role === "system" ? "system" : "user",
                content: content,
            };
        }) : [];


        // System prompt unificado + historial previo + mensaje actual del usuario
        const messages: any = [
            { role: "system", content: `${CONTEXT}\n\n${PromptUtil.buildSystemMessage(schema)}` },
            ...safeHistory,
            { role: "user", content: text }
        ];

        // console.log('safeHistory: ', safeHistory);
        // console.log('messages: ', messages);
        console.log('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%');

        //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////  Function Calling ////////////////////////////////////////////////////////
        //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        const getFieldsTool: any = {
            type: "function",
            name: "getFields",
            description: `
            Returns an array of table objects with their corresponding columns.
            Rules:
            - Always return columns for the requested tables.
            - Use synonyms or context in the user query to match table and column names in the schema.
            - Never return an empty columns array.
            - Do not return duplicated columns for the same table.
            - Example output:
            [
            {
                "table": "customers",
                "columns": [
                    { "column": "name", "column_type": "text" },
                    { "column": "population", "column_type": "numeric" },
                    { "column": "country", "column_type": "text" },
                    { "column": "orderDate", "column_type": "date" },
                    { "column": "map", "column_type": "coordinate" }
                ]
            }
            ]
            `,
            parameters: {
                type: "object",
                properties: {
                    tables: {
                        type: "array",
                        description: "Array of tables. Each element must be an object with 'table' (string) and 'columns' (array of objects). You must check the schema",
                        items: {
                            type: "object",
                            properties: {
                                table: { type: "string", description: "Name of the table (e.g. 'customers')" },
                                columns: {
                                    type: "array",
                                    minItems: 1,
                                    description: "Array of column objects. never return an empty array of columns. You must check the schema. You must identify tables or fields in the prompt query to match them with the columns you will return. Take also into account synonyms and possible typography mistakes.",
                                    items: { 
                                        type: "object",
                                        properties: {
                                            column: {
                                                type: "string",
                                                description: "Column or field of the table defined in the schema"
                                            },
                                            column_type: {
                                                type: "string",
                                                description: "Type of the column or field",
                                                enum: ["text", "numeric", "date", "coordinate"]
                                            }
                                        },
                                        required: ['column', "column_type"],
                                        additionalProperties: false
                                    }
                                }
                            },
                            required: ["table", "columns"],
                            additionalProperties: false
                        }
                    }
                },
                required: ["tables"],
                additionalProperties: false
            },
            strict: true,
        };

        const getFiltersTool: any = {
            type: "function",
            name: "getFilters",
            description: `
            IMPORTANT: This tool MUST be called whenever the user query contains any filtering condition, comparison, restriction, or specific value constraint.
            Trigger patterns (call getFilters if ANY of these appear):
            - Comparisons: "menor que" / "less than", "mayor que" / "greater than", "igual a" / "equal to", "distinto de" / "not equal to"
            - Ranges: "entre X e Y" / "between X and Y"
            - Specific values: "solo X" / "only X", "excepto X" / "except X", "que sean X o Y" / "that are X or Y"
            - Text matching: "que contiene" / "that contains", "que empieza por" / "that starts with"
            - Nullability: "que tienen valor" / "that have a value", "que no están vacíos" / "not empty", "sin datos" / "with no data"
            - Dates: "del año" / "from the year", "desde" / "from", "hasta" / "until", "en enero" / "in January"
            Creates filter objects for each condition found. All columns and tables are defined in the schema.
            `,
            parameters: {
                type: "object",
                properties: {
                    filters: {
                        type: "array",
                        description: "Array of elements, where each element has a column or field and its corresponding values",
                        items: {
                            type: "object",
                            properties: {
                                table: {
                                    type: "string",
                                    description: "Name of the table to which the column belongs; all tables are defined in the schema"
                                },
                                column: {
                                    type: "string",
                                    description: "Name of the column or field, all the columns or fiels are defined in the schema"
                                },
                                column_type: {
                                    type: "string",
                                    description: "Type of the column or field, the type could be: text, number, date or coordinate",
                                    enum: ["text", "numeric", "date", "coordinate"]
                                },
                                values: {
                                    type: "array",
                                    description: "Array of the filter elements",
                                    items: {
                                        anyOf: [
                                            { type: "string" },
                                            { type: "number" }
                                        ],
                                        description: "Element of the column or field"
                                    }
                                },
                                filter_type: {
                                    type: "string",
                                    description: `
                                        Type of filter to apply => Options:
                                        - "=": exact match (e.g. country = 'Spain')
                                        - "!=": not equal (e.g. status != 'inactive')
                                        - ">": greater than (e.g. age > 30)
                                        - "<": less than (e.g. price < 100)
                                        - ">=": greater than or equal
                                        - "<=": less than or equal
                                        - "between": value is within a range, requires two values (e.g. date between '2024-01-01' and '2024-12-31')
                                        - "in": value matches any in a list (e.g. country in ['Spain', 'France'])
                                        - "not_in": value does not matches with the elements of the list (e.g. country not in ['Italy', 'Germany'])
                                        - "not_like": partial text does not match
                                        - "like": partial text match, use when the user writes a partial name or uses 'contains' / 'starts with' (e.g. name like 'Mar')
                                        - "not_null": field has a value (is not null)
                                        - "not_null_nor_empty": field is not null and not an empty
                                        - "null_or_empty": field is null or empty`,
                                    enum: [ "=", "!=", ">", "<", ">=", "<=", "between", "in", "not_in", "like", "not_like", "not_null", "not_null_nor_empty", "null_or_empty" ]
                                }
                            },
                            required: ["table", "column", "column_type", "values", "filter_type"],
                            additionalProperties: false
                        }
                    }
                },
                required: ["filters"],
                additionalProperties: false
            },
            strict: true,
        };

        // Agregación de todas las funciones de llamada
        const tools: any[] = [getFieldsTool, getFiltersTool];

        // Consulta a la api de openAI
        let response: any = await openai.responses.create({
            model: MODEL,
            input: messages,
            tools: tools,
            tool_choice: "required",
        })

        // console.log('response: ', response);


        const toolGetFields: any = response.output?.find((tool: any) => tool.type === "function_call" && tool.name === "getFields");
        const toolGetFilters: any = response.output?.find((tool: any) => tool.type === "function_call" && tool.name === "getFilters");

        // console.log('toolCallOutput ::::::::::::::::::::::: ', toolCallOutput);
        console.log('toolGetFields ::::::::::::::::::::::: ', toolGetFields);
        console.log('toolGetFilters ::::::::::::::::::::::: ', toolGetFilters);

        if (!toolGetFields) {
            return { output_text: 'No pude identificar los campos necesarios. ¿Podrías reformular la consulta?' };
        }

        // Objeto de resultado propio, sin mutar el response de OpenAI
        const result: any = {
            output_text: '',
            currentQuery: [],
            principalTable: null,
            selectedFilters: [],
            filteredColumns: [],
        };

        if (toolGetFields) {
            let args: any = {};

            try {
                args = toolGetFields.arguments ? JSON.parse(toolGetFields.arguments) : {};
            } catch (error) {
                console.error("Invalid getFields arguments:", toolGetFields.arguments);
                console.log("Error:", error);
                return { output_text: 'No se pudieron procesar los campos solicitados. Por favor, reformula la consulta.' };
            }

            const tables = Array.isArray(args.tables) ? args.tables : [];

            if (tables.length === 0) {
                return { output_text: 'No se encontraron tablas en la consulta. Por favor, especifica la tabla.', currentQuery: [], principalTable: null, selectedFilters: [] };
            }

            const principalTable = tables[0].table ?? null;
            const currentQueryTool = QueryResolver.getFields(tables, data);

            result.currentQuery = currentQueryTool;
            result.principalTable = principalTable;
            result.output_text = currentQueryTool.length === 0 ? 'Podrías ser más preciso en tu consulta.' : 'Se ha configurado con éxito la consulta solicitada.';
        }

        if (toolGetFilters) {
            let args: any = {};

            try {
                args = toolGetFilters.arguments ? JSON.parse(toolGetFilters.arguments) : {};
            } catch (error) {
                console.error("Invalid getFilters arguments:", toolGetFilters.arguments);
                console.log("Error:", error);
                result.selectedFilters = [];
                result.filteredColumns = [];
                return result;
            }

            const filters = Array.isArray(args.filters) ? args.filters : [];
            const currenQuery = result.currentQuery;
            result.selectedFilters = filters.length === 0 ? [] : QueryResolver.getFilters(filters);
            result.filteredColumns = filters.length === 0 ? [] : QueryResolver.getFilteredColumns(filters, currenQuery);
        }

        return result;

    }

}