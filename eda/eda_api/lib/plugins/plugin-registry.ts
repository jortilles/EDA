import { IEDAPlugin } from './plugin.interface';

export class PluginRegistry {
    private static plugins: IEDAPlugin[] = [];

    static register(plugin: IEDAPlugin): void {
        this.plugins.push(plugin);
    }

    static getAll(): IEDAPlugin[] {
        return [...this.plugins];
    }

    static getByType(type: string): IEDAPlugin | undefined {
        return this.plugins.find(p => p.type === type);
    }
}
