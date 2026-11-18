import { ApiClient } from './api-client';

export interface ColumnConfig {
    field: string;
    type: 'integer' | 'numeric' | 'timestamp' | 'text';
}

/**
 * Datasource 100% local basada en CSV + DuckDB (lib/module/datasource/datasource.controller.ts
 * AddDuckDBDataSource). No abre ninguna conexion de red real, por lo que sirve como sustituto
 * fiable de un conector externo (mysql/postgres/oracle/...) para probar dashboards, paneles y
 * graficos sin depender de ninguna base de datos externa real.
 */
export async function createSalesDuckDbDataSource(api: ApiClient, name: string, folderName: string) {
    const columnsConfig: ColumnConfig[] = [
        { field: 'id', type: 'integer' },
        { field: 'producto', type: 'text' },
        { field: 'categoria', type: 'text' },
        { field: 'importe', type: 'numeric' },
        { field: 'unidades', type: 'integer' },
        { field: 'fecha', type: 'timestamp' },
    ];

    const rows = [
        [1, 'Silla', 'Mobiliario', 120.5, 3, '2025-01-05'],
        [2, 'Mesa', 'Mobiliario', 350.0, 1, '2025-01-12'],
        [3, 'Lampara', 'Iluminacion', 45.9, 5, '2025-02-02'],
        [4, 'Monitor', 'Electronica', 210.0, 2, '2025-02-18'],
        [5, 'Teclado', 'Electronica', 60.0, 8, '2025-03-01'],
        [6, 'Sofa', 'Mobiliario', 890.0, 1, '2025-03-20'],
        [7, 'Bombilla', 'Iluminacion', 8.5, 20, '2025-04-04'],
        [8, 'Raton', 'Electronica', 25.0, 12, '2025-04-15'],
    ];

    const header = columnsConfig.map((c) => c.field).join(',');
    const body = rows.map((r) => r.join(',')).join('\n');
    const csvContent = `${header}\n${body}\n`;

    const res = await api.post('/datasource/add-duckdb-data-source', {
        name,
        description: 'Datasource de pruebas generado por Playwright (CSV/DuckDB, sin dependencias externas)',
        optimize: false,
        allowCache: false,
        folderName,
        csvFiles: [{ fileName: 'ventas', csvContent, columnsConfig }],
    });

    return res;
}
