import { test, expect } from '../fixtures/base';
import { createSalesDuckDbDataSource } from '../../utils/duckdb-fixture';

/**
 * Estas pruebas ejercitan datasources REALES basadas en CSV/DuckDB (sin conector de red):
 * es la unica via de datasource "de verdad" que no depende de un motor de BD externo,
 * asi que sirve de sustituto valido de mysql/postgres/oracle/etc. para el resto de la suite
 * (dashboards, paneles, graficos). Los conectores SQL externos se cubren aparte, solo a
 * nivel de validacion/manejo de errores (ver datasource-sql-validation.spec.ts).
 */
test.describe('Datasource DuckDB (/datasource/add-duckdb-data-source y relacionados)', () => {
    test('crear una datasource DuckDB desde CSV, verla listada y borrarla', async ({ api, uniqueName, track }) => {
        const name = uniqueName('ds-duckdb');
        const folder = uniqueName('folder').toLowerCase();

        const createRes = await createSalesDuckDbDataSource(api, name, folder);
        expect(createRes.status(), await createRes.text()).toBe(201);
        const created = await createRes.json();
        expect(created.ok).toBeTruthy();
        const dsId = created.data_source_id;
        expect(dsId).toBeTruthy();
        track('datasource', dsId);

        const getRes = await api.get(`/datasource/${dsId}`);
        expect(getRes.ok()).toBeTruthy();
        const fetched = await getRes.json();
        const model = fetched.dataSource;
        expect(model.ds.metadata.model_name).toBe(name);
        expect(model.ds.connection.type).toBe('duckdb');
        expect(model.ds.model.tables[0].table_name).toBe('ventas');
        expect(model.ds.model.tables[0].columns.length).toBe(6);

        const deleteRes = await api.delete(`/datasource/${dsId}`);
        expect(deleteRes.ok()).toBeTruthy();
    });

    test('crear sin folderName ni csvFiles devuelve 400', async ({ api, uniqueName }) => {
        const res = await api.post('/datasource/add-duckdb-data-source', { name: uniqueName('incompleta') });
        expect(res.status()).toBe(400);
    });

    test('un usuario sin permisos de datasource no puede crear una datasource (403)', async ({ apiAsLimitedUser, uniqueName }) => {
        const res = await apiAsLimitedUser.post('/datasource/add-duckdb-data-source', {
            name: uniqueName('hack'),
            folderName: 'hack',
            csvFiles: [{ fileName: 'x', csvContent: 'a\n1', columnsConfig: [{ field: 'a', type: 'text' }] }],
        });
        expect(res.status()).toBe(403);
    });

    test('anadir y borrar una tabla adicional a una datasource DuckDB existente', async ({ api, uniqueName, track }) => {
        const name = uniqueName('ds-duckdb-tabla');
        const folder = uniqueName('folder2').toLowerCase();
        const createRes = await createSalesDuckDbDataSource(api, name, folder);
        const created = await createRes.json();
        const dsId = created.data_source_id;
        track('datasource', dsId);

        const addTableRes = await api.post(`/datasource/duckdb-add-table/${dsId}`, {
            fileName: 'clientes',
            csvContent: 'id,nombre\n1,Ana\n2,Luis\n',
            columnsConfig: [
                { field: 'id', type: 'integer' },
                { field: 'nombre', type: 'text' },
            ],
        });
        expect(addTableRes.ok(), await addTableRes.text()).toBeTruthy();

        const getRes = await api.get(`/datasource/${dsId}`);
        const fetched = await getRes.json();
        const model = fetched.dataSource;
        expect(model.ds.model.tables.map((t: any) => t.table_name)).toContain('clientes');

        const deleteTableRes = await api.delete(`/datasource/duckdb-table/${dsId}/clientes`);
        expect(deleteTableRes.ok()).toBeTruthy();
    });
});
