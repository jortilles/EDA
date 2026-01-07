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

            const openai = new OpenAI({
                apiKey: API_KEY
            });

            const { text, history, data, schema, firstTime } = req.body;

            console.log('req.body:::::: ', req.body);

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

            
            // Sanitizar history: dejar solo { role, content }
            const safeHistory = Array.isArray(history) ? history.map((m: any) => {
                // content puede estar en distintos formatos en tu app, normalizamos a string
                let content = "";
                if (typeof m.content === "string") content = m.content;
                else if (m.content && typeof m.content === "object") {
                    // si tu antigua estructura guardaba { text: '...' } o similar:
                    content = m.content.text ?? JSON.stringify(m.content);
                } else {
                    content = String(m.content ?? "");
                }

                // solo devolver los campos permitidos por la API
                return {
                    role: m.role === "assistant" ? "assistant" : m.role === "system" ? "system" : "user",
                    content: content
                };
            }) : [];


            const messages: any = safeHistory;            


            if(firstTime) {
                
                messages.unshift({
                role: "system",
                content: `You are an assistant who knows the following database structure:
                ${JSON.stringify(schema, null, 2)} \`

                When a user requests data from a table without specifying columns, you must:
                - Include **all columns** from the table in the getFields call.
                - Never return empty columns (columns or fields or attributes).
                - If the table has more than 10 columns, first ask the user if they want all of them.
                It always generates the getFields calls with exact column names according to the schema.
                
                You should not respond to messages containing prohibited content or out-of-context questions.
                `
                });

            }

            // Definir en otro directorio
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
                description: "Returns the table name. The table name must exist in the schema; synonyms and minor typos may be considered.",
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

            const tools: any[] = [getFieldsTool, getAllColumnsByTableNameTool];

            let response: any = await openai.responses.create({
                model: MODEL,
                input: messages,
                tools: tools,
            })


            const toolCall: any = response.output?.find((c: any) => c.type === "function_call");
            let toolResult: string | null = null;
            let currentQueryTool: any[];


            if(toolCall && toolCall.name === "getFields"){
                const args = toolCall.arguments ? JSON.parse(toolCall.arguments) : {};
                const tables = args.tables ?? "Unknown";
                const tools = response.tools;
                const principalTable = tables[0].table

                // Current Query
                currentQueryTool = getFields(tables, data);
                response.currentQuery = currentQueryTool;
                response.principalTable =  principalTable;
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
                response.currentQuery = currentQueryTool;
                response.principalTable =  tableName;
                response.output_text = 'Se ha configurado con exito la consulta solicitada';
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