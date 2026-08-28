import { UserController } from './../../module/admin/users/user.controller';

import { ManagerConnectionService } from '../../services/connection/manager-connection.service';
import Dashboard from '../../module/dashboard/model/dashboard.model';
const mailConfig = require('../../../config/mailing.config')
let nodemailer = require('nodemailer');
import { SchedulerFunctions } from './../scheduler/schedulerFunctions';
import { MailDashboardsController } from '../dashboardToPDFService/mail-dashboards.controller';
const fs = require('fs');
const path = require("path");

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
        console.log(`[MailingService] alerta: "${alert.value.operand} ${alert.value.value}" | units: ${alert.value.mailing.units} | lastUpdated: ${alert.value.mailing.lastUpdated}S`);
        // para validar se puede forzar la variable. 
        // console.log('Forzado del should upddate.....')
        // shouldUpdate = true;
        const mailing = alert.value.mailing;
        const shouldUpdate = mailing.units === 'days'
          ? SchedulerFunctions.checkScheduleDays(mailing.quantity, mailing.hours, mailing.minutes, mailing.lastUpdated)
          : SchedulerFunctions.checkScheduleHours(mailing.quantity, mailing.lastUpdated);

        console.log(`[MailingService] alerta: "${alert.value.operand} ${alert.value.value}" | units: ${mailing.units} | lastUpdated: ${mailing.lastUpdated} | shouldUpdate: ${shouldUpdate}`);
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
        const registeredMails = (cfg.users || []).map((user: any) => user.email);
        const manualMails = (cfg.otherRecipients || '').split(/\s+/).map((m: string) => m.trim()).filter((m: string) => m.length > 0);
        const userMails: string[] = Array.from(new Set([...registeredMails, ...manualMails]));
        const dashboardID: string = dashboard._id.toString();

        const now = SchedulerFunctions.totLocalISOTime(new Date());
        console.log(`[MailingService] dashboard: "${dashboard.config.title}" | ahora: ${now} | lastUpdated: ${cfg.lastUpdated} | recipients: ${userMails.join(', ')}`);
        const shouldUpdate = cfg.units === 'days'
          ? SchedulerFunctions.checkScheduleDays(cfg.quantity, cfg.hours, cfg.minutes, cfg.lastUpdated)
          : SchedulerFunctions.checkScheduleHours(cfg.quantity, cfg.lastUpdated);

        //  console.log('Forzado del should upddate de los dashboards.....');
        //  shouldUpdate = true;

        if (shouldUpdate) {
          userMails.forEach((mail: string) => {
            MailDashboardsController.sendDashboard(dashboardID, mail, transporter, cfg.mailMessage, token, senderEmail, cfg.mailSubject)
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

  /** App URL for a dashboard. Tolerates a server_baseURL that already ends in a locale segment
   * (e.g. ".../ca") so we don't build ".../ca/es/#/...". */
  static dashboardAppUrl(dashboardId: string): string {
    const KNOWN_LOCALES = ['es', 'en', 'ca', 'fr', 'pl','gl','eu'];
    const base = String(mailConfig.server_baseURL || '').replace(/\/+$/, '');
    const hasLocale = KNOWN_LOCALES.includes(base.split('/').pop() || '');
    const localePath = hasLocale ? '' : `/${mailConfig.locale || 'es'}`;
    return `${base}${localePath}/#/dashboard/${dashboardId}`;
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

      const dashboardLink = MailingService.dashboardAppUrl(alert.query.dashboard.dashboard_id);

      let text = `${alert.value.mailing.mailMessage}\n-------------------------------------------- \n\n` +
        `${alert.query.query.fields[0].display_name}: ${result.toLocaleString('de-DE')}\n${dashboardLink}`

      let mailOptions = {
        from: senderEmail,
        to: user.email,
        subject: alert.value.mailing.mailSubject || 'EDA - Alerta KPI',
        text: text
      };


      if (condition) {
        transporter.sendMail(mailOptions, function (error: any) {
          if (error) console.log(error);
        });
      }
    })
  }

  /** "Enviar" button: same render + PDF pipeline as the cron, one recipient at a time. */
  static async sendDashboardNow(dashboardID: string, recipients: string[], subject: string, message: string, transporter: any, senderEmail: string) {
    const token = await UserController.provideFakeToken();
    for (const mail of recipients) {
      try {
        await MailDashboardsController.sendDashboard(dashboardID, mail, transporter, message || '', token, senderEmail, subject || '');
      } catch (err: any) {
        console.error(`[sendDashboardNow] ERROR enviando "${dashboardID}" a ${mail}:`, err?.message || err);
      }
    }
  }

  /** "Enviar" button: reloads the alert from Mongo (never runs a client-supplied query),
   * overriding only recipients and message with the dialog's current values. */
  static async sendAlertNow(dashboardId: string, panelId: string, operand: string, value: any, recipients: string[], subject: string, message: string, transporter: any, senderEmail: string) {
    const dashboard = await Dashboard.findById(dashboardId);
    if (!dashboard) throw new Error('Informe no encontrado');

    let limit: any = null;
    let query: any = null;
    (dashboard.config.panel || []).forEach((panel: any) => {
      if (!panel.content || panel.content.chart !== 'kpi') return;
      if (panelId && panel.id !== panelId) return;
      (panel.content?.query?.output?.config?.alertLimits || []).forEach((a: any) => {
        if (a.operand === operand && String(a.value) === String(value)) {
          limit = a;
          query = panel.content.query;
        }
      });
    });

    if (!limit) throw new Error('Alerta no encontrada. Guarda el informe antes de enviarla.');

    const alert = {
      value: {
        ...limit,
        mailing: {
          ...(limit.mailing || {}),
          users: recipients.map((email: string) => ({ email })),
          mailSubject: subject || limit.mailing?.mailSubject || '',
          mailMessage: message || limit.mailing?.mailMessage || '',
        },
      },
      dashboard_id: dashboard._id,
      query,
    };

    MailingService.mailAlertsSending(alert, transporter, senderEmail);
  }

  static mailDashboardSending(userMail:string, filename:string, filepath:string, transporter:any, message:string, link:string, senderEmail:string, subject:string = ''){

    let text = `${message}\n-------------------------------------------- \n\n`;
    text += link;

    let mailOptions = {
      from: senderEmail,
      to: userMail,
      subject: subject || 'EDA - Informe',
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


}
