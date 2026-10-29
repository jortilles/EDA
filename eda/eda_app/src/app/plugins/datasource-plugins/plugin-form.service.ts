import { Injectable } from '@angular/core';
import { lastValueFrom, Subject } from 'rxjs';
import { DataSourceService } from '@eda/services/service.index';

/** HTTP status returned by the API when the folder of a new DuckDB-backed model already exists */
export const DUCKDB_FOLDER_EXISTS_STATUS = 409;

/**
 * Same normalisation the API applies to folder names under duckdb/
 * (lowercase, only letters, digits, "_" and "-")
 */
export function sanitizeDuckdbFolderName(name: string): string {
    return String(name || '').trim().replace(/[^a-zA-Z0-9_\-]/g, '_').toLowerCase();
}

@Injectable({ providedIn: 'root' })
export class PluginFormService {
    private readonly saveSubject = new Subject<void>();
    readonly onSave$ = this.saveSubject.asObservable();

    triggerSave(): void {
        this.saveSubject.next();
    }

    /**
     * True when duckdb/<folderName> already exists on the server. DataSourceService is passed
     * in because it is not provided in root. The API re-checks it (409) on creation.
     */
    async duckdbFolderExists(dataSourceService: DataSourceService, folderName: string): Promise<boolean> {
        try {
            const res = await lastValueFrom(dataSourceService.getDuckDbFolders());
            const folders: string[] = res?.folders || [];
            const target = folderName.toLowerCase();
            return folders.some(f => f.toLowerCase() === target);
        } catch {
            // The API check still applies when the folder list can't be read
            return false;
        }
    }

    /** Localised message telling the user to choose another folder name */
    folderExistsMessage(folderName: string): string {
        return $localize`:@@duckdbFolderAlreadyExists:La carpeta "${folderName}" ya existe. Elija otro nombre de carpeta.`;
    }

    /** True when an API error means the target folder already exists */
    isFolderExistsError(err: any): boolean {
        return err?.status === DUCKDB_FOLDER_EXISTS_STATUS;
    }
}
