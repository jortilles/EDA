import { NextFunction, Request, response, Response } from "express";
import { HttpException } from "../global/model/index";
import AIUsage from "./model/ai-usage.model" // A utilizar proximamente
import OpenAI from "openai";
import { PromptService } from "../../services/prompt/prompt-assistant.service";
import * as fs from 'fs';
import * as path from 'path';


const getAiConfig = () => {
    const configPath = path.resolve(__dirname, '../../../config/ai.config.js');
    delete require.cache[require.resolve(configPath)];
    return require(configPath);
};

export class AiController {

    static async aIresponse(req: Request, res: Response, next: NextFunction) {


        try {
            const { input } = req.body;
            const { API_KEY, MODEL, CONTEXT } = getAiConfig();

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
            next(new HttpException(400, 'some Error occurred loading the AI'))
        }

    }

    static async aIavailable(req: Request, res: Response, next: NextFunction) {

        try {
            const { AVAILABLE } = getAiConfig();
            const response = {
                available: AVAILABLE,
            }

            res.status(200).json({
                ok: true,
                response: response
            })
            
        } catch (err) {
            console.log(err);
            next(new HttpException(400, 'some Error occurred with the AI availability'))
        }

    }

    static async aIprompt(req: Request, res: Response, next: NextFunction) {

        try {

            const { text, history, data, schema, parameters } = req.body;
            const userId = (req as any).user?._id;

            // Verificar límite diario de consultas por usuario
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);

            const { MODEL, LIMIT, MAX_LIMIT } = getAiConfig();

            // Verificar límite global del sistema (acumulado total, sin importar el día)
            const totalCount = await AIUsage.countDocuments({});
            if (totalCount >= MAX_LIMIT) {
                return res.status(429).json({
                    ok: false,
                    response: `El sistema ha alcanzado el límite máximo de consultas disponibles.`
                });
            }

            const todayCount = await AIUsage.countDocuments({
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
            await AIUsage.create({
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
            next(new HttpException(400, 'some Error occurred loading the AI'))
        }

    }

    static async aiSuggestions(req: Request, res: Response, next: NextFunction) {
        try {
            const { schema } = req.body;
            const suggestions = await PromptService.generateSuggestions(schema ?? []);
            res.status(200).json({ ok: true, suggestions });
        } catch (err) {
            console.log(err);
            next(new HttpException(400, 'Error generating suggestions'));
        }
    }

    static async aIgetConfig(_req: Request, res: Response, next: NextFunction) {
        try {
            const config = getAiConfig();
            return res.status(200).json({
                ok: true,
                config: {
                    PROVIDER: config.PROVIDER,
                    API_KEY: config.API_KEY,
                    AWS_ACCESS_KEY: config.AWS_ACCESS_KEY,
                    AWS_SECRET_KEY: config.AWS_SECRET_KEY,
                    AWS_REGION: config.AWS_REGION,
                    MODEL: config.MODEL,
                    CONTEXT: config.CONTEXT,
                    AVAILABLE: config.AVAILABLE,
                    LIMIT: config.LIMIT,
                    MAX_TOKENS: config.MAX_TOKENS,
                    EDA_APP_URL: config.EDA_APP_URL,
                    MCP_URL: config.MCP_URL,
                }
            });
        } catch (err) {
            next(new HttpException(400, 'Error loading the AI configuration'));
        }
    }

    static async aIsaveConfig(req: Request, res: Response, next: NextFunction) {
        try {
            const { PROVIDER, API_KEY, AWS_ACCESS_KEY, AWS_SECRET_KEY, AWS_REGION, MODEL, CONTEXT, AVAILABLE, LIMIT, MAX_TOKENS, EDA_APP_URL, MCP_URL } = req.body;
            const configPath = path.resolve(__dirname, '../../../config/ai.config.js');
            const currentConfig = getAiConfig();
            const finalApiKey = (API_KEY !== undefined && API_KEY !== null) ? API_KEY : currentConfig.API_KEY;
            const finalProvider = PROVIDER ?? currentConfig.PROVIDER;
            const finalAwsAccessKey = AWS_ACCESS_KEY ?? currentConfig.AWS_ACCESS_KEY ?? '';
            const finalAwsSecretKey = (AWS_SECRET_KEY !== undefined && AWS_SECRET_KEY !== null) ? AWS_SECRET_KEY : currentConfig.AWS_SECRET_KEY ?? '';
            const finalAwsRegion = AWS_REGION ?? currentConfig.AWS_REGION ?? '';
            const finalMaxTokens = MAX_TOKENS ?? currentConfig.MAX_TOKENS ?? 1000;
            const finalEdaAppUrl = EDA_APP_URL ?? currentConfig.EDA_APP_URL ?? '';
            const finalMcpUrl = MCP_URL ?? currentConfig.MCP_URL ?? '';
            const content = `module.exports = { \n    PROVIDER: '${finalProvider}',\n    API_KEY: '${finalApiKey}',\n    AWS_ACCESS_KEY: '${finalAwsAccessKey}',\n    AWS_SECRET_KEY: '${finalAwsSecretKey}',\n    AWS_REGION: '${finalAwsRegion}',\n    MODEL: '${MODEL}',\n    CONTEXT: '${CONTEXT}',\n    AVAILABLE: ${AVAILABLE},\n    LIMIT: ${LIMIT},\n    MAX_LIMIT: ${currentConfig.MAX_LIMIT},\n    MAX_TOKENS: ${finalMaxTokens},\n    EDA_APP_URL: '${finalEdaAppUrl}',\n    MCP_URL: '${finalMcpUrl}',\n};\n`;
            fs.writeFile(configPath, content, 'utf8', (err) => {
                if (err) return next(new HttpException(500, 'Error saving the AI configuration'));
                return res.status(200).json({ ok: true });
            });
        } catch (err) {
            next(new HttpException(400, 'Error saving the AI configuration'));
        }
    }

}
