import { Injectable } from '@angular/core';
import { IActionPlugin, IChartPlugin, ILoginPlugin, IPagePlugin, IPlugin, IWidgetPlugin } from './plugin.interface';
import { PLUGINS } from './plugin-registry';

@Injectable({ providedIn: 'root' })
export class PluginService {

    getChartPlugins(): IChartPlugin[] {
        return PLUGINS.filter((p): p is IChartPlugin => p.type === 'chart');
    }

    getPagePlugins(): IPagePlugin[] {
        return PLUGINS.filter((p): p is IPagePlugin => p.type === 'page');
    }

    getWidgetPlugins(): IWidgetPlugin[] {
        return PLUGINS.filter((p): p is IWidgetPlugin => p.type === 'widget');
    }

    getActionPlugins(context: IActionPlugin['context']): IActionPlugin[] {
        return PLUGINS.filter((p): p is IActionPlugin => p.type === 'action' && p.context === context);
    }

    getLoginPlugin(): ILoginPlugin | undefined {
        return PLUGINS.find((p): p is ILoginPlugin => p.type === 'login');
    }

    getByKey(key: string): IPlugin | undefined {
        return PLUGINS.find(p => p.key === key);
    }
}
