import { test as teardown } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import MCR from 'monocart-coverage-reports';
import { ENV } from '../../utils/env';
import { ApiClient, Session } from '../../utils/api-client';
import { readTrackedResources, clearTrackedResourcesLog, ResourceType } from '../../utils/resource-log';
import { COLLECT_COVERAGE, coverageOptions, COVERAGE_OUTPUT_DIR } from '../../utils/coverage-options';

const AUTH_DIR = path.resolve(__dirname, '..', '..', '.auth');

function loadSession(file: string): Session | null {
    const p = path.join(AUTH_DIR, file);
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

const DELETE_PATH: Record<ResourceType, (id: string) => string> = {
    dashboard: (id) => `/dashboard/${id}`,
    datasource: (id) => `/datasource/${id}`,
    group: (id) => `/admin/groups/${id}`,
    media: (id) => `/media/${id}`,
    mediaFolder: (id) => `/media/folders/${id}`,
    user: (id) => `/admin/user/${id}`,
};

// Orden de borrado: primero lo que "cuelga" de otras cosas, usuarios al final.
// Los archivos de media se borran antes que las carpetas que podrian contenerlos.
const DELETE_ORDER: ResourceType[] = ['dashboard', 'datasource', 'media', 'mediaFolder', 'group', 'user'];

/**
 * Barrido final: borra TODO lo creado por la suite para no dejar basura en la
 * base de datos de desarrollo compartida. Corre siempre al final, incluso si
 * algunos tests fallaron a medio camino.
 *
 * Via principal: el log .auth/created-resources.jsonl, donde cada test registra
 * (con el fixture `track`) el id exacto de lo que crea -> borrado directo, sin
 * depender de listar nada.
 *
 * Via secundaria (best-effort): barrido por nombre/prefijo sobre cada listado,
 * por si algo se creo sin registrarse o quedo de un run anterior interrumpido.
 * Si el listado de un modulo falla (p.ej. GET /datasource puede devolver 500/404
 * si existe algun registro antiguo con datos corruptos en la BBDD de desarrollo,
 * algo detectado por esta misma suite y ajeno a los tests), simplemente se omite
 * esa via secundaria para ese modulo: no es un fallo del teardown.
 */
teardown('cleanup: borrar todos los datos creados por la suite', async ({ request }) => {
    // Con la suite completa (API + navegador) se acumulan muchos recursos a borrar,
    // uno a uno, mas el barrido best-effort (cada listado puede tardar hasta 15s si
    // esta lento); el timeout por defecto (45s) se queda corto en un run completo.
    teardown.setTimeout(3 * 60_000);

    const adminSession = loadSession('admin-session.json');
    if (!adminSession) {
        console.warn('[teardown] No hay sesion de admin guardada, nada que limpiar.');
        return;
    }
    const api = new ApiClient(request, adminSession.token);
    const prefix = `${ENV.testRunPrefix}_`;
    const results: string[] = [];
    const deletedIds = new Set<string>();

    // --- 1) Borrado preciso via log de recursos creados ---
    const tracked = readTrackedResources();
    for (const type of DELETE_ORDER) {
        const items = tracked.filter((t) => t.type === type);
        let deleted = 0;
        for (const item of items) {
            const res = await api.delete(DELETE_PATH[type](item.id));
            if (res.ok()) {
                deleted++;
                deletedIds.add(`${type}:${item.id}`);
            }
        }
        if (items.length > 0) results.push(`- ${type} (via log): ${deleted}/${items.length} eliminados`);
    }
    clearTrackedResourcesLog();

    // --- 2) Barrido best-effort por prefijo, para lo no registrado ---
    async function sweep(
        label: string,
        type: ResourceType,
        listPath: string,
        unwrap: (body: any) => any[],
        nameOf: (item: any) => string,
        idOf: (item: any) => string
    ) {
        try {
            const res = await api.get(listPath);
            if (!res.ok()) {
                results.push(`- ${label} (barrido extra): omitido, no se pudo listar (${res.status()})`);
                return;
            }
            const items = unwrap(await res.json()) ?? [];
            const toDelete = items.filter((it) => (nameOf(it) ?? '').includes(prefix) && !deletedIds.has(`${type}:${idOf(it)}`));
            let deleted = 0;
            for (const item of toDelete) {
                const id = idOf(item);
                if (!id) continue;
                const delRes = await api.delete(DELETE_PATH[type](id));
                if (delRes.ok()) deleted++;
            }
            if (toDelete.length > 0) results.push(`- ${label} (barrido extra): ${deleted}/${toDelete.length} eliminados`);
        } catch (err) {
            results.push(`- ${label} (barrido extra): error (${(err as Error).message})`);
        }
    }

    await sweep('dashboards', 'dashboard', '/dashboard', (body) => [...(body.dashboards ?? []), ...(body.publics ?? []), ...(body.group ?? []), ...(body.shared ?? [])], (d) => d?.config?.title ?? '', (d) => d._id);
    await sweep('datasources', 'datasource', '/datasource', (body) => body.ds ?? [], (d) => d?.ds?.metadata?.model_name ?? '', (d) => d._id);
    await sweep('grupos', 'group', '/admin/groups', (body) => body ?? [], (g) => g.name ?? '', (g) => g._id);
    await sweep('media', 'media', '/media', (body) => body.media ?? [], (m) => m.originalName ?? '', (m) => m._id);
    await sweep('usuarios', 'user', '/admin/user', (body) => body ?? [], (u) => u.email ?? '', (u) => u._id);

    console.log(`[teardown] Limpieza de datos de test (prefijo ${prefix}):\n${results.length ? results.join('\n') : '- nada que limpiar'}`);
});

/**
 * Genera el reporte de cobertura una sola vez, despues de que TODOS los workers de
 * chromium-e2e hayan terminado (esta suite corre como teardown del proyecto "setup",
 * que a su vez es dependencia de "api" y "chromium-e2e": Playwright espera a que ambos
 * terminen antes de correr este archivo). Solo cuando se lanzo con COVERAGE=1
 * (`npm run test:coverage`); en un `npm test` normal no hace nada.
 */
teardown('cobertura: generar reporte final (si COVERAGE=1)', async () => {
    if (!COLLECT_COVERAGE) return;
    teardown.setTimeout(2 * 60_000);
    const mcr = MCR(coverageOptions);
    const results = await mcr.generate();
    const pct = results?.summary?.bytes?.pct;
    console.log(
        `[teardown] Cobertura JS del frontend: ${pct ?? '?'}% de bytes ejecutados sobre el codigo cargado durante la suite. ` +
        `Reporte HTML: ${results?.reportPath ?? path.join(COVERAGE_OUTPUT_DIR, 'index.html')}`
    );
});
