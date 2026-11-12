import { Injectable, signal } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiService } from './api.service';

export type RemoteTransferType = 'datasource' | 'dashboard';

/** Session opened on another Edalitics instance. Kept in memory only, never persisted. */
export interface RemoteSession {
    url: string;
    apiUrl: string;
    token: string;
    user: { name: string; email: string };
}

export interface TransferReference {
    name: string;
    email?: string;
    sourceId: string;
    targetId: string;
}

/** Users / groups of an imported object matched with the ones of the destination */
export interface PermissionsReport {
    users: { matched: number; remapped: TransferReference[]; unresolved: TransferReference[] };
    groups: { matched: number; remapped: TransferReference[]; unresolved: TransferReference[] };
}

/** Maps that travel with a data model */
export interface MapsReport {
    imported: string[];
    existing: string[];
    missing: string[];
}

export interface RemoteSendResult {
    ok: boolean;
    type: RemoteTransferType;
    _id: string;
    name: string;
    created: boolean;
    passwordRequired?: boolean;
    dataSourceMissing?: boolean;
    /** Dashboards: whether the owner was found by email in the destination */
    ownerMatched?: boolean;
    permissions?: PermissionsReport;
    /** Data models: maps created / already present / not available in the destination */
    maps?: MapsReport;
}

/** Status answered by the API when the remote token is no longer valid. */
export const REMOTE_SESSION_EXPIRED_STATUS = 412;

const LAST_REMOTE_URL_KEY = 'eda_remote_transfer_url';

/**
 * Sends data models and dashboards to another Edalitics instance.
 * Every call goes through the local API, which talks to the destination server to server.
 */
@Injectable({
    providedIn: 'root'
})
export class RemoteTransferService extends ApiService {

    private route = '/remote-transfer';

    /** Current remote session (shared by every send of this browser session). */
    public session = signal<RemoteSession | null>(null);

    /**
     * Remote errors must not close the local session, so only a local 401
     * (local token expired) falls back to the default handling.
     */
    public override handleError(error: any) {
        if (error?.status === 401) {
            return super.handleError(error);
        }
        return throwError({ status: error?.status, text: error?.error?.message || error?.message });
    }

    login(url: string, email: string, password: string): Observable<any> {
        return this.post(`${this.route}/login`, { url, email, password }).pipe(
            tap((res: any) => {
                this.session.set({ url, apiUrl: res.apiUrl, token: res.token, user: res.user });
                this.setLastUrl(url);
            })
        );
    }

    logout(): void {
        this.session.set(null);
    }

    send(type: RemoteTransferType, id: string): Observable<RemoteSendResult> {
        const session = this.session();
        if (!session) {
            return throwError({ status: REMOTE_SESSION_EXPIRED_STATUS, text: '' });
        }
        return this.post(`${this.route}/send`, { apiUrl: session.apiUrl, token: session.token, type, id }) as Observable<RemoteSendResult>;
    }

    /** The last remote URL is remembered as a convenience (it is not a secret). */
    getLastUrl(): string {
        try {
            return localStorage.getItem(LAST_REMOTE_URL_KEY) || '';
        } catch {
            return '';
        }
    }

    private setLastUrl(url: string): void {
        try {
            localStorage.setItem(LAST_REMOTE_URL_KEY, url);
        } catch {
            // Storage not available: nothing to remember
        }
    }
}
