'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, before, describe, it } = require('node:test');

const { processLocale, readI18nConfig } = require('./lib/i18n-merge');

/** Builds a minimal XLIFF 1.2 document. */
function xliff({ sourceLanguage, targetLanguage, units }) {
    const body = Object.entries(units)
        .map(
            ([id, { source, target }]) =>
                `      <trans-unit id="${id}" datatype="html">\n` +
                `        <source>${source}</source>\n` +
                (target === undefined ? '' : `        <target>${target}</target>\n`) +
                `      </trans-unit>`
        )
        .join('\n');
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">\n' +
        `  <file source-language="${sourceLanguage}"${
            targetLanguage ? ` target-language="${targetLanguage}"` : ''
        } datatype="plaintext" original="ng2.template">\n` +
        '    <body>\n' +
        `${body}\n` +
        '    </body>\n' +
        '  </file>\n' +
        '</xliff>\n'
    );
}

describe('i18n merge', () => {
    let root;

    before(() => {
        console.debug = () => undefined;
        root = fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-merge-'));
        fs.mkdirSync(path.join(root, 'src/locale'), { recursive: true });
        fs.writeFileSync(
            path.join(root, 'angular.json'),
            JSON.stringify({ projects: { 'app-eda': { i18n: { sourceLocale: 'es', locales: { ca: {}, en: {} } } } } })
        );
    });

    after(() => {
        fs.rmSync(root, { recursive: true, force: true });
    });

    function write(prefix, locale, contents) {
        fs.writeFileSync(path.join(root, 'src/locale', `${prefix}${locale}.xlf`), contents);
    }

    function clearLocale(locale) {
        for (const prefix of ['messages.', 'custom_messages.']) {
            fs.rmSync(path.join(root, 'src/locale', `${prefix}${locale}.xlf`), { force: true });
        }
    }

    function merge(locale = 'ca') {
        return processLocale({ projectRoot: root, locale, sourceLocale: 'es' });
    }

    it('reads the locales declared in angular.json', () => {
        const config = readI18nConfig(root);
        assert.equal(config.sourceLocale, 'es');
        assert.deepEqual(config.locales, ['ca', 'en']);
    });

    it('falls back to the language of the code when angular.json has no sourceLocale', () => {
        const file = path.join(root, 'angular.json');
        const original = fs.readFileSync(file, 'utf8');
        try {
            fs.writeFileSync(
                file,
                JSON.stringify({ projects: { 'app-eda': { i18n: { locales: { es: {}, ca: {} } } } } })
            );
            const config = readI18nConfig(root);
            assert.equal(config.sourceLocale, 'es');
            assert.deepEqual(config.locales, ['es', 'ca']);
        } finally {
            fs.writeFileSync(file, original);
        }
    });

    it('produces nothing when the locale has no xlf at all', () => {
        clearLocale('ca');
        const report = merge();
        assert.equal(report.status, 'skipped');
        assert.ok(report.issues.some((item) => item.code === 'locale-missing'));
    });

    it('writes the catalog as the merged output', () => {
        clearLocale('ca');
        write('messages.', 'ca', xliff({ sourceLanguage: 'es', targetLanguage: 'ca', units: { saludo: { source: 'Hola', target: 'Hola!' } } }));

        const report = merge();
        assert.equal(report.status, 'merged');
        assert.match(report.content, /<target>Hola!<\/target>/);
        assert.equal(report.counts.catalog, 1);
    });

    it('lets the custom target win over the catalog', () => {
        clearLocale('ca');
        write('messages.', 'ca', xliff({ sourceLanguage: 'es', targetLanguage: 'ca', units: { saludo: { source: 'Hola', target: 'Hola base' } } }));
        write(
            'custom_messages.',
            'ca',
            xliff({ sourceLanguage: 'es', targetLanguage: 'ca', units: { saludo: { source: 'Hola', target: 'Hola custom' } } })
        );

        const report = merge();
        assert.match(report.content, /<target>Hola custom<\/target>/);
        assert.doesNotMatch(report.content, /Hola base/);
        assert.equal(report.counts.custom, 1);
    });

    it('appends a custom unit the catalog does not declare', () => {
        clearLocale('ca');
        write('messages.', 'ca', xliff({ sourceLanguage: 'es', targetLanguage: 'ca', units: { saludo: { source: 'Hola', target: 'Hola!' } } }));
        write(
            'custom_messages.',
            'ca',
            xliff({ sourceLanguage: 'es', targetLanguage: 'ca', units: { extra: { source: 'Extra', target: 'Extra!' } } })
        );

        const report = merge();
        assert.match(report.content, /<trans-unit id="extra"/);
        assert.match(report.content, /<target>Extra!<\/target>/);
    });

    it('builds from the custom alone when there is no catalog', () => {
        clearLocale('ca');
        write('custom_messages.', 'ca', xliff({ sourceLanguage: 'es', targetLanguage: 'ca', units: { saludo: { source: 'Hola', target: 'Hola!' } } }));

        const report = merge();
        assert.equal(report.status, 'merged');
        assert.match(report.content, /<target>Hola!<\/target>/);
    });

    it('normalizes the generated header with the source and target locale', () => {
        clearLocale('ca');
        write('messages.', 'ca', xliff({ sourceLanguage: 'ca-ES', targetLanguage: '', units: { saludo: { source: 'Hola', target: 'Hola base' } } }));

        const report = merge();
        assert.match(
            report.content,
            /<file source-language="es" target-language="ca" datatype="plaintext" original="ng2.template">/
        );
        assert.ok(report.issues.some((item) => item.code === 'catalog-source-language'));
    });

    it('keeps only the first unit of a repeated id and reports it', () => {
        clearLocale('ca');
        write(
            'messages.',
            'ca',
            '<?xml version="1.0" encoding="UTF-8"?>\n' +
                '<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">\n' +
                '  <file source-language="es" datatype="plaintext" original="ng2.template">\n' +
                '    <body>\n' +
                '      <trans-unit id="saludo" datatype="html">\n        <source>Hola</source>\n        <target>Hola base</target>\n      </trans-unit>\n' +
                '      <trans-unit id="saludo" datatype="html">\n        <source>Hola</source>\n        <target>Hola duplicada</target>\n      </trans-unit>\n' +
                '    </body>\n  </file>\n</xliff>\n'
        );

        const report = merge();
        assert.equal((report.content.match(/<trans-unit\b/g) || []).length, 1);
        assert.ok(report.issues.some((item) => item.code === 'catalog-duplicate-id'));
    });

    it('reports a malformed catalog without breaking the run', () => {
        clearLocale('ca');
        write(
            'messages.',
            'ca',
            '<?xml version="1.0" encoding="UTF-8"?>\n' +
                '<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">\n' +
                '  <file source-language="es" datatype="plaintext" original="ng2.template">\n' +
                '    <body>\n      <trans-unit id="saludo" datatype="html">\n        <source>Hola</source>\n        <target>Hola base</target>\n' +
                '    </body>\n  </file>\n</xliff>\n'
        );

        const report = merge();
        assert.equal(report.status, 'skipped');
        assert.equal(report.content, null);
        assert.ok(report.issues.some((item) => item.code === 'catalog-message'));
    });
});
