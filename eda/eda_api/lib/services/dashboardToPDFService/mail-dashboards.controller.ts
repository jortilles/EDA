import { MailingService } from "../mailingService/mailing.service";
const serverConfig = require('../../../config/mailing.config');
const puppeteer = require('puppeteer');

export class MailDashboardsController {

  static sendDashboard = async (dashboard: string, userMail: string, transporter: any, message: string, token: string) => {

    try {
      console.log('Send Dashboard token');
      console.log(token);
      const browser = await puppeteer.launch({ headless: true , args: ['--no-sandbox'] });
      const loginPage = await browser.newPage();
      // Configure the navigation timeout
      //await loginPage.setDefaultNavigationTimeout(300000);

      const wait = (ms) => {
        return new Promise<void>(resolve => setTimeout(() => resolve(), ms));
      }

      await loginPage.on('response', async (response) => {

        try {
          const res = await response.json();

          console.log(res.user, res.token)
          
          const browser = await puppeteer.launch({ headless: true,  args: ['--no-sandbox'] });
          const page = await browser.newPage();

          await page.setViewport({
            width: 1366,
            height: 768
          });


          await page.goto(`${serverConfig.server_baseURL}`)
          await page.evaluate((res) => {
            localStorage.setItem('token', res.token);
            localStorage.setItem('user', JSON.stringify(res.user));
            localStorage.setItem('id', res.user._id)
          }, res);


          await page.goto(`${serverConfig.server_baseURL}/#/dashboard/${dashboard}`);
          await wait(40000);
          const filename = `${dashboard}_${userMail}.pdf`;
          const filepath = __dirname;
          await page.pdf(
            {
              path: `${__dirname}/${dashboard}_${userMail}.pdf`,
              // format: 'a3',
              width:1380,
              height:775,
              printBackground: true,
              displayHeaderFooter: false,
              landscape: false,

            });
          await browser.close();
          const link = `${serverConfig.server_baseURL}/#/dashboard/${dashboard}`
          MailingService.mailDashboardSending(userMail, filename, filepath, transporter, message, link);

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
