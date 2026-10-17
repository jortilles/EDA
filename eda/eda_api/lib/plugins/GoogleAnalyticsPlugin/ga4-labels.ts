export type GA4Locale = 'en' | 'es' | 'ca' | 'fr' | 'pl' | 'de' | 'pt';

const TABLE_LABELS: Record<string, Record<GA4Locale, string>> = {
    sessions:   { en: 'Sessions', es: 'Sesiones', ca: 'Sessions', fr: 'Sessions', pl: 'Sesje', de: 'Sitzungen', pt: 'Sessões' },
    pages:      { en: 'Pages', es: 'Páginas', ca: 'Pàgines', fr: 'Pages', pl: 'Strony', de: 'Seiten', pt: 'Páginas' },
    events:     { en: 'Events', es: 'Eventos', ca: 'Esdeveniments', fr: 'Événements', pl: 'Zdarzenia', de: 'Ereignisse', pt: 'Eventos' },
    devices:    { en: 'Devices', es: 'Dispositivos', ca: 'Dispositius', fr: 'Appareils', pl: 'Urządzenia', de: 'Geräte', pt: 'Dispositivos' },
    geographic: { en: 'Geographic', es: 'Geográfico', ca: 'Geogràfic', fr: 'Géographique', pl: 'Geografia', de: 'Geografie', pt: 'Geográfico' },
};

const TABLE_DESCRIPTIONS: Record<string, Record<GA4Locale, string>> = {
    sessions:   { en: 'Sessions by channel, source and medium', es: 'Sesiones por canal, fuente y medio', ca: 'Sessions per canal, font i mitjà', fr: 'Sessions par canal, source et support', pl: 'Sesje według kanału, źródła i medium', de: 'Sitzungen nach Kanal, Quelle und Medium', pt: 'Sessões por canal, origem e meio' },
    pages:      { en: 'Page performance analytics', es: 'Analítica de rendimiento de páginas', ca: 'Analítica de rendiment de pàgines', fr: 'Analyse des performances des pages', pl: 'Analiza wydajności stron', de: 'Analyse der Seitenleistung', pt: 'Análise do desempenho das páginas' },
    events:     { en: 'User event tracking', es: 'Seguimiento de eventos de usuario', ca: 'Seguiment d\'esdeveniments d\'usuari', fr: 'Suivi des événements utilisateur', pl: 'Śledzenie zdarzeń użytkowników', de: 'Erfassung von Benutzerereignissen', pt: 'Acompanhamento de eventos de utilizador' },
    devices:    { en: 'Device and browser analytics', es: 'Analítica por dispositivo y navegador', ca: 'Analítica per dispositiu i navegador', fr: 'Analyse par appareil et navigateur', pl: 'Analiza według urządzenia i przeglądarki', de: 'Analyse nach Gerät und Browser', pt: 'Análise por dispositivo e navegador' },
    geographic: { en: 'Geographic distribution of users', es: 'Distribución geográfica de usuarios', ca: 'Distribució geogràfica d\'usuaris', fr: 'Répartition géographique des utilisateurs', pl: 'Rozkład geograficzny użytkowników', de: 'Geografische Verteilung der Benutzer', pt: 'Distribuição geográfica dos utilizadores' },
};

const COLUMN_LABELS: Record<string, Record<GA4Locale, string>> = {
    date:                     { en: 'Date', es: 'Fecha', ca: 'Data', fr: 'Date', pl: 'Data', de: 'Datum', pt: 'Data' },
    channel:                  { en: 'Channel', es: 'Canal', ca: 'Canal', fr: 'Canal', pl: 'Kanał', de: 'Kanal', pt: 'Canal' },
    source:                   { en: 'Source', es: 'Fuente', ca: 'Font', fr: 'Source', pl: 'Źródło', de: 'Quelle', pt: 'Origem' },
    medium:                   { en: 'Medium', es: 'Medio', ca: 'Mitjà', fr: 'Support', pl: 'Medium', de: 'Medium', pt: 'Meio' },
    sessions:                 { en: 'Sessions', es: 'Sesiones', ca: 'Sessions', fr: 'Sessions', pl: 'Sesje', de: 'Sitzungen', pt: 'Sessões' },
    active_users:             { en: 'Active Users', es: 'Usuarios Activos', ca: 'Usuaris Actius', fr: 'Utilisateurs actifs', pl: 'Aktywni użytkownicy', de: 'Aktive Benutzer', pt: 'Utilizadores ativos' },
    new_users:                { en: 'New Users', es: 'Usuarios Nuevos', ca: 'Usuaris Nous', fr: 'Nouveaux utilisateurs', pl: 'Nowi użytkownicy', de: 'Neue Benutzer', pt: 'Novos utilizadores' },
    bounce_rate:              { en: 'Bounce Rate', es: 'Tasa de Rebote', ca: 'Taxa de Rebot', fr: 'Taux de rebond', pl: 'Współczynnik odrzuceń', de: 'Absprungrate', pt: 'Taxa de rejeição' },
    avg_session_duration_sec: { en: 'Avg Session Duration (s)', es: 'Duración Media (s)', ca: 'Durada Mitjana (s)', fr: 'Durée moyenne (s)', pl: 'Średni czas trwania (s)', de: 'Durchschnittliche Dauer (s)', pt: 'Duração média (s)' },
    page_views:               { en: 'Page Views', es: 'Vistas de Página', ca: 'Visualitzacions de Pàgina', fr: 'Pages vues', pl: 'Wyświetlenia stron', de: 'Seitenaufrufe', pt: 'Visualizações de página' },
    conversions:              { en: 'Conversions', es: 'Conversiones', ca: 'Conversions', fr: 'Conversions', pl: 'Konwersje', de: 'Conversions', pt: 'Conversões' },
    path:                     { en: 'Path', es: 'Ruta', ca: 'Ruta', fr: 'Chemin', pl: 'Ścieżka', de: 'Pfad', pt: 'Caminho' },
    title:                    { en: 'Title', es: 'Título', ca: 'Títol', fr: 'Titre', pl: 'Tytuł', de: 'Titel', pt: 'Título' },
    views:                    { en: 'Views', es: 'Vistas', ca: 'Visualitzacions', fr: 'Vues', pl: 'Wyświetlenia', de: 'Aufrufe', pt: 'Visualizações' },
    users:                    { en: 'Users', es: 'Usuarios', ca: 'Usuaris', fr: 'Utilisateurs', pl: 'Użytkownicy', de: 'Benutzer', pt: 'Utilizadores' },
    event_name:               { en: 'Event Name', es: 'Nombre del Evento', ca: 'Nom de l\'Esdeveniment', fr: 'Nom de l\'événement', pl: 'Nazwa zdarzenia', de: 'Ereignisname', pt: 'Nome do evento' },
    event_count:              { en: 'Event Count', es: 'Recuento de Eventos', ca: 'Recompte d\'Esdeveniments', fr: 'Nombre d\'événements', pl: 'Liczba zdarzeń', de: 'Anzahl der Ereignisse', pt: 'Contagem de eventos' },
    event_value:              { en: 'Event Value', es: 'Valor del Evento', ca: 'Valor de l\'Esdeveniment', fr: 'Valeur de l\'événement', pl: 'Wartość zdarzenia', de: 'Ereigniswert', pt: 'Valor do evento' },
    category:                 { en: 'Category', es: 'Categoría', ca: 'Categoria', fr: 'Catégorie', pl: 'Kategoria', de: 'Kategorie', pt: 'Categoria' },
    browser:                  { en: 'Browser', es: 'Navegador', ca: 'Navegador', fr: 'Navigateur', pl: 'Przeglądarka', de: 'Browser', pt: 'Navegador' },
    operating_system:         { en: 'Operating System', es: 'Sistema Operativo', ca: 'Sistema Operatiu', fr: 'Système d\'exploitation', pl: 'System operacyjny', de: 'Betriebssystem', pt: 'Sistema operativo' },
    country:                  { en: 'Country', es: 'País', ca: 'País', fr: 'Pays', pl: 'Kraj', de: 'Land', pt: 'País' },
    city:                     { en: 'City', es: 'Ciudad', ca: 'Ciutat', fr: 'Ville', pl: 'Miasto', de: 'Stadt', pt: 'Cidade' },
};

const COLUMN_DESCRIPTIONS: Record<string, Record<GA4Locale, string>> = {
    date:                     { en: 'Date of the record', es: 'Fecha del registro', ca: 'Data del registre', fr: 'Date de l\'enregistrement', pl: 'Data rekordu', de: 'Datum des Datensatzes', pt: 'Data do registo' },
    channel:                  { en: 'Default channel grouping (GA4)', es: 'Agrupación de canal predeterminada (GA4)', ca: 'Agrupació de canal predeterminada (GA4)', fr: 'Regroupement de canaux par défaut (GA4)', pl: 'Domyślne grupowanie kanałów (GA4)', de: 'Standard-Channelgruppierung (GA4)', pt: 'Agrupamento de canais predefinido (GA4)' },
    source:                   { en: 'Traffic source', es: 'Fuente de tráfico', ca: 'Font de trànsit', fr: 'Source de trafic', pl: 'Źródło ruchu', de: 'Traffic-Quelle', pt: 'Origem do tráfego' },
    medium:                   { en: 'Traffic medium', es: 'Medio de tráfico', ca: 'Mitjà de trànsit', fr: 'Support de trafic', pl: 'Medium ruchu', de: 'Traffic-Medium', pt: 'Meio do tráfego' },
    sessions:                 { en: 'Number of sessions', es: 'Número de sesiones', ca: 'Nombre de sessions', fr: 'Nombre de sessions', pl: 'Liczba sesji', de: 'Anzahl der Sitzungen', pt: 'Número de sessões' },
    active_users:             { en: 'Number of active users', es: 'Número de usuarios activos', ca: 'Nombre d\'usuaris actius', fr: 'Nombre d\'utilisateurs actifs', pl: 'Liczba aktywnych użytkowników', de: 'Anzahl aktiver Benutzer', pt: 'Número de utilizadores ativos' },
    new_users:                { en: 'Number of new users', es: 'Número de usuarios nuevos', ca: 'Nombre d\'usuaris nous', fr: 'Nombre de nouveaux utilisateurs', pl: 'Liczba nowych użytkowników', de: 'Anzahl neuer Benutzer', pt: 'Número de novos utilizadores' },
    bounce_rate:              { en: 'Session bounce rate', es: 'Tasa de rebote de sesiones', ca: 'Taxa de rebot de les sessions', fr: 'Taux de rebond des sessions', pl: 'Współczynnik odrzuceń sesji', de: 'Absprungrate der Sitzungen', pt: 'Taxa de rejeição das sessões' },
    avg_session_duration_sec: { en: 'Average session duration in seconds', es: 'Duración media de la sesión en segundos', ca: 'Durada mitjana de la sessió en segons', fr: 'Durée moyenne de la session en secondes', pl: 'Średni czas trwania sesji w sekundach', de: 'Durchschnittliche Sitzungsdauer in Sekunden', pt: 'Duração média da sessão em segundos' },
    page_views:               { en: 'Total page and screen views', es: 'Total de vistas de páginas y pantallas', ca: 'Total de visualitzacions de pàgines i pantalles', fr: 'Total des vues de pages et d\'écrans', pl: 'Łączna liczba wyświetleń stron i ekranów', de: 'Gesamtzahl der Seiten- und Bildschirmaufrufe', pt: 'Total de visualizações de páginas e ecrãs' },
    conversions:              { en: 'Number of conversion events', es: 'Número de eventos de conversión', ca: 'Nombre d\'esdeveniments de conversió', fr: 'Nombre d\'événements de conversion', pl: 'Liczba zdarzeń konwersji', de: 'Anzahl der Conversion-Ereignisse', pt: 'Número de eventos de conversão' },
    path:                     { en: 'URL path of the page', es: 'Ruta URL de la página', ca: 'Ruta URL de la pàgina', fr: 'Chemin URL de la page', pl: 'Ścieżka URL strony', de: 'URL-Pfad der Seite', pt: 'Caminho URL da página' },
    title:                    { en: 'Page title', es: 'Título de la página', ca: 'Títol de la pàgina', fr: 'Titre de la page', pl: 'Tytuł strony', de: 'Seitentitel', pt: 'Título da página' },
    views:                    { en: 'Number of page views', es: 'Número de vistas de página', ca: 'Nombre de visualitzacions de pàgina', fr: 'Nombre de pages vues', pl: 'Liczba wyświetleń strony', de: 'Anzahl der Seitenaufrufe', pt: 'Número de visualizações de página' },
    users:                    { en: 'Number of active users', es: 'Número de usuarios activos', ca: 'Nombre d\'usuaris actius', fr: 'Nombre d\'utilisateurs actifs', pl: 'Liczba aktywnych użytkowników', de: 'Anzahl aktiver Benutzer', pt: 'Número de utilizadores ativos' },
    event_name:               { en: 'Name of the GA4 event', es: 'Nombre del evento GA4', ca: 'Nom de l\'esdeveniment GA4', fr: 'Nom de l\'événement GA4', pl: 'Nazwa zdarzenia GA4', de: 'Name des GA4-Ereignisses', pt: 'Nome do evento GA4' },
    event_count:              { en: 'Number of times the event was triggered', es: 'Número de veces que se disparó el evento', ca: 'Nombre de vegades que s\'ha disparat l\'esdeveniment', fr: 'Nombre de déclenchements de l\'événement', pl: 'Liczba wywołań zdarzenia', de: 'Anzahl der Auslösungen des Ereignisses', pt: 'Número de vezes que o evento foi acionado' },
    event_value:              { en: 'Sum of event values', es: 'Suma de valores del evento', ca: 'Suma dels valors de l\'esdeveniment', fr: 'Somme des valeurs de l\'événement', pl: 'Suma wartości zdarzenia', de: 'Summe der Ereigniswerte', pt: 'Soma dos valores do evento' },
    category:                 { en: 'Device category (mobile, desktop, tablet)', es: 'Categoría del dispositivo (móvil, escritorio, tablet)', ca: 'Categoria del dispositiu (mòbil, escriptori, tauleta)', fr: 'Catégorie d\'appareil (mobile, ordinateur, tablette)', pl: 'Kategoria urządzenia (mobilne, komputer, tablet)', de: 'Gerätekategorie (Mobilgerät, Desktop, Tablet)', pt: 'Categoria do dispositivo (telemóvel, computador, tablet)' },
    browser:                  { en: 'Browser used by the user', es: 'Navegador utilizado por el usuario', ca: 'Navegador utilitzat per l\'usuari', fr: 'Navigateur utilisé par l\'utilisateur', pl: 'Przeglądarka używana przez użytkownika', de: 'Vom Benutzer verwendeter Browser', pt: 'Navegador utilizado pelo utilizador' },
    operating_system:         { en: 'Operating system of the device', es: 'Sistema operativo del dispositivo', ca: 'Sistema operatiu del dispositiu', fr: 'Système d\'exploitation de l\'appareil', pl: 'System operacyjny urządzenia', de: 'Betriebssystem des Geräts', pt: 'Sistema operativo do dispositivo' },
    country:                  { en: 'Country of the user', es: 'País del usuario', ca: 'País de l\'usuari', fr: 'Pays de l\'utilisateur', pl: 'Kraj użytkownika', de: 'Land des Benutzers', pt: 'País do utilizador' },
    city:                     { en: 'City of the user', es: 'Ciudad del usuario', ca: 'Ciutat de l\'usuari', fr: 'Ville de l\'utilisateur', pl: 'Miasto użytkownika', de: 'Stadt des Benutzers', pt: 'Cidade do utilizador' },
};

/** Supported GA4 locales — add entries here to expand language coverage. */
const SUPPORTED_LOCALES: GA4Locale[] = ['en', 'es', 'ca', 'fr', 'pl', 'de', 'pt'];

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
