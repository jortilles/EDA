import type { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Al terminar toda la ejecucion, imprime un resumen agrupado por area funcional
 * (deducida de la carpeta/archivo del test: tests/api/dashboards.spec.ts -> "api/dashboards")
 * con el detalle exacto de que fallo y por que, para que sea inmediato saber que
 * parte de la aplicacion tiene el problema sin tener que rebuscar en el reporte HTML.
 *
 * Tambien reubica los attachments (video/trace/screenshot) de cada test, que por
 * defecto Playwright deja en una carpeta por test con nombre hash ilegible
 * (p.ej. "admin-users-Administracion-...-chromium-e2e"): los mueve a
 * test-results/<area>/<nombre del test>.<ext>, agrupados por area y nombrados por
 * el test al que pertenecen.
 */
export default class SummaryReporter implements Reporter {
    private failures: { area: string; title: string; error: string; location: string }[] = [];
    private passed = 0;
    private skipped = 0;
    private flaky = 0;
    private readonly outputRoot = path.resolve(__dirname, '..', 'test-results');

    onTestEnd(test: TestCase, result: TestResult) {
        this.relocateAttachments(test, result);
        const area = this.areaOf(test);
        if (result.status === 'passed') {
            this.passed++;
            if (result.retry > 0) this.flaky++;
            return;
        }
        if (result.status === 'skipped') {
            this.skipped++;
            return;
        }
        const message = result.errors[0]?.message ?? result.error?.message ?? 'Fallo sin mensaje de error';
        this.failures.push({
            area,
            title: test.titlePath().slice(2).join(' > '),
            error: message.split('\n')[0].slice(0, 300),
            location: `${test.location.file}:${test.location.line}`,
        });
    }

    private areaOf(test: TestCase): string {
        const file = test.location.file.replace(/\\/g, '/');
        // Todo lo que cuelga de tests/ (api, e2e, fixtures) sirve de area; se usa
        // siempre una ruta relativa a tests/, nunca la ruta absoluta del fichero
        // (en Windows arrastraria el "C:" al nombre de carpeta y rompe el mkdir).
        const afterTests = file.split('/tests/')[1];
        if (!afterTests) return 'other';
        return afterTests.replace(/\.spec\.ts$/, '').replace(/\.ts$/, '');
    }

    private sanitize(name: string): string {
        const cleaned = name.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim();
        // Limite defensivo para no acercarse al tope de longitud de ruta de Windows
        // (260 caracteres) sumado al resto de la ruta (test-results/<area>/...).
        return cleaned.length > 180 ? cleaned.slice(0, 180) + '…' : cleaned;
    }

    private relocateAttachments(test: TestCase, result: TestResult) {
        // Todo lo que Playwright escribe para un test (video/trace/screenshot, mas
        // cualquier "attachments/" o carpeta propia de un recordVideo manual como en
        // global.setup.ts) siempre cuelga de UNA sola carpeta raiz por test, directa-
        // mente bajo outputRoot -- aunque algun attachment este mas anidado dentro.
        // Por eso la carpeta a limpiar al final es ese primer segmento, no el
        // dirname() literal de cada attachment.
        const originalDirs = new Set(
            result.attachments
                .map(a => a.path)
                .filter((p): p is string => !!p)
                .map(p => path.relative(this.outputRoot, p).split(path.sep)[0])
                .filter(segment => segment && segment !== '..')
                .map(segment => path.join(this.outputRoot, segment)),
        );
        if (originalDirs.size === 0) return;

        const destDir = path.join(this.outputRoot, ...this.areaOf(test).split('/'));
        fs.mkdirSync(destDir, { recursive: true });
        // titlePath() = ['', proyecto, fichero, ...describe(s), titulo]; el fichero
        // ya esta representado por la carpeta de area, asi que se descarta (slice 3).
        const baseName = this.sanitize(test.titlePath().slice(3).join(' - ')) +
            (result.retry > 0 ? ` (intento ${result.retry + 1})` : '');

        const countByType = new Map<string, number>();
        for (const attachment of result.attachments) {
            if (!attachment.path || !fs.existsSync(attachment.path)) continue;
            const ext = path.extname(attachment.path);
            const n = (countByType.get(attachment.name) ?? 0) + 1;
            countByType.set(attachment.name, n);
            const suffix = attachment.name === 'video' ? '' : n > 1 ? `-${attachment.name}-${n}` : `-${attachment.name}`;
            const destPath = path.join(destDir, `${baseName}${suffix}${ext}`);
            try {
                fs.renameSync(attachment.path, destPath);
                attachment.path = destPath;
            } catch {
                // Distinto volumen u otro problema puntual de FS: se deja en su ruta original.
            }
        }

        // La carpeta hash que crea Playwright por test ya no sirve una vez movidos los
        // attachments que nos interesan: se borra entera, incluido cualquier resto sin
        // adjuntar (p.ej. el video "crudo" que global.setup.ts graba con su propio
        // recordVideo antes de que Playwright copie el attachment real a otro sitio).
        for (const dir of originalDirs) {
            try {
                fs.rmSync(dir, { recursive: true, force: true });
            } catch {
                // No existe o esta en uso: no hay nada que limpiar.
            }
        }
    }

    onEnd(result: FullResult) {
        const total = this.passed + this.failures.length + this.skipped;
        console.log('\n' + '='.repeat(78));
        console.log(' RESUMEN DE LA SUITE EDA (API + navegador)');
        console.log('='.repeat(78));
        console.log(` Total: ${total}   OK: ${this.passed}   Fallidos: ${this.failures.length}   Omitidos: ${this.skipped}   Inestables (retry): ${this.flaky}`);
        console.log(` Resultado global: ${result.status.toUpperCase()}`);

        if (this.failures.length === 0) {
            console.log('\n Todo correcto: no se ha encontrado ningun fallo. ✅');
            console.log('='.repeat(78) + '\n');
            return;
        }

        const byArea = new Map<string, typeof this.failures>();
        for (const f of this.failures) {
            if (!byArea.has(f.area)) byArea.set(f.area, []);
            byArea.get(f.area)!.push(f);
        }

        console.log('\n FALLOS POR AREA:\n');
        for (const [area, items] of [...byArea.entries()].sort()) {
            console.log(` ✖ ${area} (${items.length})`);
            for (const item of items) {
                console.log(`    - ${item.title}`);
                console.log(`      ${item.error}`);
                console.log(`      ${item.location}`);
            }
        }
        console.log('\n Informe HTML detallado: npx playwright show-report (desde eda/testing)');
        console.log('='.repeat(78) + '\n');
    }
}
