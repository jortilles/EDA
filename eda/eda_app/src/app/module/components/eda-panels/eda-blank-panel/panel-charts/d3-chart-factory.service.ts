import { Injectable } from '@angular/core';
import { D3_CHART_PLUGINS, ID3ChartPlugin } from './d3-chart-plugin';

/**
 * Looks up the ID3ChartPlugin registered for a chart type - same idiom as
 * PluginService (plugins/plugin.service.ts) filtering the flat PLUGINS array.
 * Mounting the resolved component into the DOM stays panel-chart.component.ts's
 * job, since several panel-chart instances can render concurrently on the same
 * dashboard.
 */
@Injectable({ providedIn: 'root' })
export class D3ChartFactoryService {

    has(chartType: string): boolean {
        return D3_CHART_PLUGINS.some(p => p.type === chartType);
    }

    get(chartType: string): ID3ChartPlugin | undefined {
        return D3_CHART_PLUGINS.find(p => p.type === chartType);
    }
}
