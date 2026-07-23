
// Query mode values renamed over time. Used to normalize queryMode coming from stored/legacy dashboards (ej. EDA2 -> TREE).
const LEGACY_QUERY_MODE_MAP: { [key: string]: string } = {
    'EDA2': 'TREE'
};

export function normalizeQueryMode(mode: string): string {
    return LEGACY_QUERY_MODE_MAP[mode] || mode;
}
