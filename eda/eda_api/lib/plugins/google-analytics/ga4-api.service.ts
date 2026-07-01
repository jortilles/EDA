import * as path from 'path';
import * as fs from 'fs';
import { GoogleAuth, OAuth2Client } from 'google-auth-library';
const ga4Config = require('../../../config/google-analytics.config');

export interface GA4DownloadParams {
    propertyId: string;
    /** JSON string — either service_account credentials or {"type":"oauth2","refresh_token":"..."} */
    credentialsJson: string;
    dateFrom?: string;
    dateTo?: string;
}

export interface GA4DownloadResult {
    sessions: number;
    pages: number;
    events: number;
    devices: number;
    geographic: number;
}

export class GA4ApiService {

    private static async getAccessToken(credentialsJson: string): Promise<string> {
        let parsed: any;
        try {
            parsed = JSON.parse(credentialsJson);
        } catch (e) {
            throw new Error(
                'Las credenciales de Google Analytics están corruptas. ' +
                'Por favor, elimina el datasource y vuelve a autorizarlo con Google.'
            );
        }

        if (parsed.type === 'oauth2' && parsed.refresh_token) {
            // OAuth2 Authorization Code flow — refresh token stored from user consent
            const oauth2Client = new OAuth2Client(
                ga4Config.CLIENT_ID,
                ga4Config.CLIENT_SECRET,
                ga4Config.REDIRECT_URI
            );
            oauth2Client.setCredentials({ refresh_token: parsed.refresh_token });
            const tokenResponse = await oauth2Client.getAccessToken();
            if (!tokenResponse.token) {
                throw new Error('No se pudo renovar el token OAuth2 de Google Analytics');
            }
            return tokenResponse.token;
        }

        // Service account JSON (legacy / alternative auth)
        const auth = new GoogleAuth({
            credentials: parsed,
            scopes: ['https://www.googleapis.com/auth/analytics.readonly']
        });
        const client = await auth.getClient();
        const tokenResponse = await client.getAccessToken();
        if (!tokenResponse.token) {
            throw new Error('No se pudo obtener token de acceso para Google Analytics');
        }
        return tokenResponse.token;
    }

    static buildOAuth2Client(): OAuth2Client {
        return new OAuth2Client(
            ga4Config.CLIENT_ID,
            ga4Config.CLIENT_SECRET,
            ga4Config.REDIRECT_URI
        );
    }

    static isOAuthConfigured(): boolean {
        return !!(ga4Config.CLIENT_ID && ga4Config.CLIENT_SECRET);
    }

    private static async runReport(
        accessToken: string,
        propertyId: string,
        dimensions: string[],
        metrics: string[],
        dateFrom: string,
        dateTo: string
    ): Promise<any[]> {
        const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;
        const allRows: any[] = [];
        let offset = 0;
        const limit = 10000;

        while (true) {
            const body = {
                dateRanges: [{ startDate: dateFrom, endDate: dateTo }],
                dimensions: dimensions.map(name => ({ name })),
                metrics: metrics.map(name => ({ name })),
                limit,
                offset
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`GA4 API error ${response.status}: ${errText}`);
            }

            const data = await response.json() as any;
            const rows: any[] = data.rows || [];
            allRows.push(...rows);

            if (rows.length < limit) break;
            offset += limit;
        }

        return allRows;
    }

    static toCsvRow(values: any[]): string {
        return values.map(v => {
            if (v === null || v === undefined || v === '') return '';
            const str = String(v).replace(/"/g, '""');
            return `"${str}"`;
        }).join(',');
    }

    static writeCsv(filePath: string, headers: string[], rows: any[][]): void {
        const lines = [
            headers.join(','),
            ...rows.map(r => GA4ApiService.toCsvRow(r))
        ];
        fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    }

    static dimVal(row: any, index: number): string {
        return row.dimensionValues?.[index]?.value ?? '';
    }

    /** Converts GA4 date string "YYYYMMDD" → "YYYY-MM-DD". Passes through anything else unchanged. */
    static formatDate(raw: string): string {
        if (/^\d{8}$/.test(raw)) {
            return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
        }
        return raw;
    }

    static metVal(row: any, index: number): string {
        return row.metricValues?.[index]?.value ?? '0';
    }

    static async downloadToFolder(params: GA4DownloadParams, folderPath: string): Promise<GA4DownloadResult> {
        const { propertyId, credentialsJson } = params;
        const dateFrom = params.dateFrom || '365daysAgo';
        const dateTo = params.dateTo || 'today';

        console.log(`[GA4] Conectando a propiedad ${propertyId}`);
        const accessToken = await GA4ApiService.getAccessToken(credentialsJson);
        console.log(`[GA4] Token obtenido correctamente`);

        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        // 1. Sessions by channel / source / medium
        const sessionRows = await GA4ApiService.runReport(
            accessToken, propertyId,
            ['date', 'sessionDefaultChannelGroup', 'sessionSource', 'sessionMedium'],
            ['sessions', 'activeUsers', 'newUsers', 'bounceRate', 'averageSessionDuration', 'screenPageViews', 'conversions'],
            dateFrom, dateTo
        );
        GA4ApiService.writeCsv(path.join(folderPath, 'sessions.csv'),
            ['date', 'channel', 'source', 'medium', 'sessions', 'active_users', 'new_users', 'bounce_rate', 'avg_session_duration_sec', 'page_views', 'conversions'],
            sessionRows.map(r => [
                GA4ApiService.formatDate(GA4ApiService.dimVal(r, 0)), GA4ApiService.dimVal(r, 1),
                GA4ApiService.dimVal(r, 2), GA4ApiService.dimVal(r, 3),
                GA4ApiService.metVal(r, 0), GA4ApiService.metVal(r, 1),
                GA4ApiService.metVal(r, 2), GA4ApiService.metVal(r, 3),
                GA4ApiService.metVal(r, 4), GA4ApiService.metVal(r, 5),
                GA4ApiService.metVal(r, 6)
            ])
        );
        console.log(`[GA4] sessions: ${sessionRows.length}`);

        // 2. Pages
        const pageRows = await GA4ApiService.runReport(
            accessToken, propertyId,
            ['date', 'pagePath', 'pageTitle'],
            ['screenPageViews', 'activeUsers', 'averageSessionDuration', 'bounceRate'],
            dateFrom, dateTo
        );
        GA4ApiService.writeCsv(path.join(folderPath, 'pages.csv'),
            ['date', 'path', 'title', 'views', 'users', 'avg_session_duration_sec', 'bounce_rate'],
            pageRows.map(r => [
                GA4ApiService.formatDate(GA4ApiService.dimVal(r, 0)), GA4ApiService.dimVal(r, 1),
                GA4ApiService.dimVal(r, 2), GA4ApiService.metVal(r, 0),
                GA4ApiService.metVal(r, 1), GA4ApiService.metVal(r, 2),
                GA4ApiService.metVal(r, 3)
            ])
        );
        console.log(`[GA4] pages: ${pageRows.length}`);

        // 3. Events
        const eventRows = await GA4ApiService.runReport(
            accessToken, propertyId,
            ['date', 'eventName'],
            ['eventCount', 'activeUsers', 'eventValue'],
            dateFrom, dateTo
        );
        GA4ApiService.writeCsv(path.join(folderPath, 'events.csv'),
            ['date', 'event_name', 'event_count', 'users', 'event_value'],
            eventRows.map(r => [
                GA4ApiService.formatDate(GA4ApiService.dimVal(r, 0)), GA4ApiService.dimVal(r, 1),
                GA4ApiService.metVal(r, 0), GA4ApiService.metVal(r, 1),
                GA4ApiService.metVal(r, 2)
            ])
        );
        console.log(`[GA4] events: ${eventRows.length}`);

        // 4. Devices
        const deviceRows = await GA4ApiService.runReport(
            accessToken, propertyId,
            ['date', 'deviceCategory', 'browser', 'operatingSystem'],
            ['sessions', 'activeUsers'],
            dateFrom, dateTo
        );
        GA4ApiService.writeCsv(path.join(folderPath, 'devices.csv'),
            ['date', 'category', 'browser', 'operating_system', 'sessions', 'users'],
            deviceRows.map(r => [
                GA4ApiService.formatDate(GA4ApiService.dimVal(r, 0)), GA4ApiService.dimVal(r, 1),
                GA4ApiService.dimVal(r, 2), GA4ApiService.dimVal(r, 3),
                GA4ApiService.metVal(r, 0), GA4ApiService.metVal(r, 1)
            ])
        );
        console.log(`[GA4] devices: ${deviceRows.length}`);

        // 5. Geographic
        const geoRows = await GA4ApiService.runReport(
            accessToken, propertyId,
            ['date', 'country', 'city'],
            ['sessions', 'activeUsers', 'newUsers'],
            dateFrom, dateTo
        );
        GA4ApiService.writeCsv(path.join(folderPath, 'geographic.csv'),
            ['date', 'country', 'city', 'sessions', 'users', 'new_users'],
            geoRows.map(r => [
                GA4ApiService.formatDate(GA4ApiService.dimVal(r, 0)), GA4ApiService.dimVal(r, 1),
                GA4ApiService.dimVal(r, 2), GA4ApiService.metVal(r, 0),
                GA4ApiService.metVal(r, 1), GA4ApiService.metVal(r, 2)
            ])
        );
        console.log(`[GA4] geographic: ${geoRows.length}`);

        console.log(`[GA4] 5 files written to ${folderPath}`);

        return {
            sessions: sessionRows.length,
            pages: pageRows.length,
            events: eventRows.length,
            devices: deviceRows.length,
            geographic: geoRows.length
        };
    }
}
