import OpenAI from "openai";
import { API_KEY, MODEL, CONTEXT } from '../../../config/chatgpt.config';
import { PromptUtil } from '../../utils/prompt.util';
import QueryResolver from '../../services/prompt/query/query-resolver.service'


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


        // Agregamos el contexto y hacemos la consulta con todo el historial
        const messages: any = [
            { role: "system", content: CONTEXT },
            { role: "system", content: PromptUtil.buildSystemMessage(schema)},
            ...safeHistory
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
            - If the user does not specify columns, return all columns for the table from the schema.
            - Use synonyms or context in the user query to match table and column names in the schema.
            - Never return an empty columns array; if unsure, return all columns.
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
                        description: "Array of table requests. Each element must be an object with 'table' (string) and 'columns' (array of objects). If no column is specified, you must add all the columns from the corresponding table. You must check the schema",
                        items: {
                            type: "object",
                            properties: {
                                table: { type: "string", description: "Name of the table (e.g. 'customers')" },
                                columns: {
                                    type: "array",
                                    minItems: 1,
                                    description: "Array of column objects. If not specified or empty, return all columns for the table. You must check the schema. You must identify tables or entities in the prompt query to match them with the columns you will return. Take also into account synonyms and possible typography mistakes.",
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
            auto_call: { type: "always" }
        };

        const getFiltersTool: any = {
            type: "function",
            name: "getFilters",
            description: "Creates multiple filters for different fields. All fields are defined in the schema",
            parameters: {
                type: "object",
                properties: {
                    filters: {
                        type: "array",
                        description: "Array of elements, where each element has a field and its corresponding values",
                        items: {
                            type: "object",
                            properties: {
                                field: {
                                    type: "string",
                                    description: "Name of the field, all the fiels are defined in the schema"
                                },
                                values: {
                                    type: "array",
                                    description: "Array of the filter elements",
                                    items: {
                                        anyOf: [
                                            { type: "string" },
                                            { type: "number" }
                                        ],
                                        description: "Element of the field"
                                    }
                                },
                                filter_type: {
                                    type: "string",
                                    description: "Type of filter to apply",
                                    enum: [ "=", "!=", ">", "<", ">=", "<=", "between", "in", "not in", "not null", "not null and !=''", "null or = ''" ]
                                }
                            },
                            required: ["field", "values", "filter_type"],
                            additionalProperties: false
                        }
                    }
                },
                required: ["filters"],
                additionalProperties: false
            }
        };

        // Creacion de la instancia de openAI
        const openai = new OpenAI({ apiKey: API_KEY });

        // Agregación de todas las funciones de llamada
        const tools: any[] = [getFieldsTool, getFiltersTool];

        // Consulta a la api de openAI
        let response: any = await openai.responses.create({
            model: MODEL,
            input: messages,
            tools: tools,
        })

        // console.log('response: ', response);


        // recepcionamos el toolCall => podria estar undefined
        // const toolCallOutput: any[] = response.output;
        const toolCall: any = response.output?.find((c: any) => c.type === "function_call");

        const toolGetFields: any = response.output?.find((tool: any) => tool.type === "function_call" && tool.name === "getFields");
        const toolGetFilters: any = response.output?.find((tool: any) => tool.type === "function_call" && tool.name === "getFilters");

        // console.log('toolCallOutput ::::::::::::::::::::::: ', toolCallOutput);
        console.log('toolGetFields ::::::::::::::::::::::: ', toolGetFields);
        console.log('toolGetFilters ::::::::::::::::::::::: ', toolGetFilters);

        // Verificamos si tenemos que responder con un function calling, sino devolvemos la consulta
        if (!toolGetFields) { // Si entramos por aqui devolvemos el response para darle otro analisis posterior
            response.output_text = 'No pude identificar los campos necesarios. ¿Podrías reformular la consulta?'; // Esto se va a eliminar 
            return response;
        }

        if(toolGetFields.name === "getFields"){
            const args = toolGetFields.arguments ? JSON.parse(toolGetFields.arguments) : {};
            const tables = args.tables ?? "Unknown";
            const principalTable = tables[0].table

            // console.log('tables: ', tables);
            // console.log('principalTable: ', principalTable);

            // Generando un nuevo currentQuery.
            const currentQueryTool = QueryResolver.getFields(tables, data);

            // Subida de valores
            response.currentQuery = currentQueryTool;
            response.principalTable =  principalTable;

            if(currentQueryTool.length === 0) {
                response.output_text = 'Podrias ser mas preciso en tu consulta';
            } else {
                response.output_text = 'Se ha configurado con exito la consulta solicitada';
            }
        }

        if(toolGetFilters?.name === "getFilters") {
            let args: any = {};

            try {
                args = toolGetFilters.arguments ? JSON.parse(toolGetFilters.arguments) : {};
            } catch (error) {
                console.error("Invalid getFilters arguments:", toolGetFilters.arguments);
                response.filters = [];
                return response;
            }

            const filters = Array.isArray(args.filters) ? args.filters : [];

            if (filters.length === 0) response.filters = [];
            
            // Gererando el arreglo de filtros
            const filtersTool = QueryResolver.getFilters(filters);

            // Subida de los filtros a la respuesta
            response.filters = filtersTool;
            
            // if(filtersTool.length === 0) {
            //     response.output_text = 'Podrias ser mas preciso en tu consulta';
            // } else {
            //     response.output_text = 'Se ha configurado con exito la consulta solicitada';
            // }
        }

        return response;

    }

}