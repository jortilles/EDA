import { test, expect } from '../fixtures/base';

/**
 * El asistente IA llama a un LLM real con una API key real (ver assistant-and-mcp.spec.ts
 * para el porque no se invoca nunca de verdad). Aqui se prueba la UI del chat de punta a
 * punta interceptando la respuesta del backend a nivel de red (page.route), replicando el
 * formato SSE exacto que usa ia-chat.service.ts (eventos "status"/"token"/"response"),
 * sin que ninguna llamada real llegue al backend de IA.
 */
test.describe('Asistente IA - widget de chat (mockeado, sin llamar al LLM real)', () => {
    test('abrir el chat, enviar un mensaje y ver la respuesta simulada', async ({ page }) => {
        await page.route('**/ia/chat/config**', (route) =>
            route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ available: true }) })
        );
        await page.route('**/ia/chat?**', (route) => {
            const sse =
                'event: status\ndata: {"code":"analyzing"}\n\n' +
                'event: token\ndata: {"text":"Hola"}\n\n' +
                'event: response\ndata: {"ok":true,"response":"Hola, soy una respuesta simulada por Playwright."}\n\n';
            return route.fulfill({ status: 200, contentType: 'text/event-stream', body: sse });
        });

        await page.goto('/#/home');
        await expect(page.locator('.chat-fab')).toBeVisible({ timeout: 15_000 });
        await page.locator('.chat-fab').click();
        await expect(page.locator('.chat-panel')).toBeVisible();

        await page.locator('.chat-textarea').fill('Hola asistente, esto es una prueba automatizada');
        await page.locator('.chat-send-btn').click();

        await expect(page.locator('.chat-bubble--assistant', { hasText: 'respuesta simulada' })).toBeVisible({ timeout: 15_000 });
        await expect(page.locator('.chat-bubble--user', { hasText: 'Hola asistente' })).toBeVisible();
    });

    test('un error del backend de IA se muestra en el chat sin romper la pagina', async ({ page }) => {
        await page.route('**/ia/chat/config**', (route) =>
            route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ available: true }) })
        );
        await page.route('**/ia/chat?**', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ ok: false, response: 'no disponible' }) }));

        await page.goto('/#/home');
        await page.locator('.chat-fab').click();
        await page.locator('.chat-textarea').fill('esto deberia fallar');
        await page.locator('.chat-send-btn').click();

        // No debe quedar la app en un estado roto: el input sigue siendo usable.
        await expect(page.locator('.chat-textarea')).toBeVisible({ timeout: 10_000 });
    });

    test('si la IA no esta disponible, el boton flotante de chat no se muestra', async ({ page }) => {
        await page.route('**/ia/chat/config**', (route) =>
            route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ available: false }) })
        );
        await page.goto('/#/home');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('.chat-fab')).toHaveCount(0);
    });
});
