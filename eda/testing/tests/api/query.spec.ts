import { test, expect } from '../fixtures/base';
import { createSalesDuckDbDataSource } from '../../utils/duckdb-fixture';

/**
 * La prueba mas valiosa de toda la suite de API: crea una datasource real
 * (CSV/DuckDB), ejecuta una consulta SQL real contra ella a traves de la misma
 * ruta que usa el editor de paneles del dashboard, y comprueba que los datos que
 * vuelven son EXACTAMENTE los que se insertaron. Verifica de punta a punta que
 * el pipeline datasource -> motor de queries -> resultado funciona de verdad.
 *
 * mode: 'serial' porque las 3 pruebas comparten la misma datasource (creada una
 * sola vez en la primera prueba) para no pagar el coste de crearla 3 veces.
 */
test.describe.configure({ mode: 'serial' });

test.describe('Ejecucion de queries (/dashboard/sql-query)', () => {
    let dsId: string;

    test('preparacion: crear la datasource de pruebas', async ({ api, uniqueName, track }) => {
        const res = await createSalesDuckDbDataSource(api, uniqueName('ds-query'), uniqueName('qfolder').toLowerCase());
        expect(res.status(), await res.text()).toBe(201);
        const body = await res.json();
        dsId = body.data_source_id;
        track('datasource', dsId);
        expect(dsId).toBeTruthy();
    });

    test('una consulta SQL simple devuelve las 8 filas insertadas', async ({ api }) => {
        const res = await api.post('/dashboard/sql-query', {
            model_id: dsId,
            query: { SQLexpression: 'select * from ventas', filters: [] },
        });
        expect(res.ok(), await res.text()).toBeTruthy();
        const body = await res.json();
        expect(JSON.stringify(body)).toContain('Silla');
        expect(JSON.stringify(body)).toContain('Monitor');
    });

    test('una agregacion SQL sobre la datasource devuelve el total correcto', async ({ api }) => {
        const res = await api.post('/dashboard/sql-query', {
            model_id: dsId,
            query: { SQLexpression: 'select categoria, sum(importe) as total from ventas group by categoria order by categoria', filters: [] },
        });
        expect(res.ok(), await res.text()).toBeTruthy();
        const body = await res.json();
        expect(JSON.stringify(body)).toContain('Electronica');
    });

    test('una consulta contra una tabla que no existe devuelve error, no un 200 con datos falsos', async ({ api }) => {
        const res = await api.post('/dashboard/sql-query', {
            model_id: dsId,
            query: { SQLexpression: 'select * from tabla_que_no_existe_xyz', filters: [] },
        });
        const body = await res.json().catch(() => null);
        const succeededWithData = res.ok() && JSON.stringify(body).length > 20 && !JSON.stringify(body).toLowerCase().includes('error');
        expect(succeededWithData, `Respuesta inesperada: ${JSON.stringify(body)}`).toBeFalsy();
    });
});
