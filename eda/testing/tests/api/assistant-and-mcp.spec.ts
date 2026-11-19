import { test, expect } from '../fixtures/base';

/**
 * IMPORTANTE: /assistant/response, /assistant/prompt, /assistant/suggestions y
 * /assistant/generate-dashboard, asi como /ia/chat con un body valido, llaman a un
 * LLM real (Anthropic/OpenAI/Bedrock segun config/ai.config.js) usando una API key
 * real con coste asociado. Siguiendo lo acordado, esta suite NO los invoca con datos
 * validos: solo se prueban los caminos que se resuelven ANTES de llamar al proveedor
 * (guards de autenticacion, validacion de campos obligatorios, disponibilidad).
 *
 * Tampoco se llama nunca a POST /assistant/config: escribe sobre el fichero de
 * configuracion real de la IA (con la API key en vivo) y sobreescribirlo afectaria
 * a la instalacion real que esta usando el usuario.
 */
test.describe('Asistente IA (/assistant) y MCP (/ia) — solo caminos seguros, sin llamar al LLM', () => {
    test('GET /assistant/available refleja la configuracion, sin llamar al LLM', async ({ api }) => {
        const res = await api.get('/assistant/available');
        expect(res.ok()).toBeTruthy();
        const body = await res.json();
        expect(typeof body.response?.available).toBe('boolean');
    });

    test('GET /ia devuelve el estado del servicio MCP sin necesitar token', async ({ apiAnonymous }) => {
        const res = await apiAnonymous.get('/ia');
        expect(res.ok()).toBeTruthy();
        const body = await res.json();
        expect(body.service).toBe('eda-mcp');
    });

    test('GET /ia/chat/config requiere token', async ({ apiAnonymous }) => {
        const res = await apiAnonymous.get('/ia/chat/config');
        expect(res.status()).toBe(401);
    });

    test('GET /ia/chat/config con token devuelve disponibilidad', async ({ api }) => {
        const res = await api.get('/ia/chat/config');
        expect(res.ok()).toBeTruthy();
        const body = await res.json();
        expect(typeof body.available).toBe('boolean');
    });

    test('POST /ia/chat sin campo messages devuelve 400, o 503 si la IA no esta configurada en este entorno', async ({ api }) => {
        // mcp.router.ts comprueba primero si el proveedor de IA esta disponible (503 si
        // no hay API key configurada) y solo despues valida el body (400 si falta
        // messages[]) -- en un entorno de desarrollo sin IA configurada, 503 es correcto.
        const res = await api.post('/ia/chat', {});
        expect([400, 503]).toContain(res.status());
    });

    test('POST /ia/chat sin token devuelve 401', async ({ apiAnonymous }) => {
        const res = await apiAnonymous.post('/ia/chat', { messages: [{ role: 'user', content: 'hola' }] });
        expect(res.status()).toBe(401);
    });

    test('POST /assistant/response sin token devuelve 401 (el guard bloquea antes de llamar al LLM)', async ({ apiAnonymous }) => {
        const res = await apiAnonymous.post('/assistant/response', { input: 'hola' });
        expect(res.status()).toBe(401);
    });

    test('POST /assistant/generate-dashboard sin token devuelve 401', async ({ apiAnonymous }) => {
        const res = await apiAnonymous.post('/assistant/generate-dashboard', { datasource_id: 'x', description: 'x', title: 'x' });
        expect(res.status()).toBe(401);
    });

    /**
     * GET /assistant/config lleva [authGuard, roleGuard] (ai.router.ts:126): un usuario
     * autenticado sin rol admin recibe 403, sin llegar a aIgetConfig (que devolveria la
     * API key real del proveedor de IA y MCP_PASSWORD en texto plano). Esto documentaba
     * antes una fuga de secretos a cualquier usuario autenticado; ya esta corregido.
     */
    test('[seguridad] un usuario SIN rol admin no puede leer la API key de IA via /assistant/config', async ({ apiAsLimitedUser }) => {
        const res = await apiAsLimitedUser.get('/assistant/config');
        expect(res.status()).toBe(403);
    });
});
