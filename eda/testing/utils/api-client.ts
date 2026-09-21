import { APIRequestContext, APIResponse } from '@playwright/test';
import { ENV } from './env';

/**
 * La API de EDA no usa cabecera Authorization: el guard (lib/guards/auth-guard.ts)
 * lee el JWT de `req.qs.token`, es decir, SIEMPRE como query param "token",
 * incluso en POST/PUT/DELETE. Este cliente lo añade automáticamente.
 */
export class ApiClient {
    constructor(
        private readonly request: APIRequestContext,
        public readonly token: string | null,
        private readonly baseURL: string = ENV.apiBaseURL
    ) {}

    private url(path: string, extraParams?: Record<string, string | number | boolean | undefined>): string {
        const full = path.startsWith('http') ? path : `${this.baseURL}${path}`;
        const url = new URL(full);
        if (this.token) url.searchParams.set('token', this.token);
        if (extraParams) {
            for (const [k, v] of Object.entries(extraParams)) {
                if (v !== undefined) url.searchParams.set(k, String(v));
            }
        }
        return url.toString();
    }

    get(path: string, params?: Record<string, string | number | boolean | undefined>, options?: { timeout?: number }): Promise<APIResponse> {
        return this.request.get(this.url(path, params), options);
    }

    post(path: string, data?: unknown, params?: Record<string, string | number | boolean | undefined>): Promise<APIResponse> {
        return this.request.post(this.url(path, params), { data });
    }

    postMultipart(path: string, multipart: Record<string, unknown>): Promise<APIResponse> {
        return this.request.post(this.url(path), { multipart: multipart as never });
    }

    putMultipart(path: string, multipart: Record<string, unknown>): Promise<APIResponse> {
        return this.request.put(this.url(path), { multipart: multipart as never });
    }

    put(path: string, data?: unknown, params?: Record<string, string | number | boolean | undefined>): Promise<APIResponse> {
        return this.request.put(this.url(path, params), { data });
    }

    delete(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<APIResponse> {
        return this.request.delete(this.url(path, params));
    }
}

export interface Session {
    token: string;
    userId: string;
    email: string;
    password: string;
    name: string;
}

export async function login(request: APIRequestContext, email: string, password: string): Promise<Session> {
    const res = await request.post(`${ENV.apiBaseURL}/admin/user/login`, { data: { email, password } });
    if (!res.ok()) {
        const body = await res.text();
        throw new Error(`Login fallido para ${email}: ${res.status()} ${body}`);
    }
    const body = await res.json();
    return { token: body.token, userId: body.id ?? body.user?._id, email, password, name: body.user?.name ?? email };
}
