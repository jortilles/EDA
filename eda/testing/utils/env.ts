import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

function required(name: string, fallback?: string): string {
    const value = process.env[name] ?? fallback;
    if (value === undefined) {
        throw new Error(`Falta la variable de entorno ${name}. Copia .env.example a .env y ajustala.`);
    }
    return value;
}

export const ENV = {
    apiBaseURL: required('API_BASE_URL', 'http://localhost:8666'),
    appBaseURL: required('APP_BASE_URL', 'http://localhost:4200'),
    bootstrapAdminEmail: required('BOOTSTRAP_ADMIN_EMAIL', 'pruebaAdmin'),
    bootstrapAdminPassword: required('BOOTSTRAP_ADMIN_PASSWORD', 'pruebaAdmin'),
    testRunPrefix: required('TEST_RUN_PREFIX', 'PWTEST'),
    autoStartApi: (process.env.AUTO_START_API ?? 'true').toLowerCase() !== 'false',
};

/** Id fijo del grupo EDA_ADMIN_ROLE (ver lib/module/admin/groups/group.controller.ts) */
export const EDA_ADMIN_GROUP_ID = '135792467811111111111110';

/**
 * Id de ejecucion unico para namespacing de datos de test (evita colisiones entre runs).
 * Se calcula una vez en el proceso principal (al cargar playwright.config.ts) y se propaga
 * a los procesos worker via variable de entorno, para que todos los workers usen el mismo id.
 */
if (!process.env.PW_RUN_ID) {
    process.env.PW_RUN_ID = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
}
export const RUN_ID = process.env.PW_RUN_ID;

export function testName(label: string): string {
    return `${ENV.testRunPrefix}_${RUN_ID}_${label}`;
}
