import { test as base, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { ApiClient, Session } from '../../utils/api-client';
import { testName } from '../../utils/env';
import { trackResource, ResourceType } from '../../utils/resource-log';

const AUTH_DIR = path.resolve(__dirname, '..', '..', '.auth');

function readSession(file: string): Session {
    const p = path.join(AUTH_DIR, file);
    if (!fs.existsSync(p)) {
        throw new Error(
            `No existe ${p}. El proyecto "setup" debe correr antes que los tests ` +
            `(esta configurado como dependencia en playwright.config.ts; si ejecutas ` +
            `un solo archivo con --project, asegurate de incluir tambien "setup").`
        );
    }
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

type Fixtures = {
    /** Cliente API autenticado como el usuario admin dedicado a este run de tests. */
    api: ApiClient;
    /** Cliente API autenticado como un usuario SIN permisos de admin (para probar 403). */
    apiAsLimitedUser: ApiClient;
    /** Cliente API sin token (para probar 401). */
    apiAnonymous: ApiClient;
    adminSession: Session;
    limitedUserSession: Session;
    /** Genera un nombre unico con el prefijo de la suite, para poder limpiarlo despues. */
    uniqueName: (label: string) => string;
    /** Registra un recurso creado por el test para que el teardown lo borre por id. */
    track: (type: ResourceType, id: string | undefined | null) => void;
};

export const test = base.extend<Fixtures>({
    adminSession: async ({}, use) => {
        await use(readSession('admin-session.json'));
    },
    limitedUserSession: async ({}, use) => {
        await use(readSession('user-session.json'));
    },
    api: async ({ request, adminSession }, use) => {
        await use(new ApiClient(request, adminSession.token));
    },
    apiAsLimitedUser: async ({ request, limitedUserSession }, use) => {
        await use(new ApiClient(request, limitedUserSession.token));
    },
    apiAnonymous: async ({ request }, use) => {
        await use(new ApiClient(request, null));
    },
    uniqueName: async ({}, use) => {
        await use((label: string) => testName(`${label}_${test.info().parallelIndex}_${Date.now()}`));
    },
    track: async ({}, use) => {
        await use((type: ResourceType, id: string | undefined | null) => trackResource(type, id));
    },
});

export { expect };
