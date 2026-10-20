import { Type } from '@angular/core';

export type ComponentPluginPermission = 'admin' | 'owner' | 'observer' | 'anonim' | 'edit' | 'delete' | 'export';

/**
 * Runtime contract of a component plugin.
 *
 * The registry file (`component-plugin-registry.ts`) is auto-generated,
 * so this interface only describes the shape produced by `buildOutput` in
 * `scripts/plugin-types/component-plugins.js`.
 */
export interface IComponentPlugin {
    type: string;
    label: string;
    i18n?: string;
    menuIcon?: string;
    permissions?: ComponentPluginPermission[];
    component: Type<any>;
}