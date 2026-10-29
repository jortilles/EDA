import * as fs from 'fs';
import * as path from 'path';
import { HttpException } from '../module/global/model/index';

/** HTTP status returned when a new DuckDB-backed model targets a folder that already exists */
export const DUCKDB_FOLDER_EXISTS_STATUS = 409;

/** Base folder that holds one subfolder of CSV files per DuckDB-backed data model */
export function duckdbBaseFolder(): string {
    return path.join(process.cwd(), 'duckdb');
}

/**
 * Normalises a user-provided folder name to a safe subfolder name under duckdb/
 * (lowercase, only letters, digits, "_" and "-"). Prevents path traversal.
 */
export function sanitizeDuckdbFolderName(name: string): string {
    return String(name || '').trim().replace(/[^a-zA-Z0-9_\-]/g, '_').toLowerCase();
}

/** True when duckdb/<folderName> already exists on disk */
export function duckdbFolderExists(folderName: string): boolean {
    return !!folderName && fs.existsSync(path.join(duckdbBaseFolder(), folderName));
}

/**
 * Returns a 409 HttpException when the target folder of a new data model already exists,
 * or null when it is free. Creating a model must never reuse (and overwrite) the CSV files
 * of another model, so the user has to choose a different folder name.
 */
export function checkNewDuckdbFolder(folderName: string): HttpException | null {
    if (!duckdbFolderExists(folderName)) return null;
    return new HttpException(
        DUCKDB_FOLDER_EXISTS_STATUS,
        `La carpeta "${folderName}" ya existe. Elija otro nombre de carpeta.`
    );
}
