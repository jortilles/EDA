'use strict';

/**
 * @sweetalert2/ngx-sweetalert2@13.0.0's bundled .d.ts references `Swal.DismissReason` as a type,
 * but the `sweetalert2` version we depend on (11.26.20, pinned in package.json) exports
 * `DismissReason` as a top-level module export rather than as a member of the `Swal` namespace,
 * so `Swal.DismissReason` is not a valid type there anymore. That breaks type-checking
 * (TS2749) for anyone who compiles with lib checking enabled (e.g. a CI/server build), even
 * though it's silently skipped by Angular's esbuild dev builder locally.
 *
 * Nothing in this app uses the <swal> component/directive's typed `dismiss` Output (we only call
 * `Swal.fire()` imperatively), so it's safe to drop that declaration. This runs on every
 * `npm install` (see the `postinstall` script) so the fix survives a fresh install anywhere,
 * instead of relying on a manual, unreproducible edit inside node_modules.
 */

const fs = require('fs');
const path = require('path');

const TARGETS = [
    path.join(__dirname, '../node_modules/@sweetalert2/ngx-sweetalert2/lib/swal.component.d.ts'),
    path.join(__dirname, '../node_modules/@sweetalert2/ngx-sweetalert2/lib/swal.directive.d.ts'),
];

const LINE = /^(\s*)readonly dismiss: EventEmitter<Swal\.DismissReason \| undefined>;\s*$/m;

for (const file of TARGETS) {
    if (!fs.existsSync(file)) {
        console.warn(`\x1b[33m⚠\x1b[0m patch-ngx-sweetalert2-types: not found, skipping: ${file}`);
        continue;
    }

    const content = fs.readFileSync(file, 'utf8');

    if (content.includes('//readonly dismiss: EventEmitter<Swal.DismissReason | undefined>;')) {
        console.log(`\x1b[32m✓\x1b[0m patch-ngx-sweetalert2-types: already patched: ${path.basename(file)}`);
        continue;
    }

    if (!LINE.test(content)) {
        console.warn(`\x1b[33m⚠\x1b[0m patch-ngx-sweetalert2-types: expected line not found (package may have changed) in: ${path.basename(file)}`);
        continue;
    }

    const patched = content.replace(LINE, '$1//readonly dismiss: EventEmitter<Swal.DismissReason | undefined>;');
    fs.writeFileSync(file, patched, 'utf8');
    console.log(`\x1b[32m✓\x1b[0m patch-ngx-sweetalert2-types: patched ${path.basename(file)}`);
}
