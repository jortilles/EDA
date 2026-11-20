import { test, expect } from '../fixtures/e2e-base';

test.describe('Home y navegacion principal', () => {
    test('home carga y muestra el boton de crear informe para un admin', async ({ page }) => {
        await page.goto('/#/home');
        await expect(page).toHaveURL(/#\/home/);
        // Tolera es ("Crear nuevo informe") y ca ("Crear nou informe") -- ver nota
        // en admin-groups.spec.ts.
        await expect(page.getByText(/Crear n(uevo|ou) informe/)).toBeVisible({ timeout: 15_000 });
    });

    test('la barra de navegacion lateral se renderiza con sus iconos', async ({ page }) => {
        await page.goto('/#/home');
        await expect(page.locator('#sidebar-btn-toggle')).toBeVisible({ timeout: 15_000 });
    });

    for (const route of ['/admin/users', '/admin/groups', '/admin/media', '/admin/data-source', '/admin/alerts-management', '/logs', '/about', '/profile']) {
        test(`un admin puede navegar directamente a ${route} sin ser redirigido a login`, async ({ page }) => {
            // 'networkidle' no es fiable aqui: /admin/alerts-management dispara un
            // GET /dashboard/:id por cada dashboard existente (N+1,
            // alerts-management.component.ts:initDashboards()) -- con los ~100+
            // dashboards de una BBDD de dev real, la red nunca llega a quedar
            // inactiva dentro del timeout. Lo que el test necesita de verdad es solo
            // "no redirigio a login", que expect() con reintentos ya cubre sin esperar
            // a que la red se calle.
            await page.goto(`/#${route}`);
            await expect(page).not.toHaveURL(/#\/login/, { timeout: 20_000 });
            // El video nunca muestra la barra de direcciones del navegador (solo graba
            // el contenido de la pagina) -- se deja la URL real en el log del test
            // (informe HTML / consola) para poder verificarla sin depender del video.
            console.log(`[redireccion] URL final tras navegar a ${route}: ${page.url()}`);
        });
    }

    test('logout (boton de la barra lateral) vuelve a la pantalla de login', async ({ page }) => {
        // /logout no es una ruta Angular real: el boton la intercepta en menuCommand()
        // y llama a userService.logout(). eda-icon expone "name" como @Input() de Angular,
        // no como atributo HTML reflejado, asi que no es seleccionable por [name=logout];
        // en cambio el orden de main-left-sidebar.ts (assignNavItems) garantiza que logout
        // es siempre el ULTIMO boton de nivel superior de la barra, para cualquier rol.
        await page.goto('/#/home');
        await page.locator('.sidebar-btn').last().click();
        await page.waitForURL(/#\/(login)?$/, { timeout: 15_000 });
        await expect(page.locator('#email')).toBeVisible();
    });
});
