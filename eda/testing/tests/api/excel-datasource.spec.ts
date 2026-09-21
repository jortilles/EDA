import { test, expect } from '../fixtures/base';

/**
 * El modo "multi-tabla" de esta ruta escribe DIRECTAMENTE colecciones Mongo reales
 * (xls_<nombre>_<tabla>) en la base de datos de desarrollo, y ni /datasource ni
 * ningun otro endpoint las elimina al borrar la datasource asociada (a diferencia
 * de DuckDB). Para no dejar colecciones huerfanas en la BBDD compartida, aqui solo
 * se prueban los caminos de validacion/permiso, sin crear una datasource real de
 * este tipo. La via con datos reales y limpieza garantizada es datasource-duckdb.spec.ts.
 */
test.describe('Datasource Excel/JSON (/excel-sheets)', () => {
    test('crear sin nombre ni campos/tablas devuelve 400', async ({ api }) => {
        const res = await api.post('/excel-sheets/add-json-data-source', {});
        expect(res.status()).toBe(400);
    });

    test('crear sin token devuelve 401', async ({ apiAnonymous, uniqueName }) => {
        const res = await apiAnonymous.post('/excel-sheets/add-json-data-source', {
            name: uniqueName('sin-token'),
            tables: [{ tableName: 't', fields: [] }],
        });
        expect(res.status()).toBe(401);
    });

    test('un usuario sin permisos de datasource no puede crear una datasource excel/json (403)', async ({ apiAsLimitedUser, uniqueName }) => {
        const res = await apiAsLimitedUser.post('/excel-sheets/add-json-data-source', {
            name: uniqueName('hack'),
            tables: [{ tableName: 't', fields: [] }],
        });
        expect(res.status()).toBe(403);
    });

    test('comprobar existencia de un excel-datasource que no existe', async ({ api, uniqueName }) => {
        const res = await api.post('/excel-sheets/existent-json-data-source', { name: uniqueName('no-existe') });
        expect(res.ok()).toBeTruthy();
        const body = await res.json();
        expect(body.existence).toBe(false);
    });
});
