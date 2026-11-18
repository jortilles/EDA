import { test, expect } from '../fixtures/base';
import { EDA_ADMIN_GROUP_ID } from '../../utils/env';

test.describe('Usuarios (/admin/user)', () => {
    test('el admin puede listar todos los usuarios', async ({ api, adminSession }) => {
        const res = await api.get('/admin/user');
        expect(res.ok()).toBeTruthy();
        const users = await res.json();
        expect(Array.isArray(users)).toBeTruthy();
        expect(users.some((u: any) => u.email === adminSession.email)).toBeTruthy();
    });

    test('crear, leer, actualizar y borrar un usuario (ciclo completo)', async ({ api, uniqueName, track }) => {
        const email = `${uniqueName('crud')}@eda-tests.local`;

        const createRes = await api.post('/admin/user', {
            name: 'Usuario CRUD Playwright',
            email,
            password: 'Pw_Crud_123!',
            role: [],
        });
        expect(createRes.status()).toBe(201);
        const created = await createRes.json();
        const userId = created.user._id;
        track('user', userId);

        const getRes = await api.get(`/admin/user/${userId}`);
        expect(getRes.ok()).toBeTruthy();
        const fetched = await getRes.json();
        expect(fetched.user.email).toBe(email);

        const updateRes = await api.put(`/admin/user/management/${userId}`, {
            name: 'Usuario CRUD Playwright (editado)',
            email,
            role: [],
        });
        expect(updateRes.ok()).toBeTruthy();

        const deleteRes = await api.delete(`/admin/user/${userId}`);
        expect(deleteRes.ok()).toBeTruthy();

        const getAfterDelete = await api.get(`/admin/user/${userId}`);
        expect(getAfterDelete.ok()).toBeFalsy();
    });

    test('crear un usuario sin email devuelve error, no 201', async ({ api, uniqueName }) => {
        const res = await api.post('/admin/user', {
            name: uniqueName('sin-email'),
            password: 'Pw_123!',
            role: [],
        });
        expect(res.ok()).toBeFalsy();
    });

    test('is-admin devuelve true para el usuario admin de test', async ({ api, adminSession }) => {
        const res = await api.get(`/admin/user/is-admin/${adminSession.userId}`);
        expect(res.ok()).toBeTruthy();
        const body = await res.json();
        expect(body.isAdmin).toBe(true);
    });

    test('is-admin devuelve false para el usuario limitado', async ({ api, limitedUserSession }) => {
        const res = await api.get(`/admin/user/is-admin/${limitedUserSession.userId}`);
        expect(res.ok()).toBeTruthy();
        const body = await res.json();
        expect(body.isAdmin).toBe(false);
    });

    test.describe('permisos: un usuario sin rol de admin no puede administrar otros usuarios', () => {
        test('GET /admin/user/:id devuelve 403 para un usuario limitado', async ({ apiAsLimitedUser, adminSession }) => {
            const res = await apiAsLimitedUser.get(`/admin/user/${adminSession.userId}`);
            expect(res.status()).toBe(403);
        });

        test('DELETE /admin/user/:id devuelve 403 para un usuario limitado', async ({ apiAsLimitedUser, adminSession }) => {
            const res = await apiAsLimitedUser.delete(`/admin/user/${adminSession.userId}`);
            expect(res.status()).toBe(403);
        });

        test('PUT /admin/user/management/:id devuelve 403 para un usuario limitado', async ({ apiAsLimitedUser, adminSession }) => {
            const res = await apiAsLimitedUser.put(`/admin/user/management/${adminSession.userId}`, {
                name: 'hack',
                email: adminSession.email,
                role: [EDA_ADMIN_GROUP_ID],
            });
            expect(res.status()).toBe(403);
        });
    });

    test('un usuario puede actualizar su propio perfil (PUT /admin/user/me/:id)', async ({ apiAsLimitedUser, limitedUserSession }) => {
        const res = await apiAsLimitedUser.put(`/admin/user/me/${limitedUserSession.userId}`, {
            name: 'Playwright Test User (editado)',
            email: limitedUserSession.email,
        });
        expect(res.ok()).toBeTruthy();
    });
});
