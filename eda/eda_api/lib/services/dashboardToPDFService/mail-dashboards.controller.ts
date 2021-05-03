import { MailingService } from "../mailingService/mailing.service";
const serverConfig = require('../../../config/mailing.config');
const puppeteer = require('puppeteer');

export class MailDashboardsController {

  static sendDashboard = async (dashboard: string, userMail: string, transporter: any, message: string, token: string) => {

    try {

      const browser = await puppeteer.launch();
      const loginPage = await browser.newPage();

      const wait = (ms) => {
        return new Promise<void>(resolve => setTimeout(() => resolve(), ms));
      }

      await loginPage.on('response', async (response) => {

        try {
          const res = await response.json();
          const browser = await puppeteer.launch({ headless: true });
          const page = await browser.newPage();

          await page.setViewport({
            width: 1280,
            height: 600
          });


          await page.goto(`${serverConfig.server_baseURL}`)
          await page.evaluate((res) => {
            localStorage.setItem('token', res.token);
            localStorage.setItem('user', JSON.stringify(res.user));
            localStorage.setItem('id', res.user._id)
          }, res);

          await page.goto(`${serverConfig.server_baseURL}/#/dashboard/${dashboard}`);
          await wait(10000);
          const filename = `${dashboard}_${userMail}.pdf`;
          const filepath = __dirname;
          await page.pdf(
            {
              path: `${__dirname}/${dashboard}_${userMail}.pdf`,
              format: 'a4',
              printBackground: true,
              displayHeaderFooter: false,
              landscape: true,

            });
          await browser.close();
          MailingService.mailDashboardSending(userMail, filename, filepath, transporter, message);

        } catch (err) {
          throw err;
        }
      });

      await loginPage.goto(`${serverConfig.server_apiURL}/admin/user/fake-login/${userMail}/${token}`, { waitUntil: 'networkidle2' })
      await browser.close();

    }
    catch (err) {
      throw err;
    }

  }

}
