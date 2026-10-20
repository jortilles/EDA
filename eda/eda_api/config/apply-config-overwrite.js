'use strict';

const fs = require('fs');
const path = require('path');

const OVERWRITE_PATH = path.join(__dirname, 'config.overwrite.js');

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge(base, overwrite) {
    if (!isPlainObject(base) || !isPlainObject(overwrite)) {
        return overwrite;
    }
    const result = structuredClone(base);
    for (const key of Object.keys(overwrite)) {
        result[key] = deepMerge(result[key], overwrite[key]);
    }
    return result;
}

let cachedOverwrites = null;

function loadOverwrites() {
    if (cachedOverwrites === null) {
        if (!fs.existsSync(OVERWRITE_PATH)) {
            cachedOverwrites = {};
        } else {
            try {
                cachedOverwrites = require(OVERWRITE_PATH);
            } catch (err) {
                console.error('[config-overwrite] Failed to load config.overwrite.js:', err.message);
                cachedOverwrites = {};
            }
        }
    }
    return cachedOverwrites;
}

/**
 * Applies the client-specific values from config.overwrite.js (gitignored, not part of the
 * core repo) on top of a default config value. `key` selects which top-level property of
 * config.overwrite.js applies to this value — see config.overwrite.js.dist for the available
 * keys and expected shape. Nested objects are merged recursively, so the overwrite only needs
 * to specify the properties that actually change.
 */
function applyConfigOverwrite(key, defaults) {
    const overwriteValue = loadOverwrites()[key];
    return overwriteValue === undefined ? defaults : deepMerge(defaults, overwriteValue);
}

module.exports = applyConfigOverwrite;
