import * as fs from 'fs';
import * as path from 'path';

const LOG_PATH = path.resolve(__dirname, '..', '.auth', 'created-resources.jsonl');

export type ResourceType = 'dashboard' | 'datasource' | 'group' | 'media' | 'mediaFolder' | 'user';

export interface TrackedResource {
    type: ResourceType;
    id: string;
}

/**
 * Registro de todo lo que los tests van creando en la base de datos compartida.
 * El barrido por prefijo en el teardown es un mejor esfuerzo (depende de que el
 * listado de cada modulo funcione y de que el nombre lleve el prefijo); este log
 * es la via fiable: borrado directo por id, sin depender de listar nada.
 */
export function trackResource(type: ResourceType, id: string | undefined | null): void {
    if (!id) return;
    fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
    fs.appendFileSync(LOG_PATH, `${JSON.stringify({ type, id })}\n`);
}

export function readTrackedResources(): TrackedResource[] {
    if (!fs.existsSync(LOG_PATH)) return [];
    return fs
        .readFileSync(LOG_PATH, 'utf-8')
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line));
}

export function clearTrackedResourcesLog(): void {
    if (fs.existsSync(LOG_PATH)) fs.unlinkSync(LOG_PATH);
}
