import { IEDAPlugin } from './plugin.interface';
import { AbstractConnection } from '../services/connection/abstract-connection';

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

    static getConnection(type: string, config: any): AbstractConnection | null {
        const plugin = this.plugins.get(type);
        return plugin ? new plugin.connectionClass(config) : null;
    }
}
