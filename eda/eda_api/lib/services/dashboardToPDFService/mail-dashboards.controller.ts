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
    senderEmail: string
  ) => {

    console.log(`[Dashboard] Iniciando envío | dashboard: ${dashboard} | destinatario: ${userMail}`);

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
      const loginUrl = `${serverConfig.server_apiURL}/admin/user/fake-login/${userMail}/${token}`;
      console.log(`[Dashboard] Login URL: ${loginUrl}`);
      const loginContext = await browser.newContext();
      const loginPage = await loginContext.newPage();

      let authToken: string | null = null;
      let authUser: object | null = null;

      loginPage.on('response', async (response: any) => {
        try {
          const contentType = response.headers()['content-type'] || '';
          if (!contentType.includes('application/json')) return;
          const body = await response.json();
          if (body?.token && body?.user?._id) {
            authToken = body.token;
            authUser = body.user;
          }
        } catch (_) { /* ignore non-JSON responses */ }
      });

      await loginPage.goto(loginUrl, { waitUntil: 'networkidle' });
      await loginContext.close();

      if (!authToken || !authUser) {
        throw new Error(`[Dashboard] No se pudo obtener token para ${userMail}`);
      }
      console.log(`[Dashboard] Token obtenido para ${userMail}`);

      // 2. Open dashboard with credentials pre-injected into localStorage
      const dashboardContext = await browser.newContext({ deviceScaleFactor: 2 });

      await dashboardContext.addInitScript(({ t, u }: any) => {
        localStorage.setItem('token', t);
        localStorage.setItem('user', JSON.stringify(u));
        localStorage.setItem('id', (u as any)._id);
      }, { t: authToken, u: authUser });

      const page = await dashboardContext.newPage();
      await page.setViewportSize({ width: 1380, height: 900 });

      const baseURL = serverConfig.server_baseURL.replace(/\/?$/, '/');
      const dashboardUrl = `${baseURL}#/dashboard/${dashboard}`;
      console.log(`[Dashboard] Navegando a: ${dashboardUrl}`);

      await page.goto(dashboardUrl, { waitUntil: 'networkidle', timeout: 60000 });
      console.log(`[Dashboard] Página cargada`);

      // 3. Wait for all panel spinners to disappear (max 90 s)
      await page.waitForFunction(
        () => document.querySelectorAll('.spinner-panel').length === 0,
        { timeout: 90000, polling: 1000 }
      );
      console.log(`[Dashboard] Spinners desaparecidos`);

      // Extra pause so charts finish painting (canvas / SVG flush)
      await page.waitForTimeout(2000);

      // 4. Get the dashboard element dimensions in CSS pixels
      const element = await page.$('#myDashboard');
      if (!element) throw new Error('[Dashboard] Elemento #myDashboard no encontrado en la página');

      const box = await element.boundingBox();
      if (!box) throw new Error('[Dashboard] No se pudo obtener bounding box de #myDashboard');
      const cssWidth  = box.width;
      const cssHeight = box.height;
      console.log(`[Dashboard] Dimensiones: ${cssWidth}x${cssHeight} CSS px`);

      // 5. Capture element screenshot at 2x resolution (deviceScaleFactor: 2)
      const screenshotBuffer = await element.screenshot({ type: 'jpeg', quality: 100 });
      console.log(`[Dashboard] Screenshot capturado (${screenshotBuffer.length} bytes)`);

      // Physical pixel dimensions (CSS * deviceScaleFactor)
      const physicalWidth  = Math.round(cssWidth  * 2);
      const physicalHeight = Math.round(cssHeight * 2);

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
            doc.rect(0, 0, A4_WIDTH_PT, A4_HEIGHT_PT).fill('white');
            doc.image(sliceBuffer, 0, 0, { width: A4_WIDTH_PT });

            position += sliceHeight;
          }

          doc.end();
        };

        buildPages().catch(reject);
      });

      console.log(`[Dashboard] PDF generado: ${filename}`);

      // 7. Send the email with the generated PDF attached
      const link = `${baseURL}#/dashboard/${dashboard}`;
      MailingService.mailDashboardSending(userMail, filename, filepath, transporter, message, link, senderEmail);
      console.log(`[Dashboard] Email enviado a ${userMail}`);

    } catch (err: any) {
      console.error(`[Dashboard] ERROR en sendDashboard (${dashboard} → ${userMail}): ${err.message}`);
      throw err;
    } finally {
      if (browser) await browser.close();
    }
  };
}
