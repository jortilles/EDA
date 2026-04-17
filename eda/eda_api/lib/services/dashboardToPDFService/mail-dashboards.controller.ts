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

    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      // 1. Obtain a real JWT via fake-login
      const loginUrl = `${serverConfig.server_apiURL}/admin/user/fake-login/${userMail}/${token}`;
      const loginContext = await browser.newContext();
      const loginPage = await loginContext.newPage();

      let authToken: string | null = null;
      let authUser: object | null = null;

      loginPage.on('response', async (response) => {
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
        throw new Error(`Could not obtain auth token for user ${userMail}`);
      }

      // 2. Open dashboard with credentials pre-injected into localStorage
      //    deviceScaleFactor: 2 matches the frontend's scale(2) transform in dom-to-image
      const dashboardContext = await browser.newContext({ deviceScaleFactor: 2 });

      await dashboardContext.addInitScript(({ t, u }) => {
        localStorage.setItem('token', t);
        localStorage.setItem('user', JSON.stringify(u));
        localStorage.setItem('id', (u as any)._id);
      }, { t: authToken, u: authUser });

      const page = await dashboardContext.newPage();
      await page.setViewportSize({ width: 1380, height: 900 });

      const baseURL = serverConfig.server_baseURL.replace(/\/?$/, '/');
      const dashboardUrl = `${baseURL}#/dashboard/${dashboard}`;
      await page.goto(dashboardUrl, { waitUntil: 'networkidle', timeout: 60000 });

      // 3. Wait for all panel spinners to disappear (max 90 s)
      await page.waitForFunction(
        () => document.querySelectorAll('.spinner-panel').length === 0,
        { timeout: 90000, polling: 1000 }
      );
      // Extra pause so charts finish painting (canvas / SVG flush)
      await page.waitForTimeout(2000);

      // 4. Get the dashboard element dimensions in CSS pixels
      const element = await page.$('#myDashboard');
      if (!element) throw new Error('Dashboard element #myDashboard not found in the page');

      const box = await element.boundingBox();
      if (!box) throw new Error('Could not get bounding box of #myDashboard');
      const cssWidth  = box.width;
      const cssHeight = box.height;

      // 5. Capture element screenshot at 2x resolution (deviceScaleFactor: 2)
      //    This is the equivalent of dom-to-image with height/width * 2 + scale(2)
      const screenshotBuffer = await element.screenshot({ type: 'jpeg', quality: 100 });

      // Physical pixel dimensions (CSS * deviceScaleFactor)
      const physicalWidth  = Math.round(cssWidth  * 2);
      const physicalHeight = Math.round(cssHeight * 2);

      // 6. Create multi-page A4 PDF — same paging logic as the frontend jspdf function
      //    ratio = A4_width / cssWidth  →  how many PDF points per CSS pixel
      //    pageHeightCSS = how many CSS pixels fit in one A4 page
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

            // Cut the screenshot into A4-sized slices (same canvas.drawImage logic as frontend)
            const sliceBuffer = await sharp(screenshotBuffer)
              .extract({ left: 0, top: position, width: physicalWidth, height: sliceHeight })
              .jpeg({ quality: 100 })
              .toBuffer();

            doc.addPage();
            // White background (matches ctx.fillStyle = '#FFFFFF' in frontend)
            doc.rect(0, 0, A4_WIDTH_PT, A4_HEIGHT_PT).fill('white');
            // Image scaled to full A4 width
            doc.image(sliceBuffer, 0, 0, { width: A4_WIDTH_PT });

            position += sliceHeight;
          }

          doc.end();
        };

        buildPages().catch(reject);
      });

      // 7. Send the email with the generated PDF attached
      const link = `${baseURL}#/dashboard/${dashboard}`;
      MailingService.mailDashboardSending(userMail, filename, filepath, transporter, message, link, senderEmail);

    } finally {
      await browser.close();
    }
  };
}
