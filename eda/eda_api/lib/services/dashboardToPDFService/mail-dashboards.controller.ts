import { MailingService } from "../mailingService/mailing.service";
import { chromium } from 'playwright';
import PDFDocument = require('pdfkit');
import sharp = require('sharp');
import * as fs from 'fs';
import * as path from 'path';

const serverConfig = require('../../../config/mailing.config');

// A4 dimensions in PDF points (72pt = 1 inch)
const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;

export class MailDashboardsController {

  static sendDashboard = async (
    dashboard: string,
    userMail: string,
    transporter: any,
    message: string,
    token: string,
    senderEmail: string,
    subject: string = '',
    aiText: string = '',
    loginMail: string = ''
  ) => {

    // Render identity (resolved by the caller): the recipient, or a fallback when they're not
    // an app user. The email is still delivered to `userMail`.
    const renderMail = loginMail || userMail;
    console.log(`[Dashboard] Iniciando envío | dashboard: ${dashboard} | destinatario: ${userMail}${renderMail !== userMail ? ` | render como: ${renderMail}` : ''}`);

    let browser: any;
    try {
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      console.log(`[Dashboard] Chromium lanzado`);
    } catch (err: any) {
      console.error(`[Dashboard] ERROR lanzando Chromium:`, err.message);
      throw err;
    }

    try {
      // 1. Obtain a real JWT via fake-login
      const loginUrl = `${serverConfig.server_apiURL}/admin/user/fake-login/${renderMail}/${token}`;
      const loginContext = await browser.newContext();
      const loginPage = await loginContext.newPage();

      let authToken: string | null = null;
      let authUser: object | null = null;
      let loginFailureDetail: string | null = null;

      loginPage.on('response', async (response: any) => {
        if (!response.url().includes('/admin/user/fake-login/')) return;
        try {
          const contentType = response.headers()['content-type'] || '';
          if (!contentType.includes('application/json')) {
            loginFailureDetail = `status ${response.status()}, content-type: ${contentType}`;
            return;
          }
          const body = await response.json();
          if (body?.token && body?.user?._id) {
            authToken = body.token;
            authUser = body.user;
          } else {
            loginFailureDetail = `status ${response.status()}, body: ${JSON.stringify(body)}`;
          }
        } catch (err: any) { loginFailureDetail = `error reading response: ${err.message}`; }
      });

      await loginPage.goto(loginUrl, { waitUntil: 'networkidle' });
      await loginContext.close();

      if (!authToken || !authUser) {
        throw new Error(`[Dashboard] No se pudo obtener token para ${renderMail}${loginFailureDetail ? ` (${loginFailureDetail})` : ''}`);
      }
      console.log(`[Dashboard] Token obtenido para ${renderMail}`);

      // 2. Open dashboard with credentials pre-injected into localStorage
      const dashboardContext = await browser.newContext({ deviceScaleFactor: 2 });

      await dashboardContext.addInitScript(({ t, u }: any) => {
        localStorage.setItem('token', t);
        localStorage.setItem('user', JSON.stringify(u));
        localStorage.setItem('id', (u as any)._id);
      }, { t: authToken, u: authUser });

      const page = await dashboardContext.newPage();
      await page.setViewportSize({ width: 1380, height: 900 });

      // Surface render failures inside the headless dashboard (JS crash / failed API call).
      page.on('pageerror', (err: any) => console.error(`[Dashboard][browser:pageerror] ${err?.message || err}`));
      page.on('response', (res: any) => {
        const url = res.url();
        if (res.status() >= 400 && /\/(dashboard|datasource|query|execquery|admin\/user)/i.test(url)) {
          console.warn(`[Dashboard][browser:http ${res.status()}] ${url}`);
        }
      });

      // Navigate straight to the locale-prefixed hash URL — the root index.html does a client-side
      // locale redirect that breaks hash-based deep links. The pdfExport query param (read in main.ts,
      // before the hash so it survives Angular's routing) disables chart entrance animations, otherwise
      // the screenshot below can be taken mid-transition, leaving panels blank/partial in the PDF.
      const dashboardUrl = MailingService.dashboardAppUrl(dashboard, '?pdfExport=true');
      console.log(`[Dashboard] Navegando a: ${dashboardUrl}`);

      await page.goto(dashboardUrl, { waitUntil: 'networkidle', timeout: 60000 });
      console.log(`[Dashboard] Página cargada`);

      // 3a. Wait for panels to mount before the "no spinners" check — otherwise it passes
      // instantly on the "Cargando informe..." screen (0 panels -> 0 spinners).
      const panelsMounted = () => page.waitForFunction(
        () => (document.querySelectorAll('#myDashboard gridster-item') || []).length > 0,
        { timeout: 45000, polling: 500 }
      ).then(() => true).catch(() => false);

      let panelsUp = await panelsMounted();

      // Fallback: if the dashboard never mounts, the ?pdfExport=true param may not be handled by
      // this frontend build — retry once on the plain URL.
      if (!panelsUp) {
        const fallbackUrl = MailingService.dashboardAppUrl(dashboard);
        console.warn(`[Dashboard] no montó con pdfExport, reintento sin el param: ${fallbackUrl}`);
        await page.goto(fallbackUrl, { waitUntil: 'networkidle', timeout: 60000 });
        panelsUp = await panelsMounted();
      }
      console.log(`[Dashboard] Paneles montados: ${panelsUp}`);

      // 3b. Give panels a moment to start their queries, then wait for every panel spinner to clear.
      await page.waitForTimeout(1500);
      await page.waitForFunction(
        () => document.querySelectorAll('.spinner-panel').length === 0,
        { timeout: 90000, polling: 1000 }
      ).catch(() => console.warn(`[Dashboard] spinners no despejados tras 90s, capturo igual`));
      console.log(`[Dashboard] Spinners desaparecidos`);

      // Extra pause so charts finish painting (canvas / SVG flush)
      await page.waitForTimeout(2500);

      // 4. Get the dashboard element dimensions in CSS pixels
      const element = await page.$('#myDashboard');
      if (!element) throw new Error('[Dashboard] Elemento #myDashboard no encontrado en la página');

      // #myDashboard is transparent — the real background sits on an ancestor. Resolve it, paint
      // it onto #myDashboard (so the screenshot isn't white in the empty grid area) and reuse it
      // for the last PDF page. Also get the last panel's bottom to trim the empty grid tail.
      const meta: { bgColor: string; contentBottom: number } = await page.evaluate(() => {
        const solid = (el: Element | null): string => {
          if (!el) return '';
          const c = getComputedStyle(el).backgroundColor;
          return (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') ? c : '';
        };
        const dash = document.querySelector('#myDashboard') as HTMLElement | null;
        let raw = solid(dash?.querySelector('[class*="p-3"]') || null);
        for (let el: Element | null = dash; el && !raw; el = el.parentElement) raw = solid(el);
        raw = raw || solid(document.body) || 'rgb(255, 255, 255)';
        if (dash) dash.style.backgroundColor = raw;
        const m = raw.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
        const hex = (n: string) => (+n).toString(16).padStart(2, '0');
        const bgColor = m ? `#${hex(m[1])}${hex(m[2])}${hex(m[3])}` : '#ffffff';

        const dashTop = dash?.getBoundingClientRect().top ?? 0;
        let contentBottom = 0;
        (dash?.querySelectorAll('gridster-item') || []).forEach((it: Element) => {
          contentBottom = Math.max(contentBottom, it.getBoundingClientRect().bottom - dashTop);
        });
        return { bgColor, contentBottom };
      });
      const bgColor = meta.bgColor;

      const box = await element.boundingBox();
      if (!box) throw new Error('[Dashboard] No se pudo obtener bounding box de #myDashboard');
      const cssWidth  = box.width;
      // Trim the empty grid tail below the last panel so the PDF has no big blank band.
      const cssHeight = meta.contentBottom > 0 && meta.contentBottom + 24 < box.height
        ? Math.ceil(meta.contentBottom + 24)
        : box.height;
      console.log(`[Dashboard] Dimensiones: ${cssWidth}x${cssHeight} CSS px`);

      // 5. Capture element screenshot at 2x resolution (deviceScaleFactor: 2), then trim to content
      const rawScreenshot = await element.screenshot({ type: 'jpeg', quality: 100 });
      let physicalWidth  = Math.round(cssWidth  * 2);
      let physicalHeight = Math.round(cssHeight * 2);
      let screenshotBuffer = rawScreenshot;
      if (cssHeight < box.height) {
        try {
          const m = await sharp(rawScreenshot).metadata();
          physicalWidth = m.width || physicalWidth;
          physicalHeight = Math.min(physicalHeight, m.height || physicalHeight);
          screenshotBuffer = await sharp(rawScreenshot)
            .extract({ left: 0, top: 0, width: physicalWidth, height: physicalHeight })
            .jpeg({ quality: 100 }).toBuffer();
        } catch (e: any) {
          console.warn(`[Dashboard] no se pudo recortar el screenshot: ${e?.message || e}`);
          screenshotBuffer = rawScreenshot;
          physicalHeight = Math.round(box.height * 2);
        }
      }
      console.log(`[Dashboard] Screenshot capturado (${screenshotBuffer.length} bytes)`);

      // 6. Create multi-page A4 PDF
      const ratio             = A4_WIDTH_PT / cssWidth;
      const pageHeightCSS     = A4_HEIGHT_PT / ratio;
      const pageHeightPhysical = Math.floor(pageHeightCSS * 2);

      const filename = `${dashboard}_${userMail}.pdf`;
      const filepath = __dirname;
      const fullPath = path.join(filepath, filename);

      await new Promise<void>((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: false });
        const writeStream = fs.createWriteStream(fullPath);
        doc.pipe(writeStream);
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);

        const buildPages = async () => {
          let position = 0;

          while (position < physicalHeight) {
            const sliceHeight = Math.min(pageHeightPhysical, physicalHeight - position);

            const sliceBuffer = await sharp(screenshotBuffer)
              .extract({ left: 0, top: position, width: physicalWidth, height: sliceHeight })
              .jpeg({ quality: 100 })
              .toBuffer();

            doc.addPage();
            doc.rect(0, 0, A4_WIDTH_PT, A4_HEIGHT_PT).fill(bgColor);
            doc.image(sliceBuffer, 0, 0, { width: A4_WIDTH_PT });

            position += sliceHeight;
          }

          doc.end();
        };

        buildPages().catch(reject);
      });

      console.log(`[Dashboard] PDF generado: ${filename}`);

      // 7. Send the email: full report as the PDF attachment, plus a small preview inlined in the body.
      // The body image is width-clamped and height-cropped so the recipient doesn't scroll a wall of chart.
      const INLINE_WIDTH = 640;
      const INLINE_MAX_HEIGHT = 900;
      let inlineImage: Buffer;
      try {
        const scaled = await sharp(screenshotBuffer).resize({ width: INLINE_WIDTH, withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
        const meta = await sharp(scaled).metadata();
        inlineImage = (meta.height || 0) > INLINE_MAX_HEIGHT
          ? await sharp(scaled).extract({ left: 0, top: 0, width: meta.width || INLINE_WIDTH, height: INLINE_MAX_HEIGHT }).jpeg({ quality: 82 }).toBuffer()
          : scaled;
      } catch {
        inlineImage = screenshotBuffer;
      }

      // The email link is the plain dashboard URL — pdfExport is only for the screenshot render.
      const link = MailingService.dashboardAppUrl(dashboard);
      await MailingService.mailDashboardSending(userMail, filename, filepath, transporter, message, link, senderEmail, subject, inlineImage, aiText);
      console.log(`[Dashboard] Email procesado para ${userMail}`);

    } catch (err: any) {
      console.error(`[Dashboard] ERROR en sendDashboard (${dashboard} → ${userMail}): ${err.message}`);
      throw err;
    } finally {
      if (browser) await browser.close();
    }
  };
}
