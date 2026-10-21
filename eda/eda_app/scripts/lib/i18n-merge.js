'use strict';

const fs = require('fs');
const path = require('path');
const { Xliff1TranslationParser } = require('@angular/localize/tools');

/**
 * Localization layer for the Angular build.
 *
 * Two kinds of XLIFF file take part, and each one has a single owner:
 *
 *   src/locale/messages.<locale>.xlf          (READ-ONLY translation catalog)
 * + src/locale/custom_messages.<locale>.xlf   (READ-ONLY SinergiaDA deltas, wins on id clash)
 * = src/locale/merged/messages.<locale>.xlf   (WRITTEN generated output, git-ignored)
 *
 * The xlf files are the only source of truth and are maintained by hand: the
 * merge writes the custom targets over the catalog and appends the custom units
 * the catalog does not declare. A message missing from every xlf stays out of
 * the generated file, so Angular falls back to the source text of the code. No
 * extraction takes part.
 *
 * Callers: `scripts/i18n-merge.js` (CLI), `scripts/i18n-merge.test.js` (tests).
 */

const MESSAGES_DIR = 'src/locale';
const MERGED_SUBDIR = 'merged';
const BASE_PREFIX = 'messages.';
const CUSTOM_PREFIX = 'custom_messages.';

/**
 * Language of the translatable strings in the code.
 *
 * Angular exposes it as `i18n.sourceLocale`, but that property only exists while
 * the code language is left out of the build targets. Spanish is translated like
 * any other locale here, so `angular.json` cannot declare it and the identity of
 * the source belongs to this module.
 */
const SOURCE_LOCALE = 'es';

/** Max length of a reported diagnostic, to keep the CLI output readable. */
const MAX_MESSAGE_LENGTH = 140;

/** Max number of ids listed per issue before falling back to a counter. */
const MAX_LISTED_IDS = 10;

/**
 * Reads the i18n declaration of the first project in `angular.json`.
 * The locale list is the single source of truth for what has to be merged.
 * `sourceLocale` is optional, Angular only keeps it while the language of the
 * code is not translated.
 */
function readI18nConfig(projectRoot) {
    const angularJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'angular.json'), 'utf8'));
    const [projectName] = Object.keys(angularJson.projects || {});
    if (!projectName) {
        throw new Error('No projects found in angular.json');
    }
    const i18n = angularJson.projects[projectName].i18n || {};
    return {
        projectName,
        sourceLocale: i18n.sourceLocale || SOURCE_LOCALE,
        locales: Object.keys(i18n.locales || {}),
    };
}

/** Absolute paths of every file that takes part in a locale build. */
function localePaths(projectRoot, locale) {
    const dir = path.join(projectRoot, MESSAGES_DIR);
    return {
        base: path.join(dir, `${BASE_PREFIX}${locale}.xlf`),
        custom: path.join(dir, `${CUSTOM_PREFIX}${locale}.xlf`),
        output: path.join(dir, MERGED_SUBDIR, `${BASE_PREFIX}${locale}.xlf`),
    };
}

/** Returns the opening `<file>` tag and its attributes, or null. */
function readFileElement(contents) {
    const match = /<file\b([^>]*)>/.exec(contents);
    if (!match) {
        return null;
    }
    const attrs = {};
    for (const [, name, value] of match[1].matchAll(/([\w:.-]+)\s*=\s*"([^"]*)"/g)) {
        attrs[name] = value;
    }
    return { tag: match[0], attrs };
}

/**
 * Rewrites the `<file>` header so the generated file always declares the real
 * source locale and its own target locale. The header of the merged output is
 * inherited from the destination file, which is the skeleton and therefore
 * trustworthy, but `target-language` still has to be declared per locale.
 */
function withNormalizedHeader(contents, sourceLocale, locale) {
    const file = readFileElement(contents);
    if (!file) {
        throw new Error('No <file> element found');
    }
    const attrs = {
        'source-language': sourceLocale,
        'target-language': locale,
        datatype: file.attrs.datatype || 'plaintext',
        original: file.attrs.original || 'ng2.template',
    };
    const tag = Object.entries(attrs)
        .map(([name, value]) => `${name}="${value}"`)
        .join(' ');
    return contents.replace(file.tag, `<file ${tag}>`);
}

/** Maps `<trans-unit id>` to the inner XML of the unit. */
function readUnits(contents) {
    const units = new Map();
    for (const [, , id, inner] of contents.matchAll(UNIT_PATTERN())) {
        units.set(id, inner);
    }
    return units;
}

function UNIT_PATTERN() {
    return /<trans-unit\b[^>]*\bid=(["'])([^"']+)\1[^>]*>([\s\S]*?)<\/trans-unit>/g;
}

/**
 * Removes repeated `<trans-unit>` blocks, keeping the first occurrence of each id.
 *
 * Angular reports "Duplicated translations for message X" and silently uses the
 * first one, so duplicates in a generated file are dead weight that breaks the
 * build. Removing them before the merge also keeps every unit consistent with
 * the one Angular would pick.
 */
function dedupeUnits(contents) {
    const seen = new Set();
    const removed = [];
    let result = '';
    let cursor = 0;
    for (const match of contents.matchAll(UNIT_PATTERN())) {
        const id = match[2];
        if (seen.has(id)) {
            const end = match.index + match[0].length;
            result += contents.slice(cursor, match.index).replace(/\n[ \t]*$/, '');
            cursor = end;
            removed.push(id);
            continue;
        }
        seen.add(id);
    }
    if (!removed.length) {
        return { content: contents, removed };
    }
    return { content: result + contents.slice(cursor), removed };
}

function extractElement(inner, name) {
    const match = new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`).exec(inner || '');
    return match ? match[1] : null;
}

/** Replaces the `<target>` of a unit, or appends one when the unit has none. */
function replaceUnitTarget(unitXml, targetXml) {
    if (/<target\b/i.test(unitXml)) {
        return unitXml.replace(/(<target[^>]*>)[\s\S]*?(<\/target>)/i, (whole, open, close) => `${open}${targetXml}${close}`);
    }
    return unitXml.replace(/(<source\b[^>]*>[\s\S]*?<\/source>)/i, (whole, source) => `${whole}\n        <target>${targetXml}</target>`);
}

/**
 * Writes the targets of `overrides` over `contents`, keeping every unit of
 * `contents` and ignoring the override ids it does not declare.
 *
 * `mergeCatalogs` uses it to lay the custom targets over the catalog without
 * touching the catalog units the custom file does not declare.
 */
function overlayTargets(contents, overrides) {
    if (!overrides || !overrides.size) {
        return contents;
    }
    let result = '';
    let cursor = 0;
    for (const match of contents.matchAll(UNIT_PATTERN())) {
        if (!overrides.has(match[2])) {
            continue;
        }
        const targetXml = extractElement(overrides.get(match[2]), 'target');
        if (targetXml === null) {
            continue;
        }
        result += contents.slice(cursor, match.index);
        result += replaceUnitTarget(match[0], targetXml);
        cursor = match.index + match[0].length;
    }
    return result + contents.slice(cursor);
}

/**
 * Combines the hand-maintained xlf files of a locale: the catalog is the base
 * and the custom targets are written over it; custom units the catalog does not
 * declare are appended. No extraction takes part, so a message missing from
 * every xlf simply stays out and Angular uses the source text of the code.
 */
function mergeCatalogs(catalogContents, customContents) {
    if (!catalogContents) {
        return customContents;
    }
    if (!customContents) {
        return catalogContents;
    }
    const customUnits = readUnits(customContents);
    let result = overlayTargets(catalogContents, customUnits);
    const catalogIds = new Set(readUnits(catalogContents).keys());
    const extras = [];
    for (const match of customContents.matchAll(UNIT_PATTERN())) {
        if (!catalogIds.has(match[2])) {
            extras.push(match[0]);
        }
    }
    if (extras.length) {
        result = result.replace(/(<\/body>)/, (whole) => `${extras.join('\n')}\n${whole}`);
    }
    return result;
}

/** Comparable plain text of a `<source>`/`<target>` body, markup and spacing removed. */
function plainText(xml) {
    if (xml === null) {
        return null;
    }
    return xml
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Parses an XLIFF 1.2 file with the same parser the Angular CLI uses, so the
 * placeholder signatures reported here are the ones the build will compare
 * against. Parse problems are returned, never thrown.
 */
function readTranslations(parser, filePath, contents) {
    const analysis = parser.analyze(filePath, contents);
    if (!analysis.canParse) {
        return {
            canParse: false,
            translations: new Map(),
            errors: analysis.diagnostics.messages,
            warnings: [],
        };
    }
    const bundle = parser.parse(filePath, contents, analysis.hint);
    return {
        canParse: true,
        translations: new Map(Object.entries(bundle.translations)),
        errors: bundle.diagnostics.messages.filter((message) => message.type === 'error'),
        warnings: bundle.diagnostics.messages.filter((message) => message.type !== 'error'),
    };
}

/**
 * Placeholder names of a parsed message, order independent. Angular rejects a
 * translation whose placeholders do not match the ones of the current source,
 * so this is the comparison that matters.
 */
function placeholderSignature(translation) {
    if (!translation) {
        return null;
    }
    return (translation.placeholderNames || [])
        .slice()
        .sort()
        .join(' ');
}

function summarize(message) {
    const firstLine = String(message).split('\n')[0].replace(/^(Error|Warning):\s*/, '').trim();
    return firstLine.length > MAX_MESSAGE_LENGTH ? `${firstLine.slice(0, MAX_MESSAGE_LENGTH - 1)}…` : firstLine;
}

function listIds(ids) {
    if (ids.length <= MAX_LISTED_IDS) {
        return ids.join(', ');
    }
    return `${ids.slice(0, MAX_LISTED_IDS).join(', ')} … (+${ids.length - MAX_LISTED_IDS})`;
}

/** Relative path of a file, for reports. */
function rel(projectRoot, filePath) {
    return path.relative(projectRoot, filePath);
}

/**
 * Reads and validates one of the input files, sharing the checks a catalog and a
 * custom file need: parse diagnostics, repeated ids and a sane header.
 */
function readInput({ projectRoot, filePath, kind, sourceLocale, locale, parser, issues }) {
    const add = (level, code, message) => issues.push({ level, code, message });
    const fileRelative = rel(projectRoot, filePath);
    const contents = fs.readFileSync(filePath, 'utf8');
    const file = readFileElement(contents);
    if (!file) {
        add('error', `${kind}-header`, 'No <file> element found');
        return null;
    }
    if (kind === 'catalog' && file.attrs['source-language'] !== sourceLocale) {
        add(
            'warning',
            'catalog-source-language',
            `${fileRelative} source-language="${file.attrs['source-language']}" should be "${sourceLocale}"`
        );
    }
    if (file.attrs['target-language'] !== locale) {
        add(
            'warning',
            `${kind}-target-language`,
            `${fileRelative} target-language="${file.attrs['target-language'] || ''}" should be "${locale}"`
        );
    }

    const deduped = dedupeUnits(contents);
    if (deduped.removed.length) {
        add(
            'warning',
            `${kind}-duplicate-id`,
            `${deduped.removed.length} repeated id(s) in ${fileRelative}, first occurrence kept: ${listIds(deduped.removed)}`
        );
    }

    // Parse the deduped contents: a repeated id is a diagnostic the parser
    // rejects, but it is already handled above, so it must not fail the locale.
    const parsed = readTranslations(parser, filePath, deduped.content);
    for (const diagnostic of parsed.errors) {
        add('error', `${kind}-message`, `${fileRelative} ${summarize(diagnostic.message)}`);
    }
    for (const diagnostic of parsed.warnings) {
        add('warning', `${kind}-message`, `${fileRelative} ${summarize(diagnostic.message)}`);
    }

    const units = readUnits(deduped.content);
    return { contents: deduped.content, units, parsed };
}

/**
 * Merges one locale and reports every problem found on the way.
 *
 * Content problems (invalid messages, placeholder mismatches, repeated ids, ids
 * the code dropped) are reported, not thrown: the caller decides whether to fail
 * the run, so local development keeps working while `i18n:check` gates the branch.
 *
 * @returns {{locale: string, status: string, content: string|null, outputPath: string,
 *            counts: object, issues: Array<{level: string, code: string, message: string}>}}
 */
function processLocale({
    projectRoot,
    locale,
    sourceLocale = SOURCE_LOCALE,
    parser = new Xliff1TranslationParser(),
}) {
    const paths = localePaths(projectRoot, locale);
    const issues = [];
    const add = (level, code, message) => issues.push({ level, code, message });
    const report = { locale, status: 'skipped', content: null, outputPath: paths.output, counts: {}, issues };

    const hasCatalog = fs.existsSync(paths.base);
    const hasCustom = fs.existsSync(paths.custom);
    if (!hasCatalog && !hasCustom) {
        add(
            'warning',
            'locale-missing',
            `no ${rel(projectRoot, paths.base)} nor ${rel(projectRoot, paths.custom)}, the locale falls back to the source text of the code`
        );
        return report;
    }

    let catalog = null;
    let custom = null;

    if (fs.existsSync(paths.base)) {
        catalog = readInput({
            projectRoot,
            filePath: paths.base,
            kind: 'catalog',
            sourceLocale,
            locale,
            parser,
            issues,
        });
    } else {
        add(
            'warning',
            'catalog-missing',
            `no ${rel(projectRoot, paths.base)}, the locale falls back to the source text of the code`
        );
    }

    if (fs.existsSync(paths.custom)) {
        custom = readInput({
            projectRoot,
            filePath: paths.custom,
            kind: 'custom',
            sourceLocale,
            locale,
            parser,
            issues,
        });
    } else {
        add('warning', 'custom-missing', `no ${rel(projectRoot, paths.custom)}, locale left as upstream`);
    }

    // A structurally invalid input cannot produce a usable output: the parse
    // diagnostics are already reported, so nothing is generated for this locale.
    const parseFailed = (input) => Boolean(input && input.parsed && input.parsed.canParse === false);
    if (parseFailed(catalog) || parseFailed(custom)) {
        return report;
    }

    try {
        // The xlf files are the only source of truth: the merged file is the
        // catalog with the custom targets written over it, plus any custom-only
        // unit. A message missing from every xlf stays out, so Angular falls
        // back to the source text of the code.
        report.content = mergeCatalogs(catalog ? catalog.contents : null, custom ? custom.contents : null);
    } catch (error) {
        // A strict XML parser rejects a malformed file that the Angular HTML
        // parser may still recover from, so this has to be a reported issue
        // rather than a crash of the whole run.
        add('error', 'merge-failed', `${rel(projectRoot, hasCatalog ? paths.base : paths.custom)} is not valid XML, nothing generated: ${summarize(error.message)}`);
        return report;
    }

    // No extraction takes part, so there is nothing to compare the translations
    // against: the xlf files are hand-maintained and already carry the final text.

    try {
        report.content = withNormalizedHeader(report.content, sourceLocale, locale);
    } catch (error) {
        add('error', 'header-invalid', summarize(error.message));
        return report;
    }

    report.counts = {
        catalog: catalog ? catalog.units.size : 0,
        custom: custom ? custom.units.size : 0,
    };
    report.status = 'merged';
    return report;
}

module.exports = {
    MERGED_SUBDIR,
    MESSAGES_DIR,
    SOURCE_LOCALE,
    dedupeUnits,
    localePaths,
    mergeCatalogs,
    placeholderSignature,
    processLocale,
    readFileElement,
    readI18nConfig,
    readTranslations,
    readUnits,
    withNormalizedHeader,
};
