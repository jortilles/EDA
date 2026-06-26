import { Type } from '@angular/core';

export interface IDatasourcePlugin {
    type: string;
    label: string;
    port: number | null;
    formComponent: Type<any>;
    apiBasePath: string;
}
