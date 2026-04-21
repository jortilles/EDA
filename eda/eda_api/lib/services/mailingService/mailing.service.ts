import { UserController } from './../../module/admin/users/user.controller';

import { ManagerConnectionService } from '../../services/connection/manager-connection.service';
import Dashboard from '../../module/dashboard/model/dashboard.model';
const mailConfig = require('../../../config/mailing.config')
let nodemailer = require('nodemailer');
import { SchedulerFunctions } from './../scheduler/schedulerFunctions';
import { MailDashboardsController } from '../dashboardToPDFService/mail-dashboards.controller';
const fs = require('fs');
const path = require("path");

export interface AlertHistoryItem {
  timestamp: string;
  status: 'success' | 'failed';
  recipient: string;
  error?: string;
  kpiValue?: number | null;
  conditionMet?: boolean;
}

/**Mailing service */


export class MailingService {

  static async mailingService(updateTimestamp = true) {
    const newDate = SchedulerFunctions.totLocalISOTime(new Date()) ;
    const smtpConfig = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../config/SMPT.config.json"), 'utf-8'));
    const config = { ...smtpConfig, family: 4 };
    const senderEmail = smtpConfig.auth?.user;
    const transporter = nodemailer.createTransport(config);
    transporter.verify(async (error: any) => {
      if (error) {
        console.log(`\n\x1b[33m\u21AF\x1b[0m \x1b[1mMailing service is not configured properly, please check your configuration file\x1b[0m \x1b[33m\u21AF\x1b[0m\n`);
        console.log(error);
      } else {
        console.log(`\n\x1b[34m=====\x1b[0m \x1b[32mMail server is ready to take our messages\x1b[0m \x1b[34m=====\x1b[0m\n`)
        this.alertSending(newDate, transporter, senderEmail, updateTimestamp);
        this.dashboardSending(newDate, transporter, senderEmail, updateTimestamp);
      }
    });
  }

  static async alertSending(newDate: string, transporter: any, senderEmail: string, updateTimestamp = true) {
    try {
      const dashboards = await Dashboard.find({ 'config.mailingAlertsEnabled': true });
      const alerts = MailingService.getAlerts(dashboards);
      console.log(`[MailingService] alertas KPI activas: ${alerts.length}`);
      let dashboardsToUpdate: any[] = [];
      /**Check alerts  */
      alerts.forEach((alert) => {
        let shouldUpdate = true;
        console.log(`[MailingService] alerta: "${alert.value.operand} ${alert.value.value}" | units: ${alert.value.mailing.units} | lastUpdated: ${alert.value.mailing.lastUpdated} | shouldUpdate: ${shouldUpdate}`);
                // para validar se puede forzar la variable. 
        // console.log('Forzado del should upddate.....')
        // shouldUpdate = true;
        if (shouldUpdate) {
          MailingService.mailAlertsSending(alert, transporter, senderEmail);
          if (updateTimestamp) {
            alert.value.mailing.lastUpdated = newDate;
            if (!dashboardsToUpdate.map(d => d._id).includes(alert.dashboard_id)) dashboardsToUpdate.push(dashboards.filter(d => d._id === alert.dashboard_id)[0]);
          }
        }
      });

      if (updateTimestamp) {
        dashboardsToUpdate.forEach(d => {
          Dashboard.replaceOne({ _id: d._id }, d).exec()
        });
      }

    } catch (err) {
      throw err;
    }

  }

  static async dashboardSending(newDate: string, transporter: any, senderEmail: string, updateTimestamp = true) {

    try {

      const dashboards = await Dashboard.find({ 'config.sendViaMailConfig.enabled': true });
      console.log(`[MailingService] dashboards programados: ${dashboards.length}`);
      const token = await UserController.provideFakeToken();
      let dashboardsToUpdate: any[] = [];

      dashboards.forEach(dashboard => {
        const cfg = dashboard.config.sendViaMailConfig;
        const userMails = cfg.users.map((user: any) => user.email);
        const dashboardID: string = dashboard._id.toString();
        let shouldUpdate = true;

        const now = SchedulerFunctions.totLocalISOTime(new Date());
        const nextSend = new Date(Date.parse(cfg.lastUpdated) + cfg.quantity * 60 * 60000);
        console.log(`[MailingService] dashboard: "${dashboard.config.title}" | ahora: ${now} | lastUpdated: ${cfg.lastUpdated} | proxEnvio: ${SchedulerFunctions.totLocalISOTime(nextSend)} | shouldUpdate: ${shouldUpdate} | recipients: ${userMails.join(', ')}`);
        
        //  console.log('Forzado del should upddate de los dashboards.....');
        //  shouldUpdate = true;

        if (shouldUpdate) {
          userMails.forEach((mail: string) => {
            MailDashboardsController.sendDashboard(dashboardID, mail, transporter, cfg.mailMessage, token, senderEmail)
              .catch((err: any) => console.error(`[MailingService] ERROR enviando dashboard "${dashboard.config.title}" a ${mail}:`, err));
          });
          if (updateTimestamp) {
            dashboard.config.sendViaMailConfig.lastUpdated = newDate;
            if (!dashboardsToUpdate.map(d => d._id).includes(dashboardID)) {
              dashboardsToUpdate.push(dashboard)
            }
          }
        }
      });

      if (updateTimestamp) {
        dashboardsToUpdate.forEach(d => {
          Dashboard.replaceOne({ _id: d._id }, d).exec()
        });
      }

    } catch (err) {
      throw err;
    }

  }

  static getAlerts(dashboards) {

    const alerts = []
    dashboards.forEach(dashboard => {

      dashboard.config.panel.forEach(panel => {

        if (panel.content && panel.content.chart === 'kpi') {

          panel.content.query.output.config.alertLimits.forEach(alert => {

            if (alert.mailing.enabled === true) {

              alerts.push({ value: alert, dashboard_id: dashboard._id, query: panel.content.query });

            }
          });
        }
      });
    });

    return alerts;

  }


  static addAlertHistory(alert: any, historyItem: AlertHistoryItem) {
    if (!alert.value.mailing.history) {
      alert.value.mailing.history = [];
    }
    alert.value.mailing.history.unshift(historyItem);
    if (alert.value.mailing.history.length > 20) {
      alert.value.mailing.history = alert.value.mailing.history.slice(0, 20);
    }
  }

  /**Chech kpi condition and send mail if condition is true
   * 
   */
  static mailAlertsSending(alert, transporter, senderEmail: string) {

    alert.value.mailing.users.forEach(async user => {

      let result = !alert.query.query.modeSQL ?
        await MailingService.execQuery(alert.query, user) :
        await MailingService.execSqlQuery(alert.query, user);

      let condition = MailingService.compareValues(result, alert.value.value, alert.value.operand);
      console.log(`[MailingService] alerta KPI | resultado: ${result} | condición: ${result} ${alert.value.operand} ${alert.value.value} = ${condition} | destinatario: ${user.email}`);

      const appBase = mailConfig.server_baseURL.replace(/\/?$/, '/');
      const dashboardLink = `${appBase}#/dashboard/${alert.query.dashboard.dashboard_id}`;

      let text = `${alert.value.mailing.mailMessage}\n-------------------------------------------- \n\n` +
        `${alert.query.query.fields[0].display_name}: ${result.toLocaleString('de-DE')}\n${dashboardLink}`

      let mailOptions = {
        from: senderEmail,
        to: user.email,
        subject: 'Eda Alerts',
        text: text
      };

      const timestamp = SchedulerFunctions.totLocalISOTime(new Date());

      if (condition) {
        transporter.sendMail(mailOptions, function (error: any) {
          if (error) {
            console.log(error);
            MailingService.addAlertHistory(alert, {
              timestamp,
              status: 'failed',
              recipient: user.email,
              error: error.message || 'Unknown error',
              kpiValue: result,
              conditionMet: true
            });
          } else {
            MailingService.addAlertHistory(alert, {
              timestamp,
              status: 'success',
              recipient: user.email,
              kpiValue: result,
              conditionMet: true
            });
          }
        });
      } else {
        MailingService.addAlertHistory(alert, {
          timestamp,
          status: 'success',
          recipient: user.email,
          kpiValue: result,
          conditionMet: false
        });
      }
    })
  }

  static mailDashboardSending(userMail:string, filename:string, filepath:string, transporter:any, message:string, link:string, senderEmail:string){

    let text = `${message}\n-------------------------------------------- \n\n`;
    text += link;

    let mailOptions = {
      from: senderEmail,
      to: userMail,
      subject: 'Eda Dashboard Sending Service',
      text: text,
      attachments: [{
        filename: filename,
        path: `${filepath}/${filename}`,
        contentType: 'application/pdf'
      }],
    };

    transporter.sendMail(mailOptions, function (error: any) {
      if (error) console.log(error);
      try {
        fs.unlinkSync(`${filepath}/${filename}`);
      } catch (err) {
        throw err
      }
    });
  }

  static compareValues(v1, v2, op) {
    const n1 = Number(v1);
    const n2 = Number(v2);
    switch (op) {
      case '<': return n1 < n2;
      case '>': return n1 > n2;
      case '=': return n1 === n2;
      default: return false;
    }
  }

  static async execQuery(alertQuery, user) {

    try {
      const connection = await ManagerConnectionService.getConnection(alertQuery.model_id);
      const dataModel = await connection.getDataSource(alertQuery.model_id);

      const dataModelObject = JSON.parse(JSON.stringify(dataModel));
      const query = await connection.getQueryBuilded(alertQuery.query, dataModelObject, user);

      connection.client = await connection.getclient();
      const getResults = await connection.execQuery(query);
      const results = [];

      // Normalize data
      for (let i = 0, n = getResults.length; i < n; i++) {
        const r = getResults[i];
        const output = Object.keys(r).map(k => r[k]);
        results.push(output);
      }
      return results[0][0];
    } catch (err) {
      console.log(err);
      return null;
    }

  }

  static async execSqlQuery(alertQuery, user) {
    try {

      const connection = await ManagerConnectionService.getConnection(alertQuery.model_id);
      const dataModel = await connection.getDataSource(alertQuery.model_id);
      const dataModelObject = JSON.parse(JSON.stringify(dataModel));
      const query = connection.BuildSqlQuery(alertQuery.query, dataModelObject, user);

      connection.client = await connection.getclient();
      const getResults = await connection.execQuery(query);
      const results = [];

      // Normalize data
      for (let i = 0, n = getResults.length; i < n; i++) {
        const r = getResults[i];
        const output = Object.keys(r).map(k => r[k]);
        results.push(output);
      }

      return results[0][0];

    } catch (err) {
      console.log(err);
      return null;
    }
  }

  static async testAlertSending(alertConfig: any, query: any): Promise<{ success: boolean; error?: string; kpiValue?: number | null; recipient: string }[]> {
    const results: { success: boolean; error?: string; kpiValue?: number | null; recipient: string }[] = [];

    try {
      const smtpConfig = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../config/SMPT.config.json"), 'utf-8'));
      const config = { ...smtpConfig, family: 4 };
      const senderEmail = smtpConfig.auth?.user;
      const transporter = nodemailer.createTransport(config);

      const verifyError = await new Promise((resolve) => {
        transporter.verify((error: any) => {
          resolve(error);
        });
      });

      if (verifyError) {
        for (const user of alertConfig.users) {
          results.push({
            success: false,
            error: 'SMTP configuration error: ' + (verifyError as any).message,
            recipient: user.email
          });
        }
        return results;
      }

      for (const user of alertConfig.users) {
        try {
          let kpiValue = !query.query.modeSQL ?
            await MailingService.execQuery(query, user) :
            await MailingService.execSqlQuery(query, user);

          const appBase = mailConfig.server_baseURL.replace(/\/?$/, '/');
          const dashboardLink = query.dashboard ? `${appBase}#/dashboard/${query.dashboard.dashboard_id}` : '';

          let text = `${alertConfig.mailMessage}\n-------------------------------------------- \n\n`;
          if (query.query.fields && query.query.fields[0]) {
            text += `${query.query.fields[0].display_name}: ${kpiValue !== null ? kpiValue.toLocaleString('de-DE') : 'N/A'}\n`;
          }
          text += `Condición: ${alertConfig.operand || 'N/A'} ${alertConfig.value || 'N/A'}\n`;
          if (dashboardLink) {
            text += dashboardLink;
          }

          let mailOptions = {
            from: senderEmail,
            to: user.email,
            subject: 'EDA - Prueba de alerta KPI',
            text: text
          };

          const sendResult = await new Promise((resolve) => {
            transporter.sendMail(mailOptions, function (error: any, info: any) {
              if (error) {
                resolve({ success: false, error: error.message });
              } else {
                resolve({ success: true, info });
              }
            });
          });

          if ((sendResult as any).success) {
            results.push({
              success: true,
              kpiValue: kpiValue,
              recipient: user.email
            });
          } else {
            results.push({
              success: false,
              error: (sendResult as any).error,
              kpiValue: kpiValue,
              recipient: user.email
            });
          }
        } catch (err) {
          results.push({
            success: false,
            error: (err as any).message || 'Unknown error',
            recipient: user.email
          });
        }
      }

      return results;
    } catch (err) {
      for (const user of alertConfig.users) {
        results.push({
          success: false,
          error: (err as any).message || 'Configuration error',
          recipient: user.email
        });
      }
      return results;
    }
  }


}
