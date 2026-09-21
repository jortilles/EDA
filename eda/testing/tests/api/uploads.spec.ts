import { test, expect } from '../fixtures/base';

const TINY_PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64'
);

/**
 * /global/upload/addFile guarda un GeoJSON (feature collection) sin exponer
 * ningun endpoint de borrado, por lo que aqui solo se prueban los caminos de
 * validacion/permiso (no crean datos permanentes sin forma de limpiarlos).
 */
test.describe('Uploads (/global/upload)', () => {
    test('actualizar la imagen de perfil del usuario de test admin', async ({ api, adminSession }) => {
        const res = await api.putMultipart(`/global/upload?id=${adminSession.userId}&from=user`, {
            img: { name: 'avatar.png', mimeType: 'image/png', buffer: TINY_PNG },
        });
        expect(res.status(), await res.text()).toBe(200);
        const body = await res.json();
        expect(body.ok).toBeTruthy();
        expect(body.user.img).toMatch(/\.png$/);
    });

    test('actualizar imagen de perfil con extension no permitida devuelve 400', async ({ api, adminSession }) => {
        const res = await api.putMultipart(`/global/upload?id=${adminSession.userId}&from=user`, {
            img: { name: 'avatar.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg></svg>') },
        });
        expect(res.status()).toBe(400);
    });

    test('actualizar imagen de perfil sin archivo devuelve 400', async ({ api, adminSession }) => {
        const res = await api.put(`/global/upload?id=${adminSession.userId}&from=user`, {});
        expect(res.status()).toBe(400);
    });

    test('leer un GeoJSON de un id inexistente no rompe: devuelve una topologia vacia', async ({ api }) => {
        // No hay features guardadas para este id, asi que el endpoint no lanza 404: construye
        // igualmente una topologia (vacia) a partir de una FeatureCollection sin features.
        const res = await api.get('/global/upload/readGeoJsonFile/000000000000000000000000');
        expect(res.ok(), await res.text()).toBeTruthy();
        const body = await res.json();
        expect(body.ok).toBeTruthy();
    });

    test('subir un archivo de datos sin token devuelve 401', async ({ apiAnonymous }) => {
        const res = await apiAnonymous.post('/global/upload/addFile', { type: 'FeatureCollection', features: [] });
        expect(res.status()).toBe(401);
    });

    test('un usuario sin rol admin no puede subir credenciales de BigQuery (403)', async ({ apiAsLimitedUser }) => {
        const res = await apiAsLimitedUser.post('/global/upload/bigqueryCredentials', { project_id: 'hack' });
        expect(res.status()).toBe(403);
    });
});
