import type { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';

/**
 * ffmpeg es completamente OPCIONAL (ver scripts/setup-ffmpeg.js, `npm run
 * setup:ffmpeg`): si no esta instalado en .tools/ffmpeg/, simplemente no se
 * recortan los videos y la suite funciona exactamente igual que sin el.
 */
function findCachedFfmpeg(): string | null {
    const dir = path.resolve(__dirname, '..', '.tools', 'ffmpeg');
    if (!fs.existsSync(dir)) return null;
    const stack = [dir];
    while (stack.length) {
        const current = stack.pop()!;
        for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
            const full = path.join(current, entry.name);
            if (entry.isDirectory()) stack.push(full);
            else if (entry.name.toLowerCase() === 'ffmpeg.exe') return full;
        }
    }
    return null;
}

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
    // Recuento por area (cada archivo .spec.ts), para el desglose "que grupos de
    // test pasan y cuales no" al final -- a diferencia de `failures`, esto se
    // rellena SIEMPRE, tambien cuando todo pasa, para poder mostrar la tabla
    // completa en vez de solo los fallos.
    private readonly byArea = new Map<string, { passed: number; failed: number; skipped: number }>();
    private readonly outputRoot = path.resolve(__dirname, '..', 'test-results');
    private readonly ffmpegPath = findCachedFfmpeg();

    onTestEnd(test: TestCase, result: TestResult) {
        this.relocateAttachments(test, result);
        const area = this.areaOf(test);
        if (!this.byArea.has(area)) this.byArea.set(area, { passed: 0, failed: 0, skipped: 0 });
        const counts = this.byArea.get(area)!;

        if (result.status === 'passed') {
            this.passed++;
            counts.passed++;
            if (result.retry > 0) this.flaky++;
            return;
        }
        if (result.status === 'skipped') {
            this.skipped++;
            counts.skipped++;
            return;
        }
        counts.failed++;
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

    /**
     * Recorta los primeros ~3s de un video (el arranque real de Angular en modo
     * dev, ~5s, queda en ~2s de "pantalla en blanco" visible) usando el ffmpeg
     * cacheado por `npm run setup:ffmpeg` (ver findCachedFfmpeg()). Si no esta
     * instalado, no hace nada -- es una mejora opcional de revision, no un
     * requisito para que la suite funcione. Falla en silencio ante cualquier
     * error de ffmpeg (p.ej. un video demasiado corto para recortar 3s): se
     * conserva el video original sin tocar antes que perderlo.
     */
    private trimVideoStart(videoPath: string, seconds = 3) {
        if (!this.ffmpegPath) return;
        const trimmedPath = videoPath + '.trimmed.webm';
        try {
            execFileSync(this.ffmpegPath, [
                '-y', '-ss', String(seconds), '-i', videoPath,
                '-c:v', 'libvpx', '-c:a', 'libvorbis',
                trimmedPath,
            ], { stdio: 'ignore' });
            fs.renameSync(trimmedPath, videoPath);
        } catch {
            try { fs.rmSync(trimmedPath, { force: true }); } catch { /* no habia nada que limpiar */ }
        }
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
            // Las capturas NO se quieren como archivo suelto en test-results/ (solo
            // los videos) -- el informe HTML (`npx playwright show-report`) ya hace
            // su PROPIA copia independiente de cada captura en playwright-report/data/
            // antes de que este reporter se ejecute (el reporter "html" va declarado
            // antes que este en playwright.config.ts), asi que sigue viendose ahi sin
            // tocar nada; aqui simplemente no se relocaliza y se deja que la limpieza
            // de mas abajo se lleve el original con el resto de la carpeta hash.
            if (attachment.name === 'screenshot') continue;
            const ext = path.extname(attachment.path);
            const n = (countByType.get(attachment.name) ?? 0) + 1;
            countByType.set(attachment.name, n);
            const suffix = attachment.name === 'video' ? '' : n > 1 ? `-${attachment.name}-${n}` : `-${attachment.name}`;
            const destPath = path.join(destDir, `${baseName}${suffix}${ext}`);
            try {
                fs.renameSync(attachment.path, destPath);
                attachment.path = destPath;
                if (attachment.name === 'video') this.trimVideoStart(destPath);
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

        // Tabla por area SIEMPRE (tambien si todo pasa): que "grupos" de test
        // (un area = un archivo .spec.ts, p.ej. "e2e/context-menu/panel-lock") pasan
        // y cuales no, de un vistazo, sin tener que leer el listado completo de
        // arriba linea por linea.
        console.log('\n POR GRUPO (cada area = un archivo .spec.ts):\n');
        const areaNameWidth = Math.min(60, Math.max(...[...this.byArea.keys()].map(a => a.length), 10));
        for (const [area, counts] of [...this.byArea.entries()].sort()) {
            const totalArea = counts.passed + counts.failed + counts.skipped;
            const mark = counts.failed > 0 ? '✖' : '✓';
            const skippedNote = counts.skipped > 0 ? `, ${counts.skipped} omitidos` : '';
            console.log(` ${mark} ${area.padEnd(areaNameWidth)}  ${counts.passed}/${totalArea} OK${skippedNote}`);
        }

        if (this.failures.length === 0) {
            console.log('\n Todo correcto: no se ha encontrado ningun fallo. ✅');
            console.log('='.repeat(78) + '\n');
            return;
        }

        const byAreaFailures = new Map<string, typeof this.failures>();
        for (const f of this.failures) {
            if (!byAreaFailures.has(f.area)) byAreaFailures.set(f.area, []);
            byAreaFailures.get(f.area)!.push(f);
        }

        console.log('\n DETALLE DE LOS FALLOS:\n');
        for (const [area, items] of [...byAreaFailures.entries()].sort()) {
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
