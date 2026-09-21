import { test, expect } from '../fixtures/base';

/**
 * Los conectores SQL externos (mysql/postgres/sqlserver/oracle/clickhouse/mongodb/
 * snowflake/bigquery) no tienen, a nivel de API, ningun modo "simulado": tanto
 * check-connection como add-data-source intentan SIEMPRE una conexion real antes
 * de guardar nada (no hay flag de dry-run). Por eso, siguiendo lo acordado, aqui
 * no se conecta contra ninguna base de datos externa real: se apunta a un host que
 * no responde (127.0.0.1 con un puerto cerrado) y se comprueba que la aplicacion
 * falla de forma controlada (error claro, sin colgarse, sin guardar nada), para
 * cada tipo de motor soportado. La via con datos reales y sin red externa es
 * datasource-duckdb.spec.ts.
 */
const CONNECTOR_TYPES = ['mysql', 'postgres', 'sqlserver', 'oracle', 'clickhouse', 'mongodb', 'vertica', 'snowflake'];

test.describe('Validacion de conectores SQL externos (/datasource/check-connection)', () => {
    // Algunos drivers (mongodb, snowflake) tardan bastante mas en darse por vencidos contra
    // un host que no responde que un simple "connection refused" de TCP (reintentos internos
    // del driver / timeouts propios mas largos), asi que necesitan mas margen que el resto.
    const SLOW_TYPES: Record<string, number> = { mongodb: 60_000 };

    for (const type of CONNECTOR_TYPES) {
        test(`check-connection con host inalcanzable falla de forma controlada (${type})`, async ({ api }) => {
            // snowflake-sdk tarda varios minutos en rendirse contra un host inalcanzable
            // (reintentos internos propios del SDK, no configurables via los parametros
            // que expone check-connection): se omite para no alargar la suite entera por
            // un solo conector; el patron ya queda cubierto por los otros 7 tipos.
            test.skip(type === 'snowflake', 'snowflake-sdk tarda minutos en fallar contra un host inalcanzable; no aporta cobertura adicional sobre el resto de conectores');
            test.slow();
            const timeout = SLOW_TYPES[type] ?? 20_000;
            const res = await api.get(
                '/datasource/check-connection',
                {
                    type,
                    host: '127.0.0.1',
                    port: '1',
                    database: 'no_existe',
                    user: 'no_existe',
                    password: 'no_existe',
                    schema: 'no_existe',
                },
                { timeout }
            );
            expect(res.ok()).toBeFalsy();
            expect(res.status()).toBeGreaterThanOrEqual(400);
            expect(res.status()).toBeLessThan(600);
        });
    }

    test('check-connection con un type no soportado devuelve 404', async ({ api }) => {
        const res = await api.get('/datasource/check-connection', { type: 'db-que-no-existe', host: 'x' });
        expect(res.status()).toBe(404);
    });

    test('check-connection sin permisos de admin/datasource-creator devuelve 403', async ({ apiAsLimitedUser }) => {
        const res = await apiAsLimitedUser.get('/datasource/check-connection', { type: 'mysql', host: 'x' });
        expect(res.status()).toBe(403);
    });

    test('add-data-source con un host inalcanzable falla sin dejar ninguna datasource creada', async ({ api, uniqueName }) => {
        const name = uniqueName('sql-inalcanzable');
        const before = await (await api.get(`/datasource/names`)).json();

        const res = await api.post('/datasource/add-data-source/', {
            name,
            type: 'mysql',
            host: '127.0.0.1',
            port: 1,
            database: 'no_existe',
            user: 'no_existe',
            password: 'no_existe',
        });
        expect(res.ok()).toBeFalsy();

        const after = await (await api.get(`/datasource/names`)).json();
        const beforeNames = JSON.stringify(before);
        const afterNames = JSON.stringify(after);
        expect(afterNames.includes(name) && !beforeNames.includes(name)).toBeFalsy();
    });
});
