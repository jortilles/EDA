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

            console.log('INICIOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO')

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

            // Asegúrate de añadir el nuevo mensaje del usuario si viene en `text`
            // if (text && text.trim().length > 0) {
            //     safeHistory.push({ role: "user", content: String(text) });
            // }

            const messages: any = safeHistory;            
            console.log('messages: ', messages)


            if(firstTime) {
                console.log('es la primera vez que se envia el schema');
                
                messages.unshift({
                role: "system",
                content: `You are an assistant who knows the following database structure:
                ${JSON.stringify(schema, null, 2)} \`

                When a user requests data from a table without specifying columns, you must:
                - Include **all columns** from the table in the getFields call.
                - Never return empty columns (columns or fields or attributes).
                - If the table has more than 10 columns, first ask the user if they want all of them.
                It always generates the getFields calls with exact column names according to the schema.`
                });

            }

            console.log('messages: ', messages)

            // Definir en otro directorio
            const getHoroscopeTool: any = {
                type: "function",       // obligatorio
                name: "getHoroscope",
                description: "Get todays horoscope for an astrological sign.",
                parameters: {
                    type: "object",
                    properties: {
                        sign: {
                            type: "string",
                            description: "An astrological sign like Taurus or Aquarius",
                        },
                    },
                    required: ["sign"],
                    additionalProperties: false // <- CORRECCIÓN CLAVE: evita propiedades extra
                },
                strict: true,           // obligatorio
            };

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

            const tools: any[] = [getHoroscopeTool, getFieldsTool, getAllColumnsByTableNameTool];

            let response: any = await openai.responses.create({
                model: MODEL,
                input: messages,
                tools: tools,
            })

            console.log('::::::::::::::::::::: RESPONSE :::::::::::::::::::::');
            console.log('response =>', response);

            const toolCall: any = response.output?.find((c: any) => c.type === "function_call");
            let toolResult: string | null = null;
            let currentQueryTool: any[];

            console.log('TOOLCALL: ', toolCall);

            if(toolCall && toolCall.name === "getHoroscope") {

                const args = toolCall.arguments ? JSON.parse(toolCall.arguments) : {};
                const sign = args.sign ?? "Unknown";
                const tools = response.tools;

                console.log('args: ', args)
                console.log('sign: ', sign)
                console.log('tools: ', tools) // Arreglo de tools 

                toolResult = getHoroscope(sign);
                console.log('toolResult: ', toolResult);

                response.output_text = toolResult;
                

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

            if(toolCall && toolCall.name === "getFields"){
                console.log('SE EJECUTAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
                const args = toolCall.arguments ? JSON.parse(toolCall.arguments) : {};
                const tables = args.tables ?? "Unknown";
                const tools = response.tools;

                // Current Query
                currentQueryTool = getFields(tables, data);
                response.currentQuery = currentQueryTool;
                response.output_text = 'Se ha configurado con exito la consulta solicitada';
            }


            if(toolCall && toolCall.name === "getAllColumnsByTableName"){
                console.log('SE EJECUTAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA TODAS LA COLUMNAS');
                const args = toolCall.arguments ? JSON.parse(toolCall.arguments) : {};
                const tableName = args.table ?? "Unknown";
                const tools = response.tools;

                console.log('argsargsargsargsargsargs: ', args);

                // Current Query
                currentQueryTool = getAllColumnsByTableName(tableName, data);
                response.currentQuery = currentQueryTool;
                response.principalTable =  tableName;
                response.output_text = 'Se ha configurado con exito la consulta solicitada';
            }


            console.log('ENVIO AL FRONT-END: ',response)

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

// --- función real implementada en el backend ---
function getHoroscope(sign: string) {
  return `${sign}: Next Tuesday you will befriend a baby otter.`;
}

function getFields(tables: any[], data: any[]) {

    let currentQuery: any[] = [];

    console.log('tables: ', tables);

    tables.forEach((t: any) => {
        const table = data.find((item: any) => item.table_name === t.table.toLowerCase());
        if(table) {
            t.columns.forEach((c: any) => {
                const column = table.columns.find((item: any) => item.column_name === c.toLowerCase());
                if(column) {
                    currentQuery.push(column);
                }
            })
        }
    })

    return currentQuery;
}

function getAllColumnsByTableName(tableName: any, data) {
    let currentQuery: any[] = [];

        console.log('tableName: ', tableName);

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

                currentQuery.push(col);
            })
        }

    return currentQuery;    
}