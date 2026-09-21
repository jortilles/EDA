import { test, expect } from '../fixtures/base';

// PNG 1x1 transparente, el archivo mas pequeño valido que acepta el validador de imagenes.
const TINY_PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64'
);

test.describe('Media (/media)', () => {
    test('subir una imagen, verla listada, y borrarla', async ({ api, uniqueName, track }) => {
        const filename = `${uniqueName('logo')}.png`;

        const uploadRes = await api.postMultipart('/media/upload', {
            img: { name: filename, mimeType: 'image/png', buffer: TINY_PNG },
        });
        expect(uploadRes.status(), await uploadRes.text()).toBe(201);
        const uploaded = await uploadRes.json();
        expect(uploaded.ok).toBeTruthy();
        const mediaId = uploaded.media._id;
        track('media', mediaId);
        expect(uploaded.media.originalName).toBe(filename);

        const listRes = await api.get('/media');
        expect(listRes.ok()).toBeTruthy();
        const list = await listRes.json();
        expect(list.media.some((m: any) => m._id === mediaId)).toBeTruthy();

        const imgRes = await api.get(`/media/img/${uploaded.media.filename}`);
        expect(imgRes.ok()).toBeTruthy();

        const usageRes = await api.get(`/media/${mediaId}/usage`);
        expect(usageRes.ok()).toBeTruthy();

        const deleteRes = await api.delete(`/media/${mediaId}`);
        expect(deleteRes.ok()).toBeTruthy();
    });

    test('subir un archivo con extension no permitida devuelve 400', async ({ api, uniqueName }) => {
        const res = await api.postMultipart('/media/upload', {
            img: { name: `${uniqueName('malicioso')}.exe`, mimeType: 'application/octet-stream', buffer: Buffer.from('no-es-una-imagen') },
        });
        expect(res.status()).toBe(400);
    });

    test('subir sin archivo devuelve 400', async ({ api }) => {
        const res = await api.post('/media/upload', {});
        expect(res.status()).toBe(400);
    });

    test.describe('carpetas', () => {
        test('crear, listar, renombrar y borrar una carpeta', async ({ api, uniqueName, track }) => {
            const name = uniqueName('carpeta');

            const createRes = await api.post('/media/folders', { name });
            expect(createRes.status()).toBe(201);
            const created = await createRes.json();
            const folderId = created.folder._id;
            track('mediaFolder', folderId);

            const listRes = await api.get('/media/folders');
            expect(listRes.ok()).toBeTruthy();
            const list = await listRes.json();
            expect(list.folders.some((f: any) => f._id === folderId)).toBeTruthy();

            const renameRes = await api.put(`/media/folders/${folderId}`, { name: `${name}_editada` });
            expect(renameRes.ok()).toBeTruthy();

            const deleteRes = await api.delete(`/media/folders/${folderId}`);
            expect(deleteRes.ok()).toBeTruthy();
        });

        test('crear una carpeta sin nombre devuelve 400', async ({ api }) => {
            const res = await api.post('/media/folders', { name: '' });
            expect(res.status()).toBe(400);
        });
    });

    test('un usuario limitado no puede crear carpetas (403)', async ({ apiAsLimitedUser, uniqueName }) => {
        const res = await apiAsLimitedUser.post('/media/folders', { name: uniqueName('hack') });
        expect(res.status()).toBe(403);
    });
});
