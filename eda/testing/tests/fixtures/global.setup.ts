import { test as setup, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { ENV, EDA_ADMIN_GROUP_ID, testName } from '../../utils/env';
import { login, Session } from '../../utils/api-client';
import { clearTrackedResourcesLog } from '../../utils/resource-log';

const AUTH_DIR = path.resolve(__dirname, '..', '..', '.auth');

/**
 * Bootstrap de la suite:
 * 1. Login con un admin YA EXISTENTE (BOOTSTRAP_ADMIN_*) -- se usa una sola vez, aqui,
 *    y nunca en los tests en si.
 * 2. Con ese login, se crean DOS usuarios dedicados a este run de tests:
 *    - un admin (role EDA_ADMIN_ROLE) para poder ejercitar todo el admin (datasources,
 *      usuarios, grupos, media, mail, etc.)
 *    - un usuario normal (sin grupos) para probar los caminos "sin permiso" (403).
 * 3. Se guardan las sesiones (token) en .auth/*.json para los tests de API.
 * 4. Se hace login real contra la UI (Angular) con el admin de test y se guarda el
 *    storageState del navegador, para que los tests de navegador arranquen ya autenticados.
 */
setup('bootstrap: crear usuarios de test y sesiones', async ({ request, browser }) => {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
    clearTrackedResourcesLog();

    const bootstrap = await login(request, ENV.bootstrapAdminEmail, ENV.bootstrapAdminPassword);
    expect(bootstrap.token, 'No se pudo iniciar sesion con el admin de arranque (BOOTSTRAP_ADMIN_EMAIL/PASSWORD)').toBeTruthy();

    const adminEmail = `${testName('admin')}@eda-tests.local`;
    const adminPassword = `Pw_${ENV.testRunPrefix}_${Date.now()}!`;
    const userEmail = `${testName('user')}@eda-tests.local`;
    const userPassword = `Pw_${ENV.testRunPrefix}_${Date.now()}!`;

    const createAdminRes = await request.post(`${ENV.apiBaseURL}/admin/user?token=${bootstrap.token}`, {
        data: {
            name: 'Playwright Test Admin',
            email: adminEmail,
            password: adminPassword,
            role: [EDA_ADMIN_GROUP_ID],
        },
    });
    expect(createAdminRes.ok(), `No se pudo crear el usuario admin de test: ${createAdminRes.status()} ${await createAdminRes.text()}`).toBeTruthy();

    const createUserRes = await request.post(`${ENV.apiBaseURL}/admin/user?token=${bootstrap.token}`, {
        data: {
            name: 'Playwright Test User',
            email: userEmail,
            password: userPassword,
            role: [],
        },
    });
    expect(createUserRes.ok(), `No se pudo crear el usuario normal de test: ${createUserRes.status()} ${await createUserRes.text()}`).toBeTruthy();

    const adminSession = await login(request, adminEmail, adminPassword);
    const userSession = await login(request, userEmail, userPassword);

    fs.writeFileSync(path.join(AUTH_DIR, 'admin-session.json'), JSON.stringify(adminSession, null, 2));
    fs.writeFileSync(path.join(AUTH_DIR, 'user-session.json'), JSON.stringify(userSession, null, 2));

    // --- Login real por UI para capturar el storageState del navegador (admin y usuario limitado) ---
    async function uiLogin(email: string, password: string, storageFile: string) {
        const context = await browser.newContext({ baseURL: ENV.appBaseURL });
        const page = await context.newPage();
        await page.goto('/#/login');
        await page.locator('#email').fill(email);
        await page.locator('#password').fill(password);
        await page.locator('form button[type="submit"]').click();
        await page.waitForURL(/#\/home/, { timeout: 30_000 });
        // UserService.savingStorage() marca la navegacion a /home ANTES de que la llamada
        // asincrona que fija isAdmin/isDataSourceCreator en localStorage termine (ver
        // user.service.ts:106-113). Sin esto, un storageState capturado justo despues del
        // login carece de "isAdmin", y RoleGuard (role-guard.guard.ts:14) redirige a /home
        // en cualquier carga de pagina fresca a una ruta de admin.
        await page.waitForFunction(() => localStorage.getItem('isAdmin') !== null, { timeout: 15_000 });
        await context.storageState({ path: path.join(AUTH_DIR, storageFile) });
        await context.close();
    }

    await uiLogin(adminEmail, adminPassword, 'admin-storage.json');
    await uiLogin(userEmail, userPassword, 'user-storage.json');

    console.log(`[setup] Usuarios de test creados. Prefijo de datos: ${ENV.testRunPrefix}_${process.env.PW_RUN_ID}`);
});

export type { Session };
