/**
 * Descarga (si hace falta) un build portable de ffmpeg (Windows, "essentials",
 * gyan.dev) en eda/testing/.tools/ffmpeg/ -- un solo .zip, sin instalador, nada
 * de registro ni dependencias del sistema. Totalmente OPCIONAL: ningun test ni
 * el reporter dependen de que exista -- solo habilita el recorte de los primeros
 * segundos de cada video (ver utils/summary-reporter.ts), que se omite en
 * silencio si ffmpeg no esta disponible.
 *
 * Uso: npm run setup:ffmpeg
 * Para quitarlo: borra eda/testing/.tools/ (no esta en git, ver .gitignore).
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const { execFileSync } = require('child_process');

const TOOLS_DIR = path.resolve(__dirname, '..', '.tools');
const ZIP_PATH = path.join(TOOLS_DIR, 'ffmpeg.zip');
const EXTRACT_DIR = path.join(TOOLS_DIR, 'ffmpeg');
const DOWNLOAD_URL = 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip';

function download(url, destPath, redirectsLeft = 5) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destPath);
        https.get(url, (res) => {
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                file.close();
                fs.unlinkSync(destPath);
                if (redirectsLeft <= 0) return reject(new Error('Demasiadas redirecciones'));
                return resolve(download(res.headers.location, destPath, redirectsLeft - 1));
            }
            if (res.statusCode !== 200) {
                file.close();
                return reject(new Error(`Descarga fallida: HTTP ${res.statusCode}`));
            }
            const total = Number(res.headers['content-length'] || 0);
            let downloaded = 0;
            let lastPct = -1;
            res.on('data', (chunk) => {
                downloaded += chunk.length;
                if (total) {
                    const pct = Math.floor((downloaded / total) * 100);
                    if (pct !== lastPct && pct % 10 === 0) {
                        process.stdout.write(`  descargando ffmpeg... ${pct}%\n`);
                        lastPct = pct;
                    }
                }
            });
            res.pipe(file);
            file.on('finish', () => file.close(() => resolve(undefined)));
        }).on('error', reject);
    });
}

function findFfmpegExe(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            const found = findFfmpegExe(full);
            if (found) return found;
        } else if (entry.name.toLowerCase() === 'ffmpeg.exe') {
            return full;
        }
    }
    return null;
}

async function main() {
    const existing = fs.existsSync(EXTRACT_DIR) ? findFfmpegExe(EXTRACT_DIR) : null;
    if (existing) {
        console.log(`ffmpeg ya esta instalado en: ${existing}`);
        return;
    }

    fs.mkdirSync(TOOLS_DIR, { recursive: true });
    console.log(`Descargando ffmpeg portable desde ${DOWNLOAD_URL} ...`);
    await download(DOWNLOAD_URL, ZIP_PATH);

    console.log('Extrayendo...');
    fs.mkdirSync(EXTRACT_DIR, { recursive: true });
    execFileSync('powershell.exe', [
        '-NoProfile', '-Command',
        `Expand-Archive -Path "${ZIP_PATH}" -DestinationPath "${EXTRACT_DIR}" -Force`,
    ], { stdio: 'inherit' });
    fs.unlinkSync(ZIP_PATH);

    const exePath = findFfmpegExe(EXTRACT_DIR);
    if (!exePath) throw new Error('No se encontro ffmpeg.exe tras extraer el zip');
    console.log(`Listo: ${exePath}`);
}

main().catch((err) => {
    console.error('No se pudo instalar ffmpeg:', err.message);
    console.error('Esto no bloquea el testing -- es opcional, solo deja de recortarse el arranque en los videos.');
    process.exit(1);
});
