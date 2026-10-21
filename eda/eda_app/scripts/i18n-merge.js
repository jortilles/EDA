'use strict';

const fs = require('fs');
const path = require('path');

const { processLocale, readI18nConfig } = require('./lib/i18n-merge');

/**
 * CLI for the localization layer.
 *
 *   node scripts/i18n-merge.js                    merge every locale declared in angular.json
 *   node scripts/i18n-merge.js --locale=ca        merge a single locale
 *   node scripts/i18n-merge.js --check            validate only, write nothing, fail on any issue
 *
 * The merge combines the hand-maintained xlf files of each locale (catalog +
 * custom) and writes `src/locale/merged`. A message missing from every xlf is
 * left out, so Angular falls back to the source text of the code. `--check`
 * writes nothing and exits non zero as soon as anything is wrong.
 */

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

function parseArgs(argv) {
    const options = { check: false, debug: false, locales: [], help: false };
    for (const arg of argv) {
        if (arg === '--check') {
            options.check = true;
        } else if (arg === '--debug') {
            options.debug = true;
        } else if (arg === '--help' || arg === '-h') {
            options.help = true;
        } else if (arg.startsWith('--locale=')) {
            options.locales.push(arg.slice('--locale='.length));
        } else {
            throw new Error(`Unknown argument: ${arg}`);
        }
    }
    return options;
}

function usage() {
    console.log('Usage: node scripts/i18n-merge.js [--check] [--debug] [--locale=<locale>]');
    console.log('  --check             validate only, write nothing, exit 1 on any issue');
    console.log('  --debug             keep the verbose trace of the underlying merge');
    console.log('  --locale=<id>       restrict the run to a single locale (repeatable)');
}

function formatCounts(counts) {
    const parts = [];
    if (counts.source !== undefined) {
        parts.push(`source ${counts.source}`);
    }
    for (const key of ['base', 'catalog', 'custom', 'overridden', 'customOnly', 'baseOnly', 'dropped', 'kept', 'reset', 'added', 'removed']) {
        if (counts[key] !== undefined && counts[key] !== 0) {
            parts.push(`${key} ${counts[key]}`);
        }
    }
    return parts.length ? parts.join(' | ') : 'nothing to merge';
}

function printReport(report, projectRoot) {
    const output = path.relative(projectRoot, report.outputPath);
    if (report.status === 'merged') {
        console.log(`  ${GREEN}✓${RESET} ${report.locale} -> ${output}`);
        console.log(`      ${BLUE}${formatCounts(report.counts)}${RESET}`);
    } else {
        console.log(`  ${RED}✗${RESET} ${report.locale} ${RED}(no output)${RESET}`);
    }
    for (const issue of report.issues) {
        const marker = issue.level === 'error' ? `${RED}✗${RESET}` : `${YELLOW}⚠${RESET}`;
        console.log(`      ${marker} ${issue.code}: ${issue.message}`);
    }
}

function main() {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
        usage();
        return 0;
    }

    const projectRoot = path.join(__dirname, '..');
    const config = readI18nConfig(projectRoot);
    const locales = options.locales.length ? options.locales : config.locales;

    if (!options.debug) {
        console.debug = () => undefined;
    }

    console.log(
        `${BLUE}=====${RESET} i18n ${options.check ? 'check' : 'merge'} ${RESET}${config.projectName}${RESET} | source locale ${GREEN}${config.sourceLocale}${RESET} | ${locales.join(', ')}`
    );

    const reports = locales.map((locale) =>
        processLocale({
            projectRoot,
            locale,
            sourceLocale: config.sourceLocale,
        })
    );
    for (const report of reports) {
        printReport(report, projectRoot);
    }

    if (!options.check) {
        for (const report of reports) {
            if (report.status === 'merged') {
                fs.mkdirSync(path.dirname(report.outputPath), { recursive: true });
                fs.writeFileSync(report.outputPath, report.content, 'utf8');
            }
        }
    }

    const issues = reports.flatMap((report) => report.issues);
    const errors = issues.filter((issue) => issue.level === 'error');
    const warnings = issues.filter((issue) => issue.level === 'warning');
    const merged = reports.filter((report) => report.status === 'merged').length;

    console.log(
        `${BLUE}=====${RESET} ${merged}/${reports.length} locale(s) merged | ${RED}${errors.length} error(s)${RESET} | ${YELLOW}${warnings.length} warning(s)${RESET} ${BLUE}=====${RESET}`
    );
    if (!options.check && issues.length) {
        console.log(
            `${YELLOW}⚠${RESET} Issues do not block the build here, run ${GREEN}npm run i18n:check${RESET} to fail on them`
        );
    }

    return options.check && issues.length ? 1 : 0;
}

try {
    process.exitCode = main();
} catch (error) {
    console.error(`${RED}✗${RESET} ${error.message}`);
    process.exitCode = 1;
}
