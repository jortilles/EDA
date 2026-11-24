import * as express from 'express';
import { IEDAPlugin } from '../plugin.interface';
import { HttpException } from '../../module/global/model/index';
import { AOCConnection } from './aoc-connection';
import { loadOdbc } from './aoc-odbc.loader';
import AOCRouter from './aoc.router';

/**
 * Router mounted instead of the AOC router when the plugin is disabled, so the AOC form in the
 * app gets a clear 503 explaining what is missing instead of a 404.
 */
function buildDisabledRouter(reason: string): express.Router {
    const router = express.Router();
    router.use((_req, _res, next) =>
        next(new HttpException(503, `El conector AOC está deshabilitado en este servidor. ${reason}`)));
    return router;
}

const { error: odbcError } = loadOdbc();

if (odbcError) {
    console.error(`[AOC] Plugin disabled: ${odbcError}`);
}

/** The connection class is only exposed when the native ODBC module is usable */
export const AOCPlugin: IEDAPlugin = odbcError
    ? {
        kind: 'feature',
        type: 'aoc',
        router: buildDisabledRouter(odbcError),
        routerPath: '/aoc',
    }
    : {
        kind: 'datasource',
        type: 'aoc',
        connectionClass: AOCConnection,
        router: AOCRouter,
        routerPath: '/aoc',
    };
