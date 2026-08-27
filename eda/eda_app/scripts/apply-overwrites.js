'use strict';

const fs = require('fs');
const path = require('path');

const CONFIG_DIR      = path.join(__dirname, '../src/app/config/customizable');
const DEFAULTS_PATH   = path.join(CONFIG_DIR, 'customizable_default.ts');
const OVERWRITES_PATH = path.join(CONFIG_DIR, 'customizable_overwrites.ts');

/**
 * Extracts the full declaration text starting at `pos` in `src`.
 * Handles nested {}, [], (), strings (', ", `), escape sequences, and // and block comments.
 * Returns everything from pos up to and including the closing semicolon at depth 0.
 */
function extractDeclaration(src, pos) {
    let i = pos;
    let depth = 0;
    let inString = null;       // null | "'" | '"' | '`'
    let inLineComment = false;
    let inBlockComment = false;
    const len = src.length;

    while (i < len) {
        const ch   = src[i];
        const next = src[i + 1];

        if (!inString) {
            if (inLineComment) {
                if (ch === '\n') inLineComment = false;
                i++; continue;
            }
            if (inBlockComment) {
                if (ch === '*' && next === '/') { inBlockComment = false; i += 2; continue; }
                i++; continue;
            }
            if (ch === '/' && next === '/') { inLineComment = true;  i += 2; continue; }
            if (ch === '/' && next === '*') { inBlockComment = true; i += 2; continue; }
        }

        if (inString) {
            if (ch === '\\') { i += 2; continue; }  // skip escaped char
            if (ch === inString) inString = null;
            i++; continue;
        }

        if (ch === "'" || ch === '"' || ch === '`') { inString = ch; i++; continue; }

        if (ch === '{' || ch === '[' || ch === '(') { depth++; i++; continue; }
        if (ch === '}' || ch === ']' || ch === ')') { depth--; i++; continue; }

        if (ch === ';' && depth === 0) return src.slice(pos, i + 1);

        i++;
    }

    return src.slice(pos); // fallback: no closing semicolon found
}

/**
 * Returns all `export const NAME` positions found in src (ignores commented lines).
 */
function findExports(src) {
    const regex = /^export const\s+(\w+)/gm;
    const results = [];
    let match;
    while ((match = regex.exec(src)) !== null) {
        results.push({ name: match[1], start: match.index });
    }
    return results;
}

const defaultsContent   = fs.readFileSync(DEFAULTS_PATH,   'utf8');
const overwritesContent = fs.readFileSync(OVERWRITES_PATH, 'utf8');

const overwriteExports = findExports(overwritesContent);

let result = defaultsContent;
let count  = 0;

for (const { name, start } of overwriteExports) {
    const overwriteDecl = extractDeclaration(overwritesContent, start);

    const defaultMatch = new RegExp(`^export const\\s+${name}\\b`, 'm').exec(result);
    if (!defaultMatch) {
        console.warn(`\x1b[33m⚠\x1b[0m Not found in defaults: ${name}`);
        continue;
    }

    const defaultDecl = extractDeclaration(result, defaultMatch.index);
    result = result.slice(0, defaultMatch.index) + overwriteDecl + result.slice(defaultMatch.index + defaultDecl.length);
    console.log(`\x1b[32m✓\x1b[0m ${name}`);
    count++;
}

fs.writeFileSync(DEFAULTS_PATH, result, 'utf8');
console.log(`\n\x1b[34m=====\x1b[0m Applied \x1b[32m[${count}] override(s)\x1b[0m to customizable_default.ts \x1b[34m=====\x1b[0m`);
