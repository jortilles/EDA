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

            const forbiddenKeywords = ["jesus", "bitcoin", "news", "world", "born", "sex", "war", "money", "games", "animals"];
            const { text, history, data, schema, firstTime } = req.body;

            console.log('INICIOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO')

            // Temas que no estan incluidos en la interaccion con la IA
            if (forbiddenKeywords.some(k => text.includes(k))) {
                return res.status(200).json({
                    ok: true,
                    response: {
                    output: "I am only here to help build table and column structures. How can I help you?."
                    }
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

            // Asegúrate de añadir el nuevo mensaje del usuario si viene en `text`
            // if (text && text.trim().length > 0) {
            //     safeHistory.push({ role: "user", content: String(text) });
            // }

            const messages: any = safeHistory;            
            console.log('messages: ', messages)

            // Ejemplo de respuesta.
            const exampleResponse: any[] = [
                {
                    table: 'customers',
                    columns: [
                        'country',
                        'city',
                        'state'
                    ]
                }, 
                {
                    table: 'payments',
                    columns: [
                        'amount',
                        'checknumber',
                        'customernumber'
                    ]
                }
            ]


            if(firstTime) {
                console.log('es la primera vez que se envia el schema');
                
                messages.unshift({
                    role: "system",
                    content: `You are an assistant specialized ONLY in constructing table structures with columns.

                    Here is the schema: ${JSON.stringify(schema, null, 2)}. You can use it to check whether the table and its columns exist.

                    You MUST NEVER answer any questions unrelated to table or column structure. 
                    If a user asks anything outside table/column construction, respond EXACTLY:

                    "I am only here to help build table and column structures. How can I help you?."

                    Follow these rules strictly:
                    1. Only interact to get the info needed to build the table structure.
                    2. Each table must have at least one column.
                    3. If a user asks for all data of a table with more than 10 columns, ask which columns they want.
                    4. Only return valid table structures to the getField() function; do not include tables without columns.

                    Your goal is ONLY to produce JSON structures matching this example:
                    ${JSON.stringify(exampleResponse, null, 2)}

                    Do NOT answer any other question under any circumstance. 
                    Always default to the exact refusal message if the question is outside your scope.`
                    });

            } else {
                console.log('NO SE ENVIO EL SCHEMA');
            }

            console.log('messages: ', messages)

            let response: any = await openai.responses.create({
                model: MODEL,
                input: messages,
            })

            console.log('::::::::::::::::::::: RESPONSE :::::::::::::::::::::');
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



