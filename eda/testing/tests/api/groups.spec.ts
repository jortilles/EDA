import { test, expect } from '../fixtures/base';

test.describe('Grupos (/admin/groups)', () => {
    test('el admin puede listar todos los grupos e incluye el grupo admin fijo', async ({ api }) => {
        const res = await api.get('/admin/groups');
        expect(res.ok()).toBeTruthy();
        const groups = await res.json();
        expect(Array.isArray(groups)).toBeTruthy();
        expect(groups.some((g: any) => g.role === 'EDA_ADMIN_ROLE')).toBeTruthy();
    });

    test('ciclo completo: crear, leer, actualizar y borrar un grupo', async ({ api, uniqueName, track }) => {
        const name = uniqueName('grupo');

        const createRes = await api.post('/admin/groups', { name, role: { value: 'EDA_USER_ROLE' }, users: [] });
        expect(createRes.status()).toBeGreaterThanOrEqual(200);
        expect(createRes.ok()).toBeTruthy();
        const created = await createRes.json();
        const groupId = created.group?._id ?? created._id;
        expect(groupId).toBeTruthy();
        track('group', groupId);

        const getRes = await api.get(`/admin/groups/${groupId}`);
        expect(getRes.ok()).toBeTruthy();
        const fetched = await getRes.json();
        expect(fetched.name).toBe(name);

        const updateRes = await api.put(`/admin/groups/${groupId}`, { name: `${name}_editado`, role: { value: 'EDA_USER_ROLE' }, users: [] });
        expect(updateRes.ok()).toBeTruthy();

        const deleteRes = await api.delete(`/admin/groups/${groupId}`);
        expect(deleteRes.ok()).toBeTruthy();
    });

    test('crear un grupo con un role no permitido por el enum devuelve error', async ({ api, uniqueName }) => {
        const res = await api.post('/admin/groups', { name: uniqueName('rol-invalido'), role: { value: 'ROL_QUE_NO_EXISTE' }, users: [] });
        expect(res.ok()).toBeFalsy();
    });

    test('/admin/groups/mine funciona para cualquier usuario autenticado', async ({ apiAsLimitedUser }) => {
        const res = await apiAsLimitedUser.get('/admin/groups/mine');
        expect(res.ok()).toBeTruthy();
    });

    test.describe('permisos', () => {
        test('un usuario limitado no puede listar todos los grupos (403)', async ({ apiAsLimitedUser }) => {
            const res = await apiAsLimitedUser.get('/admin/groups');
            expect(res.status()).toBe(403);
        });

        test('un usuario limitado no puede crear grupos (403)', async ({ apiAsLimitedUser, uniqueName }) => {
            const res = await apiAsLimitedUser.post('/admin/groups', { name: uniqueName('hack'), role: { value: 'EDA_USER_ROLE' }, users: [] });
            expect(res.status()).toBe(403);
        });
    });
});
