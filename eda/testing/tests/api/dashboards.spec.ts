import { test, expect } from '../fixtures/base';
import { createSalesDuckDbDataSource } from '../../utils/duckdb-fixture';

/**
 * IMPORTANTE (hallazgo real de esta suite, ver README): un dashboard cuyo
 * config.ds no referencia una datasource real (p.ej. {} o ausente) hace que
 * GET /dashboard/:id (dashboard.controller.ts ~L564, `dashboard.config.ds._id`
 * sin comprobar que exista) y DELETE /datasource/:id (datasource.controller.ts
 * ~L355, mismo patron al filtrar dashboards) devuelvan 500 -- y este segundo
 * caso rompe el borrado de CUALQUIER datasource mientras exista un dashboard
 * asi en la base de datos, no solo el creado por el test. Por eso aqui TODOS
 * los dashboards de prueba se crean con una datasource real (DuckDB) asociada.
 */
function dashboardPayload(title: string, dsId: string, visible: 'private' | 'public' = 'private') {
    return {
        config: {
            title,
            visible,
            panel: [],
            ds: { _id: dsId },
            styles: {},
            tag: [],
        },
    };
}

test.describe.configure({ mode: 'serial' });

test.describe('Dashboards (/dashboard)', () => {
    let dsId: string;

    test('preparacion: crear la datasource de la que colgaran los dashboards de prueba', async ({ api, uniqueName, track }) => {
        const res = await createSalesDuckDbDataSource(api, uniqueName('ds-for-dash'), uniqueName('dfolder').toLowerCase());
        expect(res.status(), await res.text()).toBe(201);
        const body = await res.json();
        dsId = body.data_source_id;
        track('datasource', dsId);
    });

    test('listar dashboards devuelve la estructura esperada (dashboards/publics/group/shared)', async ({ api }) => {
        const res = await api.get('/dashboard');
        expect(res.ok()).toBeTruthy();
        const body = await res.json();
        expect(body.ok).toBeTruthy();
        expect(Array.isArray(body.dashboards)).toBeTruthy();
        expect(typeof body.isAdmin).toBe('boolean');
    });

    test('ciclo completo: crear, leer, actualizar, clonar y borrar un dashboard', async ({ api, uniqueName, track }) => {
        const title = uniqueName('dashboard');

        const createRes = await api.post('/dashboard', dashboardPayload(title, dsId));
        expect(createRes.status()).toBe(201);
        const created = await createRes.json();
        const dashboardId = created.dashboard._id;
        track('dashboard', dashboardId);
        expect(created.dashboard.config.title).toBe(title);

        const getRes = await api.get(`/dashboard/${dashboardId}`);
        expect(getRes.ok(), await getRes.text()).toBeTruthy();

        const updateRes = await api.put(`/dashboard/${dashboardId}`, dashboardPayload(`${title}_editado`, dsId));
        expect(updateRes.ok()).toBeTruthy();
        const updated = await updateRes.json();
        expect(updated.dashboard.config.title).toBe(`${title}_editado`);

        const cloneRes = await api.post(`/dashboard/${dashboardId}/clone`, {});
        expect(cloneRes.ok(), await cloneRes.text()).toBeTruthy();
        const cloned = await cloneRes.json();
        const cloneId = cloned.dashboard?._id;
        if (cloneId) track('dashboard', cloneId);

        const deleteRes = await api.delete(`/dashboard/${dashboardId}`);
        expect(deleteRes.ok()).toBeTruthy();

        const getAfterDelete = await api.get(`/dashboard/${dashboardId}`);
        expect(getAfterDelete.ok()).toBeFalsy();
    });

    test('un dashboard publico expone su visibilidad sin necesitar token', async ({ api, apiAnonymous, uniqueName, track }) => {
        const title = uniqueName('publico');
        const createRes = await api.post('/dashboard', dashboardPayload(title, dsId, 'public'));
        const created = await createRes.json();
        const dashboardId = created.dashboard._id;
        track('dashboard', dashboardId);

        const res = await apiAnonymous.get(`/dashboard/${dashboardId}/visibility`);
        expect(res.ok()).toBeTruthy();
    });

    test('cualquier usuario autenticado puede crear dashboards (no requiere rol admin)', async ({ apiAsLimitedUser, uniqueName, track }) => {
        const title = uniqueName('user-normal');
        const res = await apiAsLimitedUser.post('/dashboard', dashboardPayload(title, dsId));
        expect(res.status()).toBe(201);
        const body = await res.json();
        track('dashboard', body.dashboard._id);
    });

    test('crear un dashboard sin token devuelve 401', async ({ apiAnonymous, uniqueName }) => {
        const res = await apiAnonymous.post('/dashboard', dashboardPayload(uniqueName('sin-token'), dsId));
        expect(res.status()).toBe(401);
    });

    test('actualizar un dashboard inexistente devuelve error', async ({ api }) => {
        const res = await api.put('/dashboard/000000000000000000000000', dashboardPayload('no existe', dsId));
        expect(res.ok()).toBeFalsy();
    });

    /**
     * Este test documenta el hallazgo en si mismo (ver docstring superior): confirma
     * que la API responde con un error controlado (no cuelga el proceso) cuando el
     * dashboard no tiene datasource real asociada, para dejar constancia del bug real
     * sin volver a introducir un dashboard "roto" persistente en la base de datos:
     * se borra inmediatamente despues de comprobarlo.
     */
    test('[hallazgo] un dashboard sin datasource asociada hace fallar su propio GET con 500', async ({ api, uniqueName, track }) => {
        const title = uniqueName('sin-datasource');
        const createRes = await api.post('/dashboard', {
            config: { title, visible: 'private', panel: [], ds: {}, styles: {}, tag: [] },
        });
        const created = await createRes.json();
        const dashboardId = created.dashboard._id;
        track('dashboard', dashboardId);

        try {
            const getRes = await api.get(`/dashboard/${dashboardId}`);
            expect(getRes.status(), 'Si esto deja de fallar, el bug se ha corregido: actualiza este test').toBe(500);
        } finally {
            // Mientras este dashboard "roto" exista, TAMBIEN rompe DELETE /datasource/:id
            // para cualquier datasource (ver docstring del describe), asi que se borra
            // de inmediato en vez de esperar al teardown de fin de suite.
            await api.delete(`/dashboard/${dashboardId}`);
        }
    });
});
