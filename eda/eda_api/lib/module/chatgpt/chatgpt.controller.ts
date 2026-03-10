import { NextFunction, Request, response, Response } from "express";
import { HttpException } from "../global/model/index";
import ChatGpt, { IChatGpt } from "../chatgpt/model/chatgpt.model" // A utilizar proximamente
import OpenAI from "openai";
import { PromptService } from "../../services/prompt/prompt-assistant.service";

// Importanto elemento del ChatGpt
const API_KEY = require('../../../config/chatgpt.config').API_KEY;
const MODEL = require('../../../config/chatgpt.config').MODEL;
const CONTEXT = require('../../../config/chatgpt.config').CONTEXT;
const AVAILABLE = require('../../../config/chatgpt.config').AVAILABLE;
const LIMIT = require('../../../config/chatgpt.config').LIMIT;


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

            const { text, history, data, schema, parameters } = req.body;
            const userId = (req as any).user?._id;

            // Verificar límite diario de consultas por usuario
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);

            const todayCount = await ChatGpt.countDocuments({
                user: userId,
                createdAt: { $gte: startOfDay, $lte: endOfDay }
            });

            if (todayCount >= LIMIT) {
                return res.status(429).json({
                    ok: false,
                    response: `Has alcanzado el límite diario de ${LIMIT} consultas al asistente. Inténtalo de nuevo mañana.`
                });
            }

            // console.log('<====================> INICIAMOS <====================>')

            const response = await PromptService.processPrompt({
                text,
                history,
                data,
                schema,
                parameters
            });

            // Registrar la consulta para el control de uso
            await ChatGpt.create({
                user: userId,
                prompt: text,
                modelUsed: MODEL,
            });

            res.status(200).json({
                ok: true,
                response
            })

        } catch (err) {
            console.log(err);
            next(new HttpException(400, 'some Error occurred loading ChatGpt'))
        }

    }

}
