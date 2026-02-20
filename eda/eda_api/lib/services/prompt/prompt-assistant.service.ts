import OpenAI from "openai";
import { API_KEY, MODEL, CONTEXT } from '../../../config/chatgpt.config';
import { PromptUtil } from '../../utils/promp.util';
import QueryFieldResolver from '../../services/prompt/query/query-resolver.service'


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

        // Creacion de la instancia de openAI
        const openai = new OpenAI({ apiKey: API_KEY });

        // Agregación de todas las funciones de llamada
        const tools: any[] = [getFieldsTool];

        // Consulta a la api de openAI
        let response: any = await openai.responses.create({
            model: MODEL,
            input: messages,
            tools: tools,
        })

        // recepcionamos el toolCall => podria estar undefined
        const toolCall: any = response.output?.find((c: any) => c.type === "function_call");

        console.log('toolCall: ', toolCall);
        
        // Verificamos si tenemos que responder con un function calling, sino devolvemos la consulta
        if (!toolCall) {
            // Si entramos por aqui devolvemos el response para darle otro analisis posterior
            response.output_text = 'No pude identificar los campos necesarios. ¿Podrías reformular la consulta?'; // Esto se va a eliminar 
            return response
        }

        let toolResult: string | null = null;
        let currentQueryTool: any[];

        if(toolCall && toolCall.name === "getFields"){
            const args = toolCall.arguments ? JSON.parse(toolCall.arguments) : {};
            const tables = args.tables ?? "Unknown";
            const tools = response.tools;
            const principalTable = tables[0].table

            // Generando un nuevo currentQuery.
            currentQueryTool = QueryFieldResolver.getFields(tables, data);
            response.currentQuery = currentQueryTool;
            response.principalTable =  principalTable;

            //console.log('currentQueryTool: ', currentQueryTool);

            if(currentQueryTool.length === 0) {
                response.output_text = 'Podrias ser mas preciso en tu consulta';
            } else {
                response.output_text = 'Se ha configurado con exito la consulta solicitada';
            }
        }

        return response;

    }

}