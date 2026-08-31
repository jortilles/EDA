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
          : mailing.units === 'hours'
            ? SchedulerFunctions.checkScheduleHours(mailing.quantity, mailing.lastUpdated)
            : MailingService.shouldSendNow(mailing);

        console.log(`[MailingService] alerta: "${alert.value.operand} ${alert.value.value}" | units: ${mailing.units} | lastUpdated: ${mailing.lastUpdated} | shouldUpdate: ${shouldUpdate}`);
        if (shouldUpdate) {
          const alertDashboard = dashboards.find(d => String(d._id) === String(alert.dashboard_id));
          MailingService.mailAlertsSending(alert, transporter, senderEmail, alertDashboard);
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

      for (const dashboard of dashboards) {
        const cfg = dashboard.config.sendViaMailConfig;
        const registeredMails = (cfg.users || []).map((user: any) => user.email);
        const manualMails = (cfg.otherRecipients || '').split(/\s+/).map((m: string) => m.trim()).filter((m: string) => m.length > 0);
        const userMails: string[] = Array.from(new Set([...registeredMails, ...manualMails]));
        const dashboardID: string = dashboard._id.toString();

        const now = SchedulerFunctions.totLocalISOTime(new Date());
        console.log(`[MailingService] dashboard: "${dashboard.config.title}" | ahora: ${now} | units: ${cfg.units} | lastUpdated: ${cfg.lastUpdated} | recipients: ${userMails.join(', ')}`);
        const shouldUpdate = MailingService.shouldSendNow(cfg);

          //console.log('Forzado del should upddate de los dashboards para forzar el envio al inicio.....');
          //shouldUpdate = true;

        if (shouldUpdate) {
          for (const mail of userMails) {
            const subject = await MailingService.resolveMailTemplate(cfg.mailSubject || '', dashboard, { email: mail });
            const message = await MailingService.resolveMailTemplate(cfg.mailMessage || '', dashboard, { email: mail });
            const aiText = cfg.aiAnalysis ? await MailingService.generateAiAnalysis(dashboard, { email: mail }) : '';
            MailDashboardsController.sendDashboard(dashboardID, mail, transporter, message, token, senderEmail, subject, aiText)
              .catch((err: any) => console.error(`[MailingService] ERROR enviando dashboard "${dashboard.config.title}" a ${mail}:`, err));
          }
          if (updateTimestamp) {
            dashboard.config.sendViaMailConfig.lastUpdated = newDate;
            if (!dashboardsToUpdate.map(d => d._id).includes(dashboardID)) {
              dashboardsToUpdate.push(dashboard)
            }
          }
        }
      }

      if (updateTimestamp) {
        dashboardsToUpdate.forEach(d => {
          Dashboard.replaceOne({ _id: d._id }, d).exec()
        });
      }

    } catch (err) {
      throw err;
    }

  }

  /** Decide whether a sendViaMailConfig is due right now, per its `units` rule. */
  static shouldSendNow(cfg: any): boolean {
    switch (cfg.units) {
      case 'hours':   return SchedulerFunctions.checkScheduleHours(cfg.quantity, cfg.lastUpdated);
      case 'days':    return SchedulerFunctions.checkScheduleDays(cfg.quantity || 1, cfg.hours, cfg.minutes, cfg.lastUpdated);
      case 'weekly':  return SchedulerFunctions.checkScheduleWeekly(cfg.weekday, cfg.hours, cfg.minutes, cfg.lastUpdated);
      case 'monthly': return SchedulerFunctions.checkScheduleMonthly(cfg.monthlyMode, cfg.monthlyDay, cfg.monthlyOrdinal, cfg.monthlyWeekday, cfg.hours, cfg.minutes, cfg.lastUpdated);
      default:        return false;
    }
  }

  /** AI comment for a dashboard email: runs each data panel's query as `user` (KPIs as a single
   * value, tables/charts as a few rows) and asks the configured provider for a short analysis.
   * Returns '' on any failure or if AI is off. */
  static async generateAiAnalysis(dashboard: any, user: any): Promise<string> {
    try {
      const aiConfig = require('../../../config/ai.config');
      if (!aiConfig || aiConfig.AVAILABLE === false) {
        console.log('[MailingService] generateAiAnalysis: AI no disponible, se omite');
        return '';
      }

      const panels = (dashboard.config.panel || []).filter((p: any) => p?.content?.query?.model_id);
      const blocks: string[] = [];

      for (const panel of panels.slice(0, 8)) {
        const q = panel.content.query;
        const chart = String(panel?.content?.chart || '');
        const label = panel.title || 'Panel';
        try {
          if (chart.startsWith('kpi')) {
            const val = !q.query?.modeSQL
              ? await MailingService.execQuery(q, user)
              : await MailingService.execSqlQuery(q, user);
            if (val !== null && val !== undefined && val !== '') blocks.push(`${label}: ${val}`);
          } else {
            const rows = await MailingService.execQueryRows(q, user, 12);
            if (!rows.length) continue;
            const cols = Object.keys(rows[0]);
            const table = [cols.join(' | ')]
              .concat(rows.map((r: any) => cols.map(c => String(r[c] ?? '')).join(' | ')))
              .join('\n');
            blocks.push(`${label}\n${table}`);
          }
        } catch { /* skip this panel */ }
      }

      if (blocks.length === 0) {
        console.log('[MailingService] generateAiAnalysis: sin datos de paneles, no se genera análisis');
        return '';
      }

      const { AIProviderFactory } = require('../prompt/providers/ai-provider.factory');
      const provider = AIProviderFactory.create(aiConfig);
      const completion = provider.complete([
        { role: 'system', content: aiConfig.CONTEXT || 'Responde en español, breve y sin inventar datos.' },
        { role: 'user', content: `Analiza los datos del informe "${dashboard.config.title}" y escribe 3-4 frases de análisis en español. No inventes datos ni des recomendaciones largas.\n\n${blocks.join('\n\n')}` },
      ], []);
      const timeout = new Promise<any>((_, reject) => setTimeout(() => reject(new Error('AI provider timeout (25s)')), 25000));
      const result = await Promise.race([completion, timeout]);
      const text = (result?.text || '').trim();
      console.log(`[MailingService] generateAiAnalysis: ${text ? `${text.length} caracteres` : 'respuesta vacía'}`);
      return text;
    } catch (err: any) {
      console.error('[MailingService] generateAiAnalysis error:', err?.message || err);
      return '';
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

  /** Replaces `${pN.title}` / `${pN.value}` tokens in a subject or body. pN is the 1-based position
   * of a KPI panel among the dashboard's KPI panels (same order as the dialog listing). `.value`
   * runs that panel's query as `user`, so it respects row-level security. */
  static async resolveMailTemplate(template: string, dashboard: any, user: any): Promise<string> {
    if (!template || !template.includes('${p')) return template || '';

    const kpiPanels = (dashboard?.config?.panel || []).filter((p: any) => String(p?.content?.chart || '').startsWith('kpi'));
    let out = template;

    for (let i = 0; i < kpiPanels.length; i++) {
      const panel = kpiPanels[i];
      const base = `p${i + 1}`;

      out = out.split('${' + base + '.title}').join(panel.title ?? '');

      if (out.includes('${' + base + '.value}')) {
        let val: any = '';
        try {
          const q = panel.content.query;
          val = !q.query.modeSQL
            ? await MailingService.execQuery(q, user)
            : await MailingService.execSqlQuery(q, user);
        } catch { val = ''; }
        const rendered = (val === null || val === undefined || val === '')
          ? ''
          : (Number.isFinite(Number(val)) ? Number(val).toLocaleString('de-DE') : String(val));
        out = out.split('${' + base + '.value}').join(rendered);
      }
    }

    return out;
  }

  /** App URL for a dashboard. Tolerates a server_baseURL that already ends in a locale segment
   * (e.g. ".../ca") so we don't build ".../ca/es/#/...". */
  static dashboardAppUrl(dashboardId: string, query = ''): string {
    const KNOWN_LOCALES = ['es', 'en', 'ca', 'fr', 'pl','gl','eu'];
    const base = String(mailConfig.server_baseURL || '').replace(/\/+$/, '');
    const hasLocale = KNOWN_LOCALES.includes(base.split('/').pop() || '');
    const localePath = hasLocale ? '' : `/${mailConfig.locale || 'es'}`;
    return `${base}${localePath}/${query}#/dashboard/${dashboardId}`;
  }


  /**Chech kpi condition and send mail if condition is true
   * 
   */
  static mailAlertsSending(alert, transporter, senderEmail: string, dashboard: any = null) {

    alert.value.mailing.users.forEach(async user => {

      let result = !alert.query.query.modeSQL ?
        await MailingService.execQuery(alert.query, user) :
        await MailingService.execSqlQuery(alert.query, user);

      let condition = MailingService.compareValues(result, alert.value.value, alert.value.operand);
      console.log(`[MailingService] alerta KPI | resultado: ${result} | condición: ${result} ${alert.value.operand} ${alert.value.value} = ${condition} | destinatario: ${user.email}`);
      if (!condition) return;

      const dashboardLink = MailingService.dashboardAppUrl(alert.query.dashboard.dashboard_id);
      const subject = await MailingService.resolveMailTemplate(alert.value.mailing.mailSubject || 'EDA - Alerta KPI', dashboard, user);
      const body = await MailingService.resolveMailTemplate(alert.value.mailing.mailMessage || '', dashboard, user);
      const fieldName = alert.query.query.fields[0].display_name;

      const text = `${body}\n-------------------------------------------- \n\n${fieldName}: ${result.toLocaleString('de-DE')}\n${dashboardLink}`;
      const html =
        `<div style="font-family:Arial,Helvetica,sans-serif;color:#111;font-size:14px;line-height:1.5">` +
          `<div style="white-space:pre-wrap">${body}</div>` +
          `<p style="margin:12px 0"><strong>${fieldName}:</strong> ${result.toLocaleString('de-DE')}</p>` +
          `<p><a href="${dashboardLink}">${dashboardLink}</a></p>` +
        `</div>`;

      transporter.sendMail({ from: senderEmail, to: user.email, subject, text, html }, function (error: any) {
        if (error) console.log(error);
      });
    })
  }

  /** "Enviar" button: same render + PDF pipeline as the cron, one recipient at a time. */
  static async sendDashboardNow(dashboardID: string, recipients: string[], subject: string, message: string, transporter: any, senderEmail: string, aiAnalysis = false) {
    const token = await UserController.provideFakeToken();
    const dashboard = await Dashboard.findById(dashboardID);
    for (const mail of recipients) {
      try {
        const resolvedSubject = await MailingService.resolveMailTemplate(subject || '', dashboard, { email: mail });
        const resolvedMessage = await MailingService.resolveMailTemplate(message || '', dashboard, { email: mail });
        const aiText = aiAnalysis ? await MailingService.generateAiAnalysis(dashboard, { email: mail }) : '';
        await MailDashboardsController.sendDashboard(dashboardID, mail, transporter, resolvedMessage, token, senderEmail, resolvedSubject, aiText);
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

    MailingService.mailAlertsSending(alert, transporter, senderEmail, dashboard);
  }

  static mailDashboardSending(userMail:string, filename:string, filepath:string, transporter:any, message:string, link:string, senderEmail:string, subject:string = '', imageBuffer?:Buffer, aiText:string = ''): Promise<void> {

    const text = `${message}\n-------------------------------------------- \n\n${link}`;

    const aiBlock = aiText
      ? `<div style="margin:16px 0;padding:12px 14px;border:1px solid #cdeeeb;background:#f0fbfa;border-radius:8px">` +
          `<div style="font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#0a7d75">Análisis automático</div>` +
          `<div style="white-space:pre-wrap;margin-top:4px">${aiText}</div>` +
        `</div>`
      : '';

    const imageBlock = imageBuffer
      ? `<div style="margin:16px 0">` +
          `<img src="cid:dashboardimg" alt="" width="600" style="width:100%;max-width:600px;height:auto;border:1px solid #ddd;border-radius:4px"/>` +
          `<div style="font-size:12px;color:#888;margin-top:4px">Vista previa · informe completo en el PDF adjunto</div>` +
        `</div>`
      : '';

    const html =
      `<div style="font-family:Arial,Helvetica,sans-serif;color:#111;font-size:14px;line-height:1.5">` +
        `<div style="white-space:pre-wrap">${message || ''}</div>` +
        aiBlock +
        imageBlock +
        `<p><a href="${link}">${link}</a></p>` +
      `</div>`;

    const attachments: any[] = [{
      filename: filename,
      path: `${filepath}/${filename}`,
      contentType: 'application/pdf'
    }];
    if (imageBuffer) {
      attachments.push({ filename: 'dashboard.jpg', content: imageBuffer, contentType: 'image/jpeg', cid: 'dashboardimg' });
    }

    let mailOptions = {
      from: senderEmail,
      to: userMail,
      subject: subject || 'EDA - Informe',
      text: text,
      html: html,
      attachments,
    };

    return new Promise<void>((resolve) => {
      transporter.sendMail(mailOptions, function (error: any, info: any) {
        if (error) {
          console.error(`[MailDashboard] SMTP ERROR -> ${userMail}:`, error?.message || error);
        } else {
          console.log(`[MailDashboard] SMTP OK -> ${userMail} (${info?.messageId || info?.response || 'sent'})`);
        }
        try { fs.unlinkSync(`${filepath}/${filename}`); } catch { /* temp PDF already gone */ }
        resolve();
      });
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

  /** Like execQuery/execSqlQuery but returns up to `limit` full rows (array of objects) instead of
   * just the first cell. Used to feed table/chart panel data to the AI analysis. */
  static async execQueryRows(panelQuery: any, user: any, limit = 15): Promise<any[]> {
    try {
      const connection = await ManagerConnectionService.getConnection(panelQuery.model_id);
      const dataModel = await connection.getDataSource(panelQuery.model_id);
      const dataModelObject = JSON.parse(JSON.stringify(dataModel));
      const query = panelQuery?.query?.modeSQL
        ? connection.BuildSqlQuery(panelQuery.query, dataModelObject, user)
        : await connection.getQueryBuilded(panelQuery.query, dataModelObject, user);

      connection.client = await connection.getclient();
      const getResults = await connection.execQuery(query);
      return Array.isArray(getResults) ? getResults.slice(0, limit) : [];
    } catch (err) {
      console.log('[MailingService] execQueryRows error:', (err as any)?.message || err);
      return [];
    }
  }

}
