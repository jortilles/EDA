import { HttpException } from '../global/model/index';

/** Models travel with their maps (GeoJSON), which can be large */
const REQUEST_TIMEOUT_MS = 300000;

/** Status answered to the client when the destination token is no longer valid. */
export const REMOTE_SESSION_EXPIRED_STATUS = 412;

export interface RemoteResponse {
    status: number;
    isJson: boolean;
    body: any;
}

/**
 * HTTP client used to talk to another Edalitics instance (the "destination").
 * Every call is server to server, so the browser never needs CORS access to the destination.
 */
export class RemoteTransferService {

    /**
     * Normalizes the URL typed by the user and returns the candidate API base URLs, in order.
     * The user can type the app URL (https://host), the API URL (https://host/edapi)
     * or, in development, the bare API server (http://localhost:8666).
     */
    static getApiBaseCandidates(rawUrl: string): string[] {
        let url = (rawUrl || '').trim();
        if (!url) throw new HttpException(400, 'Remote server URL is required');
        if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

        let parsed: URL;
        try {
            parsed = new URL(url);
        } catch {
            throw new HttpException(400, 'Invalid remote server URL');
        }
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            throw new HttpException(400, 'Only http and https URLs are allowed');
        }

        // Drop hash routes (/#/login), query string and trailing slashes
        const base = `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, '');
        if (/\/edapi$/i.test(base)) return [base];
        return [`${base}/edapi`, base];
    }

    /** Performs an HTTP request against the destination and parses the JSON response when there is one. */
    static async request(method: string, url: string, token?: string, body?: any): Promise<RemoteResponse> {
        const target = new URL(url);
        if (token) target.searchParams.set('token', token);

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        try {
            const response = await fetch(target.toString(), {
                method,
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: body !== undefined ? JSON.stringify(body) : undefined,
                signal: controller.signal
            });

            const contentType = response.headers.get('content-type') || '';
            const isJson = contentType.includes('application/json');
            const payload = isJson ? await response.json().catch(() => null) : await response.text().catch(() => null);
            return { status: response.status, isJson, body: payload };
        } catch (err) {
            const reason = err?.name === 'AbortError' ? 'timeout' : (err?.cause?.code || err?.message || 'unknown error');
            throw new HttpException(502, `Could not reach the remote server (${reason})`);
        } finally {
            clearTimeout(timer);
        }
    }

    /**
     * Logs in on the destination. Tries every API base candidate and keeps the first one
     * that answers like an EDA API (JSON response).
     */
    static async login(rawUrl: string, email: string, password: string): Promise<{ apiUrl: string; token: string; user: any }> {
        const candidates = RemoteTransferService.getApiBaseCandidates(rawUrl);
        let lastError: HttpException = null;

        for (const apiUrl of candidates) {
            let response: RemoteResponse;
            try {
                response = await RemoteTransferService.request('POST', `${apiUrl}/admin/user/login`, undefined, { email, password });
            } catch (err) {
                lastError = err;
                continue;
            }

            // Not an EDA API (e.g. the SPA index.html or a proxy 404 page): try the next candidate
            if (!response.isJson) continue;

            if (response.status === 200 && response.body?.token) {
                return { apiUrl, token: response.body.token, user: response.body.user };
            }
            // Never answer 401/403 for remote errors: the client would close the local session
            const status = response.status === 401 || response.status === 400 ? 400 : 502;
            throw new HttpException(status, response.body?.message || 'Remote login failed');
        }

        throw lastError || new HttpException(502, 'The URL does not point to an Edalitics server');
    }

    /** Validates the API base URL that the client sends back after the login. */
    static checkApiUrl(apiUrl: string): string {
        try {
            const parsed = new URL(apiUrl);
            if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
            return apiUrl.replace(/\/+$/, '');
        } catch {
            throw new HttpException(400, 'Invalid remote API URL');
        }
    }

    /**
     * Builds a meaningful error from a non successful destination response.
     * 401/403 are never forwarded as is, because the client would close the local session:
     * an expired remote session is answered with 412 so the client can ask for a new remote login.
     */
    static toHttpException(response: RemoteResponse, fallback: string): HttpException {
        if (response.status === 401) return new HttpException(REMOTE_SESSION_EXPIRED_STATUS, 'Remote session expired, please log in again on the remote server');
        if (response.status === 403) return new HttpException(502, 'The remote user must be an administrator or datasource creator');
        const message = response.isJson && response.body?.message ? response.body.message : fallback;
        return new HttpException(502, message);
    }
}
