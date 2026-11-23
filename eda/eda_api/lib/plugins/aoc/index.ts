import { IEDAPlugin } from '../plugin.interface';
import { AOCConnection } from './aoc-connection';
import AOCRouter from './aoc.router';

export const AOCPlugin: IEDAPlugin = {
    kind: 'datasource',
    type: 'aoc',
    connectionClass: AOCConnection,
    router: AOCRouter,
    routerPath: '/aoc',
};
