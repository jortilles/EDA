import type { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';

/**
 * Al terminar toda la ejecucion, imprime un resumen agrupado por area funcional
 * (deducida de la carpeta/archivo del test: tests/api/dashboards.spec.ts -> "api/dashboards")
 * con el detalle exacto de que fallo y por que, para que sea inmediato saber que
 * parte de la aplicacion tiene el problema sin tener que rebuscar en el reporte HTML.
 */
export default class SummaryReporter implements Reporter {
    private failures: { area: string; title: string; error: string; location: string }[] = [];
    private passed = 0;
    private skipped = 0;
    private flaky = 0;

    onTestEnd(test: TestCase, result: TestResult) {
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
        const match = file.match(/tests\/(api|e2e)\/([^/]+)\.spec\.ts$/);
        return match ? `${match[1]}/${match[2]}` : file;
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
