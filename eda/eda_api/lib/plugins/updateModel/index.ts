import { IFeaturePlugin } from '../plugin.interface';
import UpdateModelRouter from './updateModel.router';

export const UpdateModelPlugin: IFeaturePlugin = {
    kind: 'feature',
    type: 'updatemodel',
    router: UpdateModelRouter,
    routerPath: '/updatemodel',
};
