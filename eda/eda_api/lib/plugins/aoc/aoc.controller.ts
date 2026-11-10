import { NextFunction, Request, Response } from 'express';
import { HttpException } from '../../module/global/model/index';
import { AOCConnection } from './aoc-connection';
import { EnCrypterService } from '../../services/encrypter/encrypter.service';
import DataSource, { IDataSource } from '../../module/datasource/model/datasource.model';

const cache_config = require('../../../config/cache.config');
const aoc_config = require('../../../config/aoc.config');

export class AOCController {

    static async listAmbitos(req: Request, res: Response, next: NextFunction) {
        try {
            const { user, password } = req.body;

            if (!user || !password) {
                return next(new HttpException(400, 'Se requieren: user (clientId), password (clientSecret)'));
            }

            const conn = new AOCConnection({ type: 'aoc', host: aoc_config.host, port: aoc_config.port, database: aoc_config.database, user, password });
            const ambitos = await conn.listAmbitos();
            return res.status(200).json({ ok: true, ambitos });

        } catch (err: any) {
            console.error('[AOC] listAmbitos error:', err.message);
            console.error('[AOC] listAmbitos odbcErrors:', JSON.stringify(err.odbcErrors, null, 2));
            console.error('[AOC] listAmbitos error detail:', { code: err.code, name: err.name, originalError: err.originalError, stack: err.stack });
            return next(new HttpException(500, `Error al conectar con AOC: ${err.message}`));
        }
    }

    static async addDataSource(req: Request, res: Response, next: NextFunction) {
        try {
            const { name, description, user, password, schema, optimize, allowCache, filter } = req.body;

            if (!name || !user || !password || !schema) {
                return next(new HttpException(400, 'Se requieren: name, user (clientId), password (clientSecret), schema'));
            }

            const config = { type: 'aoc', host: aoc_config.host, port: aoc_config.port, database: aoc_config.database, schema, user, password };
            const conn = new AOCConnection(config);
            const tables = await conn.generateDataModel(optimize ? 1 : 0, filter || '');

            const CC = allowCache ? cache_config.DEFAULT_CACHE_CONFIG : cache_config.DEFAULT_NO_CACHE_CONFIG;

            const datasource: IDataSource = new DataSource({
                ds: {
                    connection: { ...config, password: EnCrypterService.encrypt(password) },
                    metadata: {
                        model_name: name,
                        model_description: description || '',
                        model_id: '',
                        model_granted_roles: [],
                        optimized: !!optimize,
                        cache_config: CC,
                        model_owner: req.user._id,
                        ia_visibility: 'FULL'
                    },
                    model: { tables }
                }
            });

            const saved = await datasource.save();
            return res.status(201).json({ ok: true, data_source_id: saved._id });

        } catch (err: any) {
            console.error('[AOC] addDataSource error:', err.message);
            return next(new HttpException(500, `Error creando datasource AOC: ${err.message}`));
        }
    }
}
