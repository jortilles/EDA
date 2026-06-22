import { AbstractConnection } from '../services/connection/abstract-connection';
import { IDatasourcePlugin, IEDAPlugin, IFeaturePlugin, isDatasourcePlugin } from './plugin.interface';

export class PluginRegistry {
    private static plugins = new Map<string, IEDAPlugin>();

    static register(plugin: IEDAPlugin): void {
        this.plugins.set(plugin.type, plugin);
        console.log(`[PluginRegistry] Registered plugin: ${plugin.type}`);
    }

    static get(type: string): IEDAPlugin | undefined {
        return this.plugins.get(type);
    }

    static getAll(): IEDAPlugin[] {
        return Array.from(this.plugins.values());
    }

    static getDatasourcePlugins(): IDatasourcePlugin[] {
        return this.getAll().filter((p): p is IDatasourcePlugin => isDatasourcePlugin(p));
    }

    static getFeaturePlugins(): IFeaturePlugin[] {
        return this.getAll().filter((p): p is IFeaturePlugin => !isDatasourcePlugin(p));
    }

    static getConnection(type: string, config: any): AbstractConnection | null {
        const plugin = this.plugins.get(type);
        if (!plugin || !isDatasourcePlugin(plugin)) return null;
        return new plugin.connectionClass(config);
    }
}