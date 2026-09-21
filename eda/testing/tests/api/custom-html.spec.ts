import { test, expect } from '../fixtures/base';

/**
 * No expone endpoint de borrado (es contenido de la app tipo "clave -> HTML embebido",
 * pensado para persistir), asi que se usa una clave unica por test para no pisar
 * ninguna clave real usada por la aplicacion. Queda un documento minimo y aislado.
 */
test.describe('Custom HTML (/customHTML)', () => {
    test('leer una clave inexistente devuelve 404', async ({ apiAnonymous, uniqueName }) => {
        const res = await apiAnonymous.get(`/customHTML/${uniqueName('inexistente')}`);
        expect(res.status()).toBe(404);
    });

    test('crear (upsert) y luego leer una clave, sin necesitar token para leer', async ({ api, apiAnonymous, uniqueName }) => {
        const key = uniqueName('bloque');
        const value = '<p>contenido de prueba</p>';

        const putRes = await api.put(`/customHTML/${key}`, { value, updatedBy: 'playwright' });
        expect(putRes.ok(), await putRes.text()).toBeTruthy();
        const putBody = await putRes.json();
        expect(putBody.value).toBe(value);

        const getRes = await apiAnonymous.get(`/customHTML/${key}`);
        expect(getRes.ok()).toBeTruthy();
        const getBody = await getRes.json();
        expect(getBody.value).toBe(value);
    });

    test('actualizar una clave existente sobreescribe el valor (upsert)', async ({ api, uniqueName }) => {
        const key = uniqueName('bloque-update');
        await api.put(`/customHTML/${key}`, { value: '<p>v1</p>', updatedBy: 'playwright' });
        const res = await api.put(`/customHTML/${key}`, { value: '<p>v2</p>', updatedBy: 'playwright' });
        expect(res.ok()).toBeTruthy();
        const body = await res.json();
        expect(body.value).toBe('<p>v2</p>');
    });

    test('actualizar sin token devuelve 401', async ({ apiAnonymous, uniqueName }) => {
        const res = await apiAnonymous.put(`/customHTML/${uniqueName('sin-token')}`, { value: '<p>x</p>' });
        expect(res.status()).toBe(401);
    });
});
