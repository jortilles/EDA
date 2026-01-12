import { NextFunction, Request, Response } from "express";
import { HttpException } from "../global/model/index";
import ChatGpt, { IChatGpt } from "../chatgpt/model/chatgpt.model" // A utilizar proximamente
import OpenAI from "openai";

// Importanto elemento del ChatGpt
const API_KEY = require('../../../config/chatgpt.config').API_KEY;
const MODEL = require('../../../config/chatgpt.config').MODEL;
const CONTEXT = require('../../../config/chatgpt.config').CONTEXT;
const AVAILABLE = require('../../../config/chatgpt.config').AVAILABLE;


export class ChatGptController {

    static async responseChatGpt(req: Request, res: Response, next: NextFunction) {
        
        
        try {            
            const { input } = req.body;

            const openai = new OpenAI({
                apiKey: API_KEY
            });

            const response = await openai.chat.completions.create({
                model: MODEL,
                messages: [
                    { role: "user", content: CONTEXT },
                    { role: "user", content: input }
                ],
            })

            res.status(200).json({
                ok: true,
                response: response
            })
            
        } catch (err) {
            console.log(err);
            next(new HttpException(400, 'some Error occurred loading ChatGpt'))
        }

    }

    static async availableChatGpt(req: Request, res: Response, next: NextFunction) {
        
        
        try {
            const apiKeyAvailable = AVAILABLE;            
            const response = {
                available: apiKeyAvailable,
            }

            res.status(200).json({
                ok: true,
                response: response
            })
            
        } catch (err) {
            console.log(err);
            next(new HttpException(400, 'some Error occurred with the ChatGpt availability'))
        }

    }

    static async promptChatGpt(req: Request, res: Response, next: NextFunction) {
        
        try {

            const { text, history, data, schema, firstTime } = req.body;

            const openai = new OpenAI({
                apiKey: API_KEY
            });

            // PALABRAS DENEGADAS POR DEFAULT PARA OPENAI
            // ************************************************************************************************************************* //
            const forbiddenKeywords: string[] = [ "política", "sexo", "hack", "violencia", "pornografía", "droga", "ilegal", "piratería"];

            function isForbidden(message: string) {
                const msgLower = message.toLowerCase();
                return forbiddenKeywords.some(keyword => msgLower.includes(keyword.toLowerCase()));
            }

            if (isForbidden(text)) {
                return res.status(400).json({
                    ok: false,
                    response: "No puedo responder a esa pregunta, intentelo nuevamente."
                });
            }
            // ************************************************************************************************************************* //

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

            // HISTORIAL DE LA CONVERSACIÓN EN SESIÓN
            const messages: any = safeHistory;            

            console.log('messages ===>>> ', messages);
            console.log('firstTime ===>>> ', firstTime);

            // Se agrega este primer mensaje solo al inicio de la sessión.
            if(firstTime) {
                
                messages.unshift({
                    role: "system",
                    content: `You are an assistant who knows the following database schema:
                        ${JSON.stringify(schema, null, 2)} \`
                        You are an assistant who helps generate a structure similar to the schema and you cannot deviate from the schema format. 
                        When you don't have enough data, return the answer with a question demanding more clarity. 
                        You should not answer trivial questions unrelated to the schema.
                        You must only return table names and column names that exist EXACTLY in the provided schema.
                        If the user uses synonyms, translations, or natural language, you must map them to existing schema names.
                        If no valid mapping exists, return an empty result.
                        Never invent table or column names.
                        `
                });

            }

            // Definir en otro directorio
            // Obtencion del campo.
            const getFieldsTool: any = {
                type: "function",
                name: "getFields",
                description: "Returns an array of tables objects where each one contains its corresponding columns element which is an array of columns. You must check the schema",
                parameters: {
                    type: "object",
                    properties: {
                        tables: {
                            type: "array",
                            description: "Array of table requests. Each element must be an object with 'table' (string) and 'columns' (array of strings). If no column is specified, you must add all the columns from the corresponding table. You must check the schema",
                            items: {
                                type: "object",
                                properties: {
                                    table: { type: "string", description: "Name of the table (e.g. 'customers')" },
                                    columns: {
                                        type: "array",
                                        description: "List of string column names. If not specified or empty, return all columns for the table. You must check the schema. You must identify tables or entities in the prompt query to match them with the columns you will return. Take also into account synonyms and possible typography mistakes. Never return empty if you dont know make a request",
                                        items: { type: "string" }
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
                strict: true
            };


            const getAllColumnsByTableNameTool: any = {
                type: "function",       // obligatorio
                name: "getAllColumnsByTableName",
                description: "Given a user request asking for all columns, fields, or full information of a table, returns the table name. Use this function when the user asks for the columns, fields, or all data of a table. The table name must exist in the schema.",
                parameters: {
                    type: "object",
                    properties: {
                        table: {
                            type: "string",
                            description: "Name of the table, must exist in the schema",
                        },
                    },
                    required: ["table"],
                    additionalProperties: false
                },
                strict: true,           
            };

            // Agregación de todas las funciones de llamada
            const tools: any[] = [getFieldsTool, getAllColumnsByTableNameTool];

            let response: any = await openai.responses.create({
                model: MODEL,
                input: messages,
                tools: tools,
            })

            const toolCall: any = response.output?.find((c: any) => c.type === "function_call");
            let toolResult: string | null = null;
            let currentQueryTool: any[];

            
            console.log('toolCall: ', toolCall);

            if(toolCall && toolCall.name === "getFields"){
                const args = toolCall.arguments ? JSON.parse(toolCall.arguments) : {};
                const tables = args.tables ?? "Unknown";
                const tools = response.tools;
                const principalTable = tables[0].table

                // Current Query

                currentQueryTool = getFields(tables, data);
                response.currentQuery = currentQueryTool;
                response.principalTable =  principalTable;

                console.log('currentQueryTool: ', currentQueryTool);
                // Agregar mas control cuando el arreglo de currentQueryTool retorna vacio
                response.output_text = 'Se ha configurado con exito la consulta solicitada';

                //  // --- 5) (Opcional) enviar el resultado de la tool de vuelta al modelo para respuesta final ---
                // const followUpMessages: any = [
                //     ...safeHistory,
                //     // registramos que hubo una llamada a tool (puedes formatearlo como prefieras)
                //     { role: "assistant", content: `__tool_call__ ${toolCall.tool}(${JSON.stringify(toolCall.arguments)})` },
                //     // añadir la salida de la herramienta
                //     { role: "assistant", content: toolResult },
                // ];

                // // Segunda llamada: ahora pedimos la respuesta final del asistente
                // response = await openai.responses.create({
                //     model: MODEL,
                //     input: followUpMessages,
                //     tools, // seguir enviando metadata para permitir más tool_calls
                // });
            }


            if(toolCall && toolCall.name === "getAllColumnsByTableName"){
                const args = toolCall.arguments ? JSON.parse(toolCall.arguments) : {};
                const tableName = args.table ?? "Unknown";
                const tools = response.tools;

                // Current Query
                currentQueryTool = getAllColumnsByTableName(tableName, data);
                console.log('currentQueryTool: ::::::: :', currentQueryTool);
                response.currentQuery = currentQueryTool;
                response.principalTable =  tableName;
                response.output_text = 'Se ha configurado con exito la consulta solicitada todos los valores';

                // Agregar mas control cuando el arreglo de currentQueryTool retorna vacio

            }

            res.status(200).json({
                ok: true,
                response: response
            })
            
        } catch (err) {
            console.log(err);
            next(new HttpException(400, 'some Error occurred loading ChatGpt'))
        }

    }

}


// --- función real implementada en el backend --- //
function getFields(tables: any[], data: any[]) {

    let currentQuery: any[] = [];

    tables.forEach((t: any) => {
        const table = data.find((item: any) => item.table_name === t.table.toLowerCase());
        if(table) {
            t.columns.forEach((c: any) => {
                const column = table.columns.find((item: any) => item.column_name === c.toLowerCase());

                if(column) {
                    column.table_id = table.table_name;

                    if(column.column_type === 'numeric') {
                        const agg = column.aggregation_type.find((agg: any) => agg.value === 'sum');
                        agg.selected = true;
                    }

                    if(column.column_type === 'text' || column.column_type === 'date') {
                        const agg = column.aggregation_type.find((agg: any) => agg.value === 'none');
                        agg.selected = true;
                    }

                    currentQuery.push(column);
                }
            })
        }
    })

    return currentQuery;
}

function getAllColumnsByTableName(tableName: any, data) {
    let currentQuery: any[] = [];

        const table = data.find((item: any) => item.table_name === tableName);

        if(table) {
            table.columns.forEach((col: any) => {

                if(col.column_type === 'numeric') {
                    const agg = col.aggregation_type.find((agg: any) => agg.value === 'sum');
                    agg.selected = true;
                }

                if(col.column_type === 'text' || col.column_type === 'date') {
                    const agg = col.aggregation_type.find((agg: any) => agg.value === 'none');
                    agg.selected = true;
                }

                col.table_id = tableName;

                currentQuery.push(col);
            })
        }

    return currentQuery;    
}