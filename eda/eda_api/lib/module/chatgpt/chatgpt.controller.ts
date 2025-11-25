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

            const { text, history } = req.body;

            console.log('INICIOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO')
            console.log('text: ', text);
            console.log('history: ', history);

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

            const tools: any[] = [getHoroscopeTool];

            let response: any = await openai.responses.create({
                model: MODEL,
                input: messages,
                tools: tools,
            })

            console.log('::::::::::::::::::::: RESPONSE :::::::::::::::::::::');
            console.log('response =>', response);

            const toolCall: any = response.output?.find((c: any) => c.type === "function_call");
            let toolResult: string | null = null;

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
  // Aquí implementa la lógica real: llamada a otra API, BD, etc.
  return `${sign}: Next Tuesday you will befriend a baby otter.`;
}