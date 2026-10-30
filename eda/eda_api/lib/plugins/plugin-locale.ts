import { Request } from 'express';
import { IDatasourcePlugin } from './plugin.interface';

/** Every app locale a plugin labels file may support */
const APP_LOCALES = ['es', 'en', 'ca', 'fr', 'pl', 'de', 'pt', 'it'];

/**
 * Locale requested by the client: explicit body value, locale segment of the app URL
 * (e.g. ".../it/#/..."), or the browser Accept-Language header.
 */
export function requestLocale(req: Request): string | undefined {
    const bodyLocale = req?.body?.locale;
    if (bodyLocale) return String(bodyLocale);

    const appUrl = String(req?.headers?.referer || req?.headers?.origin || '');
    const urlLocale = appUrl.split('#')[0].split('/').find(segment => APP_LOCALES.includes(segment));
    if (urlLocale) return urlLocale;

    return (req?.headers?.['accept-language'] as string) || undefined;
}

/**
 * Infers the locale a plugin model was labelled in. applyLabels() writes the chosen locale
 * as `default` and every other supported locale in `localized`, so the supported locale
 * missing from `localized` is the one the model was created in.
 */
export function inferModelLocale(plugin: IDatasourcePlugin, tables: any[]): string | undefined {
    const supported = APP_LOCALES.filter(l => plugin.resolveLocale?.(l) === l);
    for (const table of tables || []) {
        const localized: any[] = table?.display_name?.localized || [];
        if (!localized.length) continue;
        const present = new Set(localized.map(l => l.locale));
        const missing = supported.filter(l => !present.has(l));
        if (missing.length === 1) return missing[0];
    }
    return undefined;
}

/**
 * Locale to label a plugin model with. Priority: locale stored in the model metadata,
 * locale inferred from the existing labels, locale of the request, plugin default.
 */
export function resolvePluginModelLocale(plugin: IDatasourcePlugin, req: Request, storedDs?: any): string {
    const resolve = (raw?: string) => plugin.resolveLocale ? plugin.resolveLocale(raw) : (raw || 'es');
    const stored = storedDs?.metadata?.locale;
    if (stored) return resolve(stored);
    const inferred = inferModelLocale(plugin, storedDs?.model?.tables);
    if (inferred) return inferred;
    return resolve(requestLocale(req));
}
