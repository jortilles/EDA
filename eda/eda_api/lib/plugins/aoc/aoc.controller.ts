import { NextFunction, Request, Response } from 'express';
import { HttpException } from '../../module/global/model/index';
import { AOCConnection } from './aoc-connection';
import { EnCrypterService } from '../../services/encrypter/encrypter.service';
import DataSource, { IDataSource } from '../../module/datasource/model/datasource.model';

const cache_config = require('../../../config/cache.config');

export class AOCController {

    static async listAmbitos(req: Request, res: Response, next: NextFunction) {
        try {
            const { host, port, database, user, password, ssl } = req.body;

            if (!host || !database || !user || !password) {
                return next(new HttpException(400, 'Se requieren: host, database, user, password'));
            }

            const conn = new AOCConnection({ type: 'aoc', host, port, database, user, password, ssl });
            const ambitos = await conn.listAmbitos();
            return res.status(200).json({ ok: true, ambitos });

        } catch (err: any) {
            console.error('[AOC] listAmbitos error:', err.message);
            return next(new HttpException(500, `Error al conectar con AOC: ${err.message}`));
        }
    }

    static async addDataSource(req: Request, res: Response, next: NextFunction) {
        try {
            const { name, description, host, port, database, user, password, ssl, schema, optimize, allowCache, filter } = req.body;

            if (!name || !host || !database || !user || !password || !schema) {
                return next(new HttpException(400, 'Se requieren: name, host, database, user, password, schema'));
            }

            const config = { type: 'aoc', host, port, database, schema, user, password, ssl };
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
