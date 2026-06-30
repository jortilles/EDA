export type GA4Locale = 'en' | 'es';

const TABLE_LABELS: Record<string, Record<GA4Locale, string>> = {
    sessions:   { en: 'Sessions',   es: 'Sesiones' },
    pages:      { en: 'Pages',      es: 'Páginas' },
    events:     { en: 'Events',     es: 'Eventos' },
    devices:    { en: 'Devices',    es: 'Dispositivos' },
    geographic: { en: 'Geographic', es: 'Geográfico' },
};

const TABLE_DESCRIPTIONS: Record<string, Record<GA4Locale, string>> = {
    sessions:   { en: 'Sessions by channel, source and medium',   es: 'Sesiones por canal, fuente y medio' },
    pages:      { en: 'Page performance analytics',               es: 'Analítica de rendimiento de páginas' },
    events:     { en: 'User event tracking',                      es: 'Seguimiento de eventos de usuario' },
    devices:    { en: 'Device and browser analytics',             es: 'Analítica por dispositivo y navegador' },
    geographic: { en: 'Geographic distribution of users',         es: 'Distribución geográfica de usuarios' },
};

const COLUMN_LABELS: Record<string, Record<GA4Locale, string>> = {
    date:                     { en: 'Date',                     es: 'Fecha' },
    channel:                  { en: 'Channel',                  es: 'Canal' },
    source:                   { en: 'Source',                   es: 'Fuente' },
    medium:                   { en: 'Medium',                   es: 'Medio' },
    sessions:                 { en: 'Sessions',                 es: 'Sesiones' },
    active_users:             { en: 'Active Users',             es: 'Usuarios Activos' },
    new_users:                { en: 'New Users',                es: 'Usuarios Nuevos' },
    bounce_rate:              { en: 'Bounce Rate',              es: 'Tasa de Rebote' },
    avg_session_duration_sec: { en: 'Avg Session Duration (s)', es: 'Duración Media (s)' },
    page_views:               { en: 'Page Views',               es: 'Vistas de Página' },
    conversions:              { en: 'Conversions',              es: 'Conversiones' },
    path:                     { en: 'Path',                     es: 'Ruta' },
    title:                    { en: 'Title',                    es: 'Título' },
    views:                    { en: 'Views',                    es: 'Vistas' },
    users:                    { en: 'Users',                    es: 'Usuarios' },
    event_name:               { en: 'Event Name',               es: 'Nombre del Evento' },
    event_count:              { en: 'Event Count',              es: 'Recuento de Eventos' },
    event_value:              { en: 'Event Value',              es: 'Valor del Evento' },
    category:                 { en: 'Category',                 es: 'Categoría' },
    browser:                  { en: 'Browser',                  es: 'Navegador' },
    operating_system:         { en: 'Operating System',         es: 'Sistema Operativo' },
    country:                  { en: 'Country',                  es: 'País' },
    city:                     { en: 'City',                     es: 'Ciudad' },
};

const COLUMN_DESCRIPTIONS: Record<string, Record<GA4Locale, string>> = {
    date:                     { en: 'Date of the record',                          es: 'Fecha del registro' },
    channel:                  { en: 'Default channel grouping (GA4)',              es: 'Agrupación de canal predeterminada (GA4)' },
    source:                   { en: 'Traffic source',                              es: 'Fuente de tráfico' },
    medium:                   { en: 'Traffic medium',                              es: 'Medio de tráfico' },
    sessions:                 { en: 'Number of sessions',                          es: 'Número de sesiones' },
    active_users:             { en: 'Number of active users',                      es: 'Número de usuarios activos' },
    new_users:                { en: 'Number of new users',                         es: 'Número de usuarios nuevos' },
    bounce_rate:              { en: 'Session bounce rate',                         es: 'Tasa de rebote de sesiones' },
    avg_session_duration_sec: { en: 'Average session duration in seconds',         es: 'Duración media de la sesión en segundos' },
    page_views:               { en: 'Total page and screen views',                 es: 'Total de vistas de páginas y pantallas' },
    conversions:              { en: 'Number of conversion events',                 es: 'Número de eventos de conversión' },
    path:                     { en: 'URL path of the page',                        es: 'Ruta URL de la página' },
    title:                    { en: 'Page title',                                  es: 'Título de la página' },
    views:                    { en: 'Number of page views',                        es: 'Número de vistas de página' },
    users:                    { en: 'Number of active users',                      es: 'Número de usuarios activos' },
    event_name:               { en: 'Name of the GA4 event',                      es: 'Nombre del evento GA4' },
    event_count:              { en: 'Number of times the event was triggered',     es: 'Número de veces que se disparó el evento' },
    event_value:              { en: 'Sum of event values',                         es: 'Suma de valores del evento' },
    category:                 { en: 'Device category (mobile, desktop, tablet)',   es: 'Categoría del dispositivo (móvil, escritorio, tablet)' },
    browser:                  { en: 'Browser used by the user',                   es: 'Navegador utilizado por el usuario' },
    operating_system:         { en: 'Operating system of the device',             es: 'Sistema operativo del dispositivo' },
    country:                  { en: 'Country of the user',                        es: 'País del usuario' },
    city:                     { en: 'City of the user',                           es: 'Ciudad del usuario' },
};

/** Supported GA4 locales — add entries here to expand language coverage. */
const SUPPORTED_LOCALES: GA4Locale[] = ['en', 'es'];

/**
 * Resolves a raw locale string (e.g. "es", "es-ES", "en-US") to a supported GA4Locale.
 * Falls back to English when the locale is unknown.
 */
export function resolveGA4Locale(raw?: string): GA4Locale {
    if (!raw) return 'es';
    const prefix = raw.toLowerCase().split('-')[0].split('_')[0];
    return (SUPPORTED_LOCALES as string[]).includes(prefix)
        ? (prefix as GA4Locale)
        : 'es';
}

/**
 * Extracts the GA4 locale from an HTTP request.
 * Priority: explicit body.locale → Referer/Origin URL path segment → Accept-Language header.
 * Falls back to Spanish when the locale cannot be identified.
 */
export function extractGA4LocaleFromRequest(req: {
    body?: any;
    headers?: Record<string, string | string[] | undefined>;
}): GA4Locale {
    // 1. Explicit locale sent by the frontend
    if (req.body?.locale) return resolveGA4Locale(req.body.locale);

    // 2. Locale segment in the Referer or Origin URL  (e.g. /es/dashboard)
    const urlSources = [req.headers?.referer, req.headers?.origin] as (string | undefined)[];
    for (const url of urlSources) {
        if (!url) continue;
        const match = url.match(/\/([a-z]{2})(?:[-_][A-Z]{2})?\//);
        if (match) return resolveGA4Locale(match[1]);
    }

    // 3. Accept-Language header
    const acceptLang = req.headers?.['accept-language'];
    if (acceptLang) {
        const first = Array.isArray(acceptLang) ? acceptLang[0] : acceptLang;
        return resolveGA4Locale(first.split(',')[0].trim());
    }

    return 'es';
}

/**
 * Applies GA4-specific localised display_name and description to a tables array
 * generated by DuckDBConnection.generateDataModel().
 * Also stores all available translations in the localized[] array.
 */
export function applyGA4Labels(tables: any[], locale: GA4Locale): void {
    for (const table of tables) {
        const tKey = table.table_name as string;
        const tDefault = TABLE_LABELS[tKey]?.[locale] ?? table.display_name?.default ?? tKey;
        const tDesc    = TABLE_DESCRIPTIONS[tKey]?.[locale] ?? tDefault;

        table.display_name = {
            default: tDefault,
            localized: SUPPORTED_LOCALES
                .filter(l => l !== locale && TABLE_LABELS[tKey]?.[l])
                .map(l => ({ locale: l, value: TABLE_LABELS[tKey][l] }))
        };
        table.description = {
            default: tDesc,
            localized: SUPPORTED_LOCALES
                .filter(l => l !== locale && TABLE_DESCRIPTIONS[tKey]?.[l])
                .map(l => ({ locale: l, value: TABLE_DESCRIPTIONS[tKey][l] }))
        };

        for (const col of table.columns) {
            const cKey    = col.column_name as string;
            const cDefault = COLUMN_LABELS[cKey]?.[locale] ?? col.display_name?.default ?? cKey;
            const cDesc    = COLUMN_DESCRIPTIONS[cKey]?.[locale] ?? cDefault;

            col.display_name = {
                default: cDefault,
                localized: SUPPORTED_LOCALES
                    .filter(l => l !== locale && COLUMN_LABELS[cKey]?.[l])
                    .map(l => ({ locale: l, value: COLUMN_LABELS[cKey][l] }))
            };
            col.description = {
                default: cDesc,
                localized: SUPPORTED_LOCALES
                    .filter(l => l !== locale && COLUMN_DESCRIPTIONS[cKey]?.[l])
                    .map(l => ({ locale: l, value: COLUMN_DESCRIPTIONS[cKey][l] }))
            };
        }
    }
}
