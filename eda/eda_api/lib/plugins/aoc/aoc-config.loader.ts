/**
 * Safe loader for config/aoc.config.js.
 *
 * The AOC config file is shipped as a placeholder template (e.g. `port: XXXX`). Requiring it
 * directly at module load would throw (ReferenceError / SyntaxError / missing file) and crash
 * the whole API. This loader isolates that failure: the API always boots, and the AOC endpoints
 * respond with a controlled error until the file is properly configured.
 */

export interface AOCConfig {
    host: string;
    port: number;
    database: string;
}

export interface AOCConfigResult {
    config: AOCConfig | null;
    error: string | null;
}

const PLACEHOLDER_REGEX = /^X+$/i;

const isPlaceholder = (value: any): boolean =>
    value === undefined || value === null || String(value).trim() === '' || PLACEHOLDER_REGEX.test(String(value).trim());

let cached: AOCConfigResult | null = null;

export function loadAOCConfig(): AOCConfigResult {
    if (cached) return cached;

    let raw: any;
    try {
        raw = require('../../../config/aoc.config');
    } catch (err: any) {
        // Do not cache load errors so the file can be fixed without restarting the API
        return { config: null, error: `AOC config file could not be loaded (config/aoc.config.js): ${err.message}` };
    }

    const missing: string[] = [];
    if (!raw || isPlaceholder(raw.host)) missing.push('host');
    if (!raw || isPlaceholder(raw.database)) missing.push('database');

    const port = Number(raw?.port);
    if (!raw || isPlaceholder(raw.port) || !Number.isInteger(port) || port <= 0 || port > 65535) missing.push('port');

    if (missing.length) {
        return { config: null, error: `AOC config is not properly configured (config/aoc.config.js). Invalid fields: ${missing.join(', ')}` };
    }

    cached = { config: { host: String(raw.host).trim(), port, database: String(raw.database).trim() }, error: null };
    return cached;
}

// Log once at startup so misconfiguration is visible without breaking the API
const startupCheck = loadAOCConfig();
if (startupCheck.error) {
    console.warn(`[AOC] ${startupCheck.error}. AOC endpoints will be unavailable.`);
}
