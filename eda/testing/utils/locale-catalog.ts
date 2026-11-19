import * as fs from 'fs';
import * as path from 'path';

/**
 * El sourceLocale del proyecto es "es", pero `npm start` de eda_app sirve catalan
 * por defecto (`ng serve --configuration=ca`) -- ver la nota en
 * tests/e2e/admin-groups.spec.ts. En vez de hardcodear a mano la traduccion
 * catalana de cada texto de UI (especialmente poco practico para los ~30 nombres
 * de tipo de grafico de dashboard-charts.spec.ts, donde una transcripcion manual
 * es tediosa y propensa a error), esto lee el propio catalogo de traduccion
 * generado por la app (`src/locale/merged/messages.ca.xlf`) y construye un mapa
 * texto-en-español -> texto-en-catalan real, siempre coherente con lo que la app
 * sirve de verdad.
 */
const CATALOG_PATH = path.resolve(__dirname, '..', '..', 'eda_app', 'src', 'locale', 'merged', 'messages.ca.xlf');

let catalog: Map<string, string> | null = null;

function loadCatalog(): Map<string, string> {
    if (catalog) return catalog;
    catalog = new Map();
    let xml: string;
    try {
        xml = fs.readFileSync(CATALOG_PATH, 'utf8');
    } catch {
        // Catalogo no generado (falta "npm run i18n:merge" en eda_app) -- se sigue
        // funcionando, solo sin traduccion catalana (cae al texto en español tal cual).
        return catalog;
    }
    const unitRe = /<source>([\s\S]*?)<\/source>\s*<target>([\s\S]*?)<\/target>/g;
    let m: RegExpExecArray | null;
    while ((m = unitRe.exec(xml))) {
        const source = m[1].replace(/\s+/g, ' ').trim();
        const target = m[2].replace(/\s+/g, ' ').trim();
        if (source && target) catalog.set(source, target);
    }
    return catalog;
}

function escapeRegExp(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * El catalogo i18n (messages.ca.xlf) queda desactualizado respecto al codigo fuente
 * actual cuando alguien corrige un texto en el .ts/.html pero no se vuelve a
 * extraer/mergear el catalogo: Angular sigue traduciendo bien en runtime (liga por
 * ID, no por texto), pero el <source> grabado en el xlf deja de coincidir con el
 * texto real, y una busqueda por texto como la de este fichero no encuentra el
 * <target>. Caso real encontrado: chart-utils.service.ts:81 tiene
 * "Gráfico de Barras Apiladas" (@@chartTypes6), pero el xlf aun tiene grabado el
 * <source> con el typo historico "Gráfico de Barras Apliadas" -- hasta que se
 * vuelva a correr `npm run i18n:merge` en eda_app, el texto real que hay que buscar
 * en el catalogo es el typo, no el texto correcto actual.
 */
const SOURCE_TEXT_OVERRIDES: Record<string, string> = {
    'Gráfico de Barras Apiladas': 'Gráfico de Barras Apliadas',
};

function alternatives(spanishText: string): string[] {
    const lookupKey = SOURCE_TEXT_OVERRIDES[spanishText] ?? spanishText;
    const cat = loadCatalog();
    // Match exacto primero; si no hay, insensible a mayusculas -- cubre drift de
    // capitalizacion entre el label que usa el test y el <source> real del catalogo
    // (p.ej. 'TreeMap' en el test vs 'Treemap' en chart-utils.service.ts/el xlf).
    let ca = cat.get(lookupKey);
    if (!ca) {
        const lower = lookupKey.toLowerCase();
        for (const [src, tgt] of cat) {
            if (src.toLowerCase() === lower) { ca = tgt; break; }
        }
    }
    return ca && ca.toLowerCase() !== spanishText.toLowerCase() ? [spanishText, ca] : [spanishText];
}

/** Para `hasText`/`getByText`: coincide en español o catalan, como substring (igual
 * que el comportamiento por defecto de Playwright sin `exact`). Insensible a
 * mayusculas, como el matching de texto por defecto de Playwright. */
export function esOrCa(spanishText: string): RegExp {
    return new RegExp(alternatives(spanishText).map(escapeRegExp).join('|'), 'i');
}

/** Para `getByRole(..., { name })`: coincide EXACTAMENTE con el español o el catalan
 * -- ancla toda la cadena, para no confundir p.ej. "Gráfico de Barras" con
 * "Gráfico de Barras Horizontales" por un match de substring. */
export function esOrCaExact(spanishText: string): RegExp {
    return new RegExp(`^(${alternatives(spanishText).map(escapeRegExp).join('|')})$`, 'i');
}
