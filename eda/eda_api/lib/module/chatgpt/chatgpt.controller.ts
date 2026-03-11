import { NextFunction, Request, response, Response } from "express";
import { HttpException } from "../global/model/index";
import ChatGpt, { IChatGpt } from "../chatgpt/model/chatgpt.model" // A utilizar proximamente
import OpenAI from "openai";
import { PromptService } from "../../services/prompt/prompt-assistant.service";
import * as fs from 'fs';
import * as path from 'path';

const getChatgptConfig = () => {
    const configPath = path.resolve(__dirname, '../../../config/chatgpt.config.js');
    delete require.cache[require.resolve(configPath)];
    return require(configPath);
};

export class ChatGptController {

    static async responseChatGpt(req: Request, res: Response, next: NextFunction) {


        try {
            const { input } = req.body;
            const { API_KEY, MODEL, CONTEXT } = getChatgptConfig();

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
            const { AVAILABLE } = getChatgptConfig();
            const response = {
                available: AVAILABLE,
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

            const { MODEL, LIMIT } = getChatgptConfig();

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

    static async getConfig(_req: Request, res: Response, next: NextFunction) {
        try {
            const config = getChatgptConfig();
            return res.status(200).json({
                ok: true,
                config: {
                    API_KEY: config.API_KEY,
                    MODEL: config.MODEL,
                    CONTEXT: config.CONTEXT,
                    AVAILABLE: config.AVAILABLE,
                    LIMIT: config.LIMIT,
                }
            });
        } catch (err) {
            next(new HttpException(400, 'Error loading ChatGpt configuration'));
        }
    }

    static async saveConfig(req: Request, res: Response, next: NextFunction) {
        try {
            const { API_KEY, MODEL, CONTEXT, AVAILABLE, LIMIT } = req.body;
            const configPath = path.resolve(__dirname, '../../../config/chatgpt.config.js');
            const content = `module.exports = { \n    API_KEY: '${API_KEY}',\n    MODEL: '${MODEL}',\n    CONTEXT: '${CONTEXT}',\n    AVAILABLE: ${AVAILABLE},\n    LIMIT: ${LIMIT},\n};\n`;
            fs.writeFile(configPath, content, 'utf8', (err) => {
                if (err) return next(new HttpException(500, 'Error saving ChatGpt configuration'));
                return res.status(200).json({ ok: true });
            });
        } catch (err) {
            next(new HttpException(400, 'Error saving ChatGpt configuration'));
        }
    }

}
