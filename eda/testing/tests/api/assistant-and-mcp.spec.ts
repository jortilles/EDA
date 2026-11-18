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

    test('POST /ia/chat sin campo messages devuelve 400 (no llega a llamar al LLM)', async ({ api }) => {
        const res = await api.post('/ia/chat', {});
        expect(res.status()).toBe(400);
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
     * HALLAZGO DE SEGURIDAD: GET /assistant/config solo tiene authGuard (ai.router.ts:125),
     * sin roleGuard. Cualquier usuario autenticado -- no solo un admin -- puede leer esta
     * ruta, y ai.controller.ts:140-160 (aIgetConfig) devuelve la API key real del proveedor
     * de IA y la contraseña de servicio del MCP (MCP_PASSWORD) en texto plano dentro de la
     * respuesta. Esta prueba documenta el problema sin imprimir nunca el valor del secreto
     * (usa .not.toHaveProperty, que no vuelca el valor en el mensaje de fallo).
     */
    test('[seguridad] un usuario SIN rol admin no deberia poder leer la API key de IA via /assistant/config', async ({ apiAsLimitedUser }) => {
        const res = await apiAsLimitedUser.get('/assistant/config');
        if (res.status() === 403) return; // comportamiento deseado, si en el futuro se corrige
        expect(res.ok()).toBeTruthy();
        const body = await res.json();
        // OJO: nunca comparar/imprimir el VALOR de estas claves (son secretos reales en vivo).
        // Solo se comprueba si la clave existe en el objeto, con booleanos, para que un fallo
        // de esta asercion no pueda volcar el secreto en la consola/informe HTML.
        const keys = Object.keys(body.config ?? {});
        expect(keys.includes('API_KEY'), 'La respuesta no deberia incluir la clave API_KEY').toBe(false);
        expect(keys.includes('MCP_PASSWORD'), 'La respuesta no deberia incluir la clave MCP_PASSWORD').toBe(false);
    });
});
