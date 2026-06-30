'use strict';

const fs = require('fs');
const path = require('path');

const CONFIG_DIR = path.join(__dirname, '../src/app/config/customizable');
const DEFAULTS_PATH  = path.join(CONFIG_DIR, 'customizable_default.ts');
const OVERWRITES_PATH = path.join(CONFIG_DIR, 'customizable_overwrites.ts');

const defaultsContent  = fs.readFileSync(DEFAULTS_PATH, 'utf8');
const overwritesContent = fs.readFileSync(OVERWRITES_PATH, 'utf8');

// Match single-line export const declarations: export const NAME[: TYPE] = VALUE;
const LINE_REGEX = /^export const\s+(\w+)(?:\s*:\s*[^=]+)?\s*=\s*.+$/gm;

let result = defaultsContent;
let count  = 0;
let match;

while ((match = LINE_REGEX.exec(overwritesContent)) !== null) {
    const varName     = match[1];
    const overwriteLine = match[0];

    const targetRegex = new RegExp(`^export const\\s+${varName}\\b[^\\n]*$`, 'm');
    if (targetRegex.test(result)) {
        result = result.replace(targetRegex, overwriteLine);
        console.log(`\x1b[32m✓\x1b[0m ${varName}`);
        count++;
    } else {
        console.warn(`\x1b[33m⚠\x1b[0m Not found in defaults: ${varName}`);
    }
}

fs.writeFileSync(DEFAULTS_PATH, result, 'utf8');
console.log(`\n\x1b[34m=====\x1b[0m Applied \x1b[32m[${count}] override(s)\x1b[0m to customizable_default.ts \x1b[34m=====\x1b[0m`);
