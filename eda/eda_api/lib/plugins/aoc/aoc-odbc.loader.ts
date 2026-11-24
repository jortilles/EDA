/**
 * Safe loader for the 'odbc' npm package used by the AOC connector.
 *
 * The 'odbc' package ships a native binding linked against the system ODBC driver manager
 * (unixODBC's libodbc.so.2 on Linux). Requiring it at module load when that library is not
 * installed throws "libodbc.so.2: cannot open shared object file" and crashes the whole API.
 * This loader isolates that failure so the API always boots and the AOC plugin is disabled
 * with a clear message instead.
 */

export interface OdbcLoadResult {
    odbc: any | null;
    error: string | null;
}

let cached: OdbcLoadResult | null = null;

/** Builds an actionable message for the platform when the native ODBC binding cannot be loaded */
function buildLoadErrorMessage(err: any): string {
    const detail = err?.message || String(err);
    const missingDriverManager = /libodbc\.so|libodbc\.\d+\.dylib|cannot open shared object file|Library not loaded/i.test(detail);

    if (process.platform === 'linux' && missingDriverManager) {
        return 'The unixODBC library (libodbc.so.2) is not installed on this server. ' +
            'Install it and restart the API: ' +
            '"sudo apt-get install -y unixodbc" (Debian/Ubuntu) or "sudo dnf install -y unixODBC" (RHEL/CentOS/Fedora). ' +
            `Detail: ${detail}`;
    }
    if (process.platform === 'darwin' && missingDriverManager) {
        return 'The unixODBC library is not installed on this server. ' +
            'Install it with "brew install unixodbc" and restart the API. ' +
            `Detail: ${detail}`;
    }
    return `The native 'odbc' module could not be loaded. Detail: ${detail}`;
}

/** Loads the 'odbc' module once. Returns the module, or a descriptive error when it is not usable */
export function loadOdbc(): OdbcLoadResult {
    if (cached) return cached;
    try {
        cached = { odbc: require('odbc'), error: null };
    } catch (err: any) {
        // A native library that failed to load is not retried until the API is restarted
        cached = { odbc: null, error: buildLoadErrorMessage(err) };
    }
    return cached;
}

/** Returns the 'odbc' module or throws the descriptive load error */
export function getOdbc(): any {
    const { odbc, error } = loadOdbc();
    if (!odbc) throw new Error(`[AOC] ${error}`);
    return odbc;
}
