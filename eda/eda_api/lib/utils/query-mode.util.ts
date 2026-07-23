

export class QueryModeUtil {

    // Mapa de modos legados a su nuevo valor tras el renombrado (ej. EDA2 -> TREE)
    private static readonly LEGACY_MODE_MAP: { [key: string]: string } = {
        'EDA2': 'TREE'
    };

    public static normalize(mode: string): string {
        return QueryModeUtil.LEGACY_MODE_MAP[mode] || mode;
    }

}
