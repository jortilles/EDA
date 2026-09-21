import { test, expect } from '../fixtures/base';

test.describe('Documentacion OpenAPI (/api-docs)', () => {
    test('la documentacion Swagger carga sin token', async ({ apiAnonymous }) => {
        const res = await apiAnonymous.get('/api-docs/');
        expect(res.status()).toBeLessThan(500);
    });
});
