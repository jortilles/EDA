import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { FileUtiles } from '../utils/file-utils.service';

export interface IMedia {
    _id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    folderId: string | null;
    createdAt: string;
    url: string;
}

export interface IMediaFolder {
    _id: string;
    name: string;
    parentId: string | null;
    createdAt: string;
}

@Injectable({
    providedIn: 'root'
})
export class MediaService extends ApiService {
    private route = '/media';

    constructor(http: HttpClient, private fileUtils: FileUtiles) {
        super(http);
    }

    list(folderId?: string | null): Observable<any> {
        return this.get(`${this.route}?folderId=${folderId ?? 'null'}`);
    }

    remove(id: string): Observable<any> {
        return this.delete(`${this.route}/${id}`);
    }

    rename(id: string, originalName: string): Observable<any> {
        return this.put(`${this.route}/${id}`, { originalName });
    }

    move(ids: string[], folderId: string | null): Observable<any> {
        return this.put(`${this.route}/move`, { ids, folderId });
    }

    usage(id: string): Observable<any> {
        return this.get(`${this.route}/${id}/usage`);
    }

    listFolders(): Observable<any> {
        return this.get(`${this.route}/folders`);
    }

    createFolder(name: string, parentId?: string | null): Observable<any> {
        return this.post(`${this.route}/folders`, { name, parentId: parentId ?? null });
    }

    renameFolder(id: string, name: string): Observable<any> {
        return this.put(`${this.route}/folders/${id}`, { name });
    }

    deleteFolder(id: string): Observable<any> {
        return this.delete(`${this.route}/folders/${id}`);
    }

    /**
     * Uploads an image file (or Blob) to the media library.
     * Uses XMLHttpRequest + FormData directly (like the profile picture upload,
     * see GlobalService.uploadFile) since ApiService.post() forces a JSON
     * Content-Type header that breaks multipart/form-data uploads.
     */
    upload(file: File | Blob, filename?: string, folderId?: string | null): Promise<{ ok: boolean, media: IMedia }> {
        return new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append('img', file, filename || (file as File).name || 'image');
            if (folderId) {
                formData.append('folderId', folderId);
            }

            const xhr = new XMLHttpRequest();
            xhr.onreadystatechange = () => {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200 || xhr.status === 201) {
                        resolve(JSON.parse(xhr.response));
                    } else {
                        reject(xhr.response);
                    }
                }
            };
            xhr.open('POST', this.fileUtils.connection(`${this.route}/upload`), true);
            xhr.send(formData);
        });
    }

    /** Builds a displayable, authenticated URL for a media item's relative path. */
    resolveUrl(relativeUrl: string): string {
        return this.fileUtils.connection(relativeUrl);
    }
}
