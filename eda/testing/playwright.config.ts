import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';
import { ENV } from './utils/env';

const API_HEALTHCHECK_URL = `${ENV.apiBaseURL}/auth/typeLogin`;

export default defineConfig({
    testDir: './tests',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: process.env.CI ? 2 : undefined,
    timeout: 45_000,
    expect: { timeout: 10_000 },
    reporter: [
        ['list'],
        ['html', { outputFolder: 'playwright-report', open: 'never' }],
        ['json', { outputFile: 'test-results/results.json' }],
        [path.resolve(__dirname, 'utils/summary-reporter.ts')],
    ],
    use: {
        trace: 'retain-on-failure',
        // 'on' (no 'only-on-failure'): tambien se guarda una captura del estado final
        // de cada test que PASA, para que un humano pueda verificar visualmente el
        // resultado sin tener que abrir el video entero.
        screenshot: 'on',
        // Se guarda el video de TODOS los tests, pasen o fallen (no solo los que fallan).
        // No se acumula: test-results/ se limpia entera en cada "npm test", asi que en
        // disco solo queda el video de la ultima ejecucion.
        // HALLAZGO: sin `size`, Playwright graba el video a un tamaño propio (800x450
        // aqui) INDEPENDIENTE del viewport -- por mucho que se suba el viewport (ver
        // mas abajo, 1920x1080), el video seguia grabandose pequeño y con texto
        // borroso/ilegible. Se fija explicitamente al mismo tamaño del viewport.
        video: { mode: 'on', size: { width: 1920, height: 1080 } },
        actionTimeout: 15_000,
    },
    projects: [
        {
            name: 'setup',
            testMatch: /global\.setup\.ts/,
            teardown: 'cleanup',
        },
        {
            name: 'cleanup',
            testMatch: /global\.teardown\.ts/,
        },
        {
            name: 'api',
            testDir: './tests/api',
            dependencies: ['setup'],
            use: {
                baseURL: ENV.apiBaseURL,
            },
        },
        {
            name: 'chromium-e2e',
            testDir: './tests/e2e',
            dependencies: ['setup'],
            use: {
                ...devices['Desktop Chrome'],
                // El viewport por defecto de "Desktop Chrome" (1280x720) se queda corto
                // para dashboards con muchos paneles -- en video/capturas se pierde
                // demasiado detalle. Nota aparte: ningun tamaño de viewport hace que la
                // barra de direcciones del navegador aparezca en el video -- Playwright
                // solo graba el contenido de la pagina, nunca el chrome del navegador;
                // para ver la URL real en cada paso hay que mirar el Trace Viewer
                // (`npx playwright show-trace`, pestaña de acciones) o el log de consola
                // del test, no el video.
                viewport: { width: 1920, height: 1080 },
                baseURL: ENV.appBaseURL,
                storageState: path.resolve(__dirname, '.auth', 'admin-storage.json'),
            },
        },
    ],
    webServer: [
        // Backend (eda_api): puerto fijo 8666 (lib/server.ts). Si ya esta corriendo, se reutiliza.
        ...(ENV.autoStartApi
            ? [
                  {
                      command: 'npm run dev',
                      cwd: path.resolve(__dirname, '..', 'eda_api'),
                      url: API_HEALTHCHECK_URL,
                      reuseExistingServer: true,
                      timeout: 90_000,
                      stdout: 'pipe' as const,
                      stderr: 'pipe' as const,
                  },
              ]
            : []),
        // Frontend (eda_app): normalmente ya esta corriendo con `ng serve` en :4200.
        // Si no lo esta, se lanza aqui; si ya lo esta, Playwright lo detecta y no hace nada.
        ...(ENV.autoStartApp
            ? [
                  {
                      command: 'npm start',
                      cwd: path.resolve(__dirname, '..', 'eda_app'),
                      url: ENV.appBaseURL,
                      reuseExistingServer: true,
                      timeout: 120_000,
                      stdout: 'pipe' as const,
                      stderr: 'pipe' as const,
                  },
              ]
            : []),
    ],
});
