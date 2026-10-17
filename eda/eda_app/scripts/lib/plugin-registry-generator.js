'use strict';

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const META_FILENAME = 'plugin.meta.ts';

/**
 * Reads the literal value of a TypeScript AST expression node (string, number,
 * boolean, null, array or nested object literals). Never executes any code -
 * unsupported expressions (calls, identifiers, spreads, etc.) throw instead of
 * being evaluated, since plugin.meta.ts files must only ever describe data.
 */
function literalFromNode(node, metaPath) {
    switch (node.kind) {
        case ts.SyntaxKind.StringLiteral:
        case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
            return node.text;
        case ts.SyntaxKind.NumericLiteral:
            return Number(node.text);
        case ts.SyntaxKind.TrueKeyword:
            return true;
        case ts.SyntaxKind.FalseKeyword:
            return false;
        case ts.SyntaxKind.NullKeyword:
            return null;
        case ts.SyntaxKind.PrefixUnaryExpression:
            if (node.operator === ts.SyntaxKind.MinusToken) {
                return -literalFromNode(node.operand, metaPath);
            }
            break;
        case ts.SyntaxKind.ArrayLiteralExpression:
            return node.elements.map((el) => literalFromNode(el, metaPath));
        case ts.SyntaxKind.ObjectLiteralExpression:
            return objectLiteralFromNode(node, metaPath);
        default:
            break;
    }

    throw new Error(
        `[plugin-registry] ${metaPath}: expresión no soportada en "meta" (${ts.SyntaxKind[node.kind]}). ` +
        `Solo se permiten literales: string, number, boolean, null, arrays y objetos.`
    );
}

function objectLiteralFromNode(objectLiteral, metaPath) {
    const result = {};
    for (const prop of objectLiteral.properties) {
        if (!ts.isPropertyAssignment(prop)) {
            throw new Error(
                `[plugin-registry] ${metaPath}: solo se permiten propiedades "clave: valor" en "meta" ` +
                `(nada de spreads, shorthand ni métodos).`
            );
        }
        const key = ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name) || ts.isNumericLiteral(prop.name)
            ? prop.name.text
            : prop.name.getText();
        result[key] = literalFromNode(prop.initializer, metaPath);
    }
    return result;
}

/**
 * Parses plugin.meta.ts as an AST and reads the `export const meta = {...}`
 * object literal directly, without transpiling or executing the file. This
 * intentionally avoids `new Function()`/eval-equivalent code execution over
 * repo-authored files.
 */
function loadMeta(metaPath) {
    const source = fs.readFileSync(metaPath, 'utf8');
    const sourceFile = ts.createSourceFile(metaPath, source, ts.ScriptTarget.ES2019, true);

    for (const statement of sourceFile.statements) {
        if (!ts.isVariableStatement(statement)) continue;
        if (!ts.getModifiers(statement)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) continue;

        for (const decl of statement.declarationList.declarations) {
            if (!ts.isIdentifier(decl.name) || decl.name.text !== 'meta' || !decl.initializer) continue;

            if (!ts.isObjectLiteralExpression(decl.initializer)) {
                throw new Error(`[plugin-registry] ${metaPath}: "export const meta" debe ser un objeto literal.`);
            }

            return objectLiteralFromNode(decl.initializer, metaPath);
        }
    }

    throw new Error(`[plugin-registry] ${metaPath}: no se encontró "export const meta = {...}".`);
}

/**
 * Scans `pluginsDir` for subfolders with a `plugin.meta.ts`, validates
 * `requiredFields`, builds the registry file via `buildOutput(plugins)`,
 * and writes it to `registryPath` only if the content actually changed.
 *
 * @param {object} opts
 * @param {string} opts.name           Prefix used in console logs, e.g. 'page-plugins'.
 * @param {string} opts.pluginsDir     Absolute path to the plugins folder to scan.
 * @param {string} opts.registryPath   Absolute path to the generated registry file.
 * @param {string[]} opts.requiredFields  Fields that must be present in each plugin.meta.ts.
 * @param {(plugins: any[]) => string} opts.buildOutput  Returns the full registry file contents.
 * @param {(plugin: any) => string} [opts.describe]  Label used in the final summary log (defaults to `type` or `path`).
 */
function generatePluginRegistry({ name, pluginsDir, registryPath, requiredFields, buildOutput, describe }) {
    const pluginDirs = fs
        .readdirSync(pluginsDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort();

    const plugins = [];

    for (const dir of pluginDirs) {
        const metaPath = path.join(pluginsDir, dir, META_FILENAME);

        if (!fs.existsSync(metaPath)) {
            console.warn(`[${name}] "${dir}" no tiene ${META_FILENAME}, se omite`);
            continue;
        }

        const meta = loadMeta(metaPath);
        const missing = requiredFields.filter((field) => meta?.[field] === undefined);

        if (missing.length) {
            console.warn(`[${name}] "${dir}": ${META_FILENAME} incompleto (faltan: ${missing.join(', ')}), se omite`);
            continue;
        }

        plugins.push({ dir, ...meta });
    }

    const output = buildOutput(plugins);

    const previous = fs.existsSync(registryPath) ? fs.readFileSync(registryPath, 'utf8') : null;
    if (previous !== output) {
        fs.writeFileSync(registryPath, output, 'utf8');
    }

    const describePlugin = describe ?? ((p) => p.type ?? p.path ?? p.dir);
    console.log(`[${name}] ${plugins.length} plugin(s) registrados: ${plugins.map(describePlugin).join(', ')}`);
}

module.exports = { generatePluginRegistry };
