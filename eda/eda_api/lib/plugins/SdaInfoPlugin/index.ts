import { IEDAPlugin } from '../plugin.interface';
import SdaInfoRouter from './getSdaInfo.router';

export const SdaInfoPlugin: IEDAPlugin = {
    kind: 'feature',
    type: 'sdainfo',
    router: SdaInfoRouter,
    routerPath: '/getsdainfo',
};
