import { Type } from '@angular/core';

export interface IDatasourcePlugin {
    type: string;
    label: string;
    port: number | null;
    formComponent: Type<any>;
    apiBasePath: string;
    /** IconService key for this plugin's brand logo, shown next to its label in the "Tipo" dropdown */
    icon?: string;
}
