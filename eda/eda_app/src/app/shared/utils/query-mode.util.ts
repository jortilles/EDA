
// Query mode values renamed over time. Used to normalize queryMode coming from stored/legacy dashboards (ej. EDA2 -> TREE).
const LEGACY_QUERY_MODE_MAP: { [key: string]: string } = {
    'EDA2': 'TREE'
};

export function normalizeQueryMode(mode: string): string {
    return LEGACY_QUERY_MODE_MAP[mode] || mode;
}

// Resolves a panel's effective query mode, applying the legacy default (no queryMode -> SQL/EDA via modeSQL) and normalizing it.
export function resolveQueryMode(queryMode: string, modeSQL?: boolean): string {
    return normalizeQueryMode(queryMode || (modeSQL ? 'SQL' : 'EDA'));
}

export function isEdaQueryMode(queryMode: string, modeSQL?: boolean): boolean {
    return resolveQueryMode(queryMode, modeSQL) === 'EDA';
}
