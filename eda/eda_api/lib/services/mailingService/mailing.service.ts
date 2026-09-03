import { UserController } from './../../module/admin/users/user.controller';

import { ManagerConnectionService } from '../../services/connection/manager-connection.service';
import Dashboard from '../../module/dashboard/model/dashboard.model';
import User from '../../module/admin/users/model/user.model';
import Group from '../../module/admin/groups/model/group.model';
const mailConfig = require('../../../config/mailing.config')
let nodemailer = require('nodemailer');
import { SchedulerFunctions } from './../scheduler/schedulerFunctions';
import { MailDashboardsController } from '../dashboardToPDFService/mail-dashboards.controller';
import { renderMailLogic, hasMailLogic, buildKpiCtxNode } from './mail-logic.util';
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
        const registeredMails: string[] = Array.from(new Set((cfg.users || []).map((u: any) => u.email).filter(Boolean)));
        const manualMails: string[] = Array.from(new Set((cfg.otherRecipients || '').split(/\s+/).map((m: string) => m.trim()).filter((m: string) => m.length > 0)));
        const userMails: string[] = [...registeredMails, ...manualMails];
        const dashboardID: string = dashboard._id.toString();

        const now = SchedulerFunctions.totLocalISOTime(new Date());
        console.log(`[MailingService] dashboard: "${dashboard.config.title}" | ahora: ${now} | units: ${cfg.units} | lastUpdated: ${cfg.lastUpdated} | recipients: ${userMails.join(', ')}`);
        const shouldUpdate = MailingService.shouldSendNow(cfg);

          //console.log('Forzado del should upddate de los dashboards para forzar el envio al inicio.....');
          //shouldUpdate = true;

        if (shouldUpdate) {
          const ownerEmail = await MailingService.dashboardOwnerEmail(dashboard);
          const errLog = (mail: string) => (err: any) => console.error(`[MailingService] ERROR enviando dashboard "${dashboard.config.title}" a ${mail}:`, err);

          // Registered users: rendered with their own permissions; anyone without access is skipped.
          for (const mail of registeredMails) {
            const mailUser = await MailingService.resolveMailUser(mail);
            if (!(await MailingService.canAccessDashboard(dashboard, mailUser))) {
              console.log(`[MailingService] "${mail}" sin acceso a "${dashboard.config.title}", se omite`);
              continue;
            }
            const subject = await MailingService.resolveMailTemplate(cfg.mailSubject || '', dashboard, mailUser);
            const message = await MailingService.resolveMailTemplate(cfg.mailMessage || '', dashboard, mailUser);
            const aiText = cfg.aiAnalysis ? await MailingService.generateAiAnalysis(dashboard, mailUser) : '';
            MailDashboardsController.sendDashboard(dashboardID, mail, transporter, message, token, senderEmail, subject, aiText, mail).catch(errLog(mail));
          }

          // Hand-typed external addresses: rendered as the dashboard owner (same content for all).
          if (manualMails.length && ownerEmail) {
            const ownerUser = await MailingService.resolveMailUser(ownerEmail);
            const subject = await MailingService.resolveMailTemplate(cfg.mailSubject || '', dashboard, ownerUser);
            const message = await MailingService.resolveMailTemplate(cfg.mailMessage || '', dashboard, ownerUser);
            const aiText = cfg.aiAnalysis ? await MailingService.generateAiAnalysis(dashboard, ownerUser) : '';
            for (const mail of manualMails) {
              MailDashboardsController.sendDashboard(dashboardID, mail, transporter, message, token, senderEmail, subject, aiText, ownerEmail).catch(errLog(mail));
            }
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
      if (!aiConfig || aiConfig.AVAILABLE === false) return '';

      const panels = (dashboard.config.panel || []).filter((p: any) => p?.content?.query?.model_id);
      const blocks: string[] = [];

      for (const panel of panels.slice(0, 8)) {
        const q = panel.content.query;
        const chart = String(panel?.content?.chart || '');
        const label = panel.title || 'Panel';
        try {
          // KPI panels (plain or kpibar/line/area) -> their headline number. Tables and other
          // charts -> a few rows; if the query can't be built server-side the panel is skipped.
          if (chart.startsWith('kpi')) {
            const series = await MailingService.execKpiSeries(q, user, chart);
            const val = MailingService.kpiTokenValue(series, chart === 'kpi' ? 'value' : 'breakdown');
            if (val) blocks.push(`${label}: ${val}`);
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
        console.log('[MailingService] generateAiAnalysis: sin datos de paneles');
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
      return (result?.text || '').trim();
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

  /** Replaces `${pN.title}` / `${pN.value}` / `${pN.value.breakdown|top|bottom|average}` tokens
   * in a subject or body. pN is the 1-based position of a KPI panel among the dashboard's KPI
   * panels (same order as the dialog listing). Values run that panel's query as `user`, so they
   * respect row-level security. */
  static async resolveMailTemplate(template: string, dashboard: any, user: any): Promise<string> {
    if (!template) return '';
    const hasVars = template.includes('${p');
    const hasLogic = hasMailLogic(template);
    if (!hasVars && !hasLogic) return template;

    const kpiPanels = (dashboard?.config?.panel || []).filter((p: any) => String(p?.content?.chart || '').startsWith('kpi'));

    // Each panel's series is fetched at most once, shared by the `${…}` pass and the logic context.
    const cache: Record<number, any> = {};
    const seriesFor = async (i: number) => {
      if (!(i in cache)) {
        try { cache[i] = await MailingService.execKpiSeries(kpiPanels[i].content.query, user, String(kpiPanels[i]?.content?.chart || '')); }
        catch { cache[i] = null; }
      }
      return cache[i];
    };

    let out = template;

    if (hasVars) {
      for (let i = 0; i < kpiPanels.length; i++) {
        const base = `p${i + 1}`;
        out = out.split('${' + base + '.title}').join(kpiPanels[i].title ?? '');
        if (out.includes('${' + base + '.value')) {
          const series = await seriesFor(i);
          // longest tokens first so `.value.breakdown` isn't eaten by `.value`
          for (const kind of ['breakdown', 'top', 'bottom', 'average']) {
            const tok = '${' + base + '.value.' + kind + '}';
            if (out.includes(tok)) out = out.split(tok).join(MailingService.kpiTokenValue(series, kind));
          }
          const vtok = '${' + base + '.value}';
          if (out.includes(vtok)) out = out.split(vtok).join(MailingService.kpiTokenValue(series, 'value'));
        }
      }
    }

    if (hasLogic) {
      const ctx: Record<string, any> = {};
      for (let i = 0; i < kpiPanels.length; i++) {
        const s = await seriesFor(i);
        ctx[`p${i + 1}`] = buildKpiCtxNode(kpiPanels[i].title ?? '', s?.items || []);
      }
      out = renderMailLogic(out, ctx);
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

  /** Full user object for RLS-aware query execution. The query builder needs `_id` and `role`
   * (group ids) — a bare `{ email }` throws at `this.groups.includes(...)`. Merges `User.role`
   * with any group whose `users` list contains this user. */
  static async resolveMailUser(email: string): Promise<any> {
    try {
      const u: any = await User.findOne({ email }, 'name email role');
      if (!u) return { email, role: [] };
      const memberGroups: any[] = await Group.find({ users: u._id }, '_id');
      const roleIds = new Set<string>((u.role || []).map((r: any) => String(r)));
      memberGroups.forEach(g => roleIds.add(String(g._id)));
      return { _id: String(u._id), email: u.email, name: u.name, role: Array.from(roleIds) };
    } catch (err: any) {
      console.error('[MailingService] resolveMailUser error:', err?.message || err);
      return { email, role: [] };
    }
  }

  /** Owner email of a dashboard, used as the render identity for hand-typed external recipients
   * on the scheduled job (which has no interactive sender). */
  static async dashboardOwnerEmail(dashboard: any): Promise<string> {
    try {
      const owner: any = dashboard?.user ? await User.findById(dashboard.user, 'email') : null;
      return owner?.email || '';
    } catch { return ''; }
  }

  /** Same permission rule as DashboardController.getDashboard: a user can see a dashboard if it's
   * open/common, they own it, they're in the EDA_ADMIN group, or one of their groups owns it. */
  static async canAccessDashboard(dashboard: any, user: any): Promise<boolean> {
    try {
      if (['open', 'common'].includes(String(dashboard?.config?.visible))) return true;

      const uid = String(user?._id || '');
      if (uid && dashboard?.user && String(dashboard.user) === uid) return true;

      const userGroups: string[] = (user?.role || []).map((r: any) => String(r));
      if (userGroups.length === 0) return false;

      const groups = await Group.find({ _id: { $in: userGroups } }, 'name').exec();
      if (groups.some((g: any) => g.name === 'EDA_ADMIN')) return true;

      const dashGroups = (Array.isArray(dashboard?.group) ? dashboard.group : [dashboard?.group])
        .filter(Boolean).map((g: any) => String(g?._id || g));
      return dashGroups.some((g: string) => userGroups.includes(g));
    } catch (err: any) {
      console.error('[MailingService] canAccessDashboard error:', err?.message || err);
      return false;
    }
  }

  /** Absolute URL of a frontend static asset (locale-independent, served from the app root). */
  static appAssetUrl(relPath: string): string {
    const KNOWN_LOCALES = ['es', 'en', 'ca', 'fr', 'pl', 'gl', 'eu'];
    let base = String(mailConfig.server_baseURL || '').replace(/\/+$/, '');
    if (KNOWN_LOCALES.includes(base.split('/').pop() || '')) base = base.replace(/\/[^/]+$/, '');
    return `${base}/${String(relPath).replace(/^\/+/, '')}`;
  }


  /**Chech kpi condition and send mail if condition is true
   *
   */
  static async mailAlertsSending(alert, transporter, senderEmail: string, dashboard: any = null, configuredByEmail = '') {

    const fallbackEmail = configuredByEmail || await MailingService.dashboardOwnerEmail(dashboard);
    const bannerUrl = MailingService.appAssetUrl('assets/images/logos/logo_500.png');
    const mailing = alert.value.mailing || {};
    const registered: string[] = Array.from(new Set((mailing.users || []).map((u: any) => u?.email || u).filter(Boolean)));
    const manual: string[] = Array.from(new Set(String(mailing.otherRecipients || '').split(/\s+/).map((s: string) => s.trim()).filter(Boolean)));

    const evalAndSend = async (deliverTo: string, renderAs: string) => {
      const user = await MailingService.resolveMailUser(renderAs);

      const result = !alert.query.query.modeSQL ?
        await MailingService.execQuery(alert.query, user) :
        await MailingService.execSqlQuery(alert.query, user);

      const condition = MailingService.compareValues(result, alert.value.value, alert.value.operand);
      console.log(`[MailingService] alerta KPI | resultado: ${result} | condición: ${result} ${alert.value.operand} ${alert.value.value} = ${condition} | destinatario: ${deliverTo}`);
      if (!condition) return;

      const dashboardLink = MailingService.dashboardAppUrl(alert.query.dashboard.dashboard_id);
      const subject = await MailingService.resolveMailTemplate(mailing.mailSubject || 'EDA - Alerta KPI', dashboard, user);
      const body = await MailingService.resolveMailTemplate(mailing.mailMessage || '', dashboard, user);
      const fieldName = alert.query.query.fields[0].display_name;
      const aiText = mailing.aiAnalysis && dashboard ? await MailingService.generateAiAnalysis(dashboard, user) : '';

      const aiBlock = aiText
        ? `<div style="margin:16px 0;padding:12px 14px;border:1px solid #cdeeeb;background:#f0fbfa;border-radius:8px">` +
            `<div style="font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#0a7d75">Análisis automático</div>` +
            `<div style="white-space:pre-wrap;margin-top:4px">${aiText}</div>` +
          `</div>`
        : '';

      const text = `${body}\n-------------------------------------------- \n\n${fieldName}: ${result.toLocaleString('de-DE')}\n${dashboardLink}`;
      const html =
        `<div style="font-family:Arial,Helvetica,sans-serif;color:#111;font-size:14px;line-height:1.5">` +
          `<div style="white-space:pre-wrap">${body}</div>` +
          aiBlock +
          `<p style="margin:12px 0"><strong>${fieldName}:</strong> ${result.toLocaleString('de-DE')}</p>` +
          `<p><a href="${dashboardLink}">${dashboardLink}</a></p>` +
          `<div style="margin-top:24px;padding-top:16px;border-top:1px solid #eee;text-align:center">` +
            `<img src="${bannerUrl}" alt="" style="max-height:64px;width:auto"/>` +
          `</div>` +
        `</div>`;

      transporter.sendMail({ from: senderEmail, to: deliverTo, subject, text, html }, (error: any) => {
        if (error) console.log(error);
      });
    };

    for (const email of registered) {
      const u = await MailingService.resolveMailUser(email);
      if (!(await MailingService.canAccessDashboard(dashboard, u))) {
        console.log(`[MailingService] alerta KPI | "${email}" sin acceso al informe, se omite`);
        continue;
      }
      await evalAndSend(email, email);
    }
    for (const email of manual) {
      await evalAndSend(email, fallbackEmail || email);
    }
  }

  /** "Enviar" button: same render + PDF pipeline as the cron, one recipient at a time.
   * `recipients` are users picked from the dropdown (rendered with their own permissions, skipped
   * if they can't see the dashboard); `externalRecipients` are hand-typed addresses (rendered as
   * `configuredByEmail`, the user who pressed Enviar, so they get exactly what the sender sees). */
  static async sendDashboardNow(dashboardID: string, recipients: string[], externalRecipients: string[], subject: string, message: string, transporter: any, senderEmail: string, aiAnalysis = false, configuredByEmail = '') {
    const token = await UserController.provideFakeToken();
    const dashboard = await Dashboard.findById(dashboardID);
    const fallbackEmail = configuredByEmail || await MailingService.dashboardOwnerEmail(dashboard);
    console.log(`[sendDashboardNow] informe "${dashboardID}" | usuarios: ${recipients.length} | externos: ${externalRecipients.length} | aiAnalysis: ${aiAnalysis} | render externos como: ${fallbackEmail || '-'}`);

    const sendOne = async (deliverTo: string, renderAs: string) => {
      const mailUser = await MailingService.resolveMailUser(renderAs);
      const resolvedSubject = await MailingService.resolveMailTemplate(subject || '', dashboard, mailUser);
      const resolvedMessage = await MailingService.resolveMailTemplate(message || '', dashboard, mailUser);
      const aiText = aiAnalysis ? await MailingService.generateAiAnalysis(dashboard, mailUser) : '';
      await MailDashboardsController.sendDashboard(dashboardID, deliverTo, transporter, resolvedMessage, token, senderEmail, resolvedSubject, aiText, renderAs);
    };

    for (const mail of recipients) {
      try {
        const mailUser = await MailingService.resolveMailUser(mail);
        if (!(await MailingService.canAccessDashboard(dashboard, mailUser))) {
          console.log(`[sendDashboardNow] "${mail}" sin acceso al informe, se omite`);
          continue;
        }
        await sendOne(mail, mail);
      } catch (err: any) {
        console.error(`[sendDashboardNow] ERROR enviando "${dashboardID}" a ${mail}:`, err?.message || err);
      }
    }

    // Externals all render as the same identity -> resolve subject/message/AI once, reuse for all.
    if (externalRecipients.length) {
      const renderAs = fallbackEmail || externalRecipients[0];
      const mailUser = await MailingService.resolveMailUser(renderAs);
      const resolvedSubject = await MailingService.resolveMailTemplate(subject || '', dashboard, mailUser);
      const resolvedMessage = await MailingService.resolveMailTemplate(message || '', dashboard, mailUser);
      const aiText = aiAnalysis ? await MailingService.generateAiAnalysis(dashboard, mailUser) : '';
      for (const mail of externalRecipients) {
        try {
          await MailDashboardsController.sendDashboard(dashboardID, mail, transporter, resolvedMessage, token, senderEmail, resolvedSubject, aiText, renderAs);
        } catch (err: any) {
          console.error(`[sendDashboardNow] ERROR enviando "${dashboardID}" a ${mail}:`, err?.message || err);
        }
      }
    }
  }

  /** "Enviar" button: reloads the alert from Mongo (never runs a client-supplied query),
   * overriding only recipients and message with the dialog's current values. */
  static async sendAlertNow(dashboardId: string, panelId: string, operand: string, value: any, recipients: string[], externalRecipients: string[], subject: string, message: string, transporter: any, senderEmail: string, aiAnalysis = false, configuredByEmail = '') {
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
          otherRecipients: (externalRecipients || []).join(' '),
          mailSubject: subject || limit.mailing?.mailSubject || '',
          mailMessage: message || limit.mailing?.mailMessage || '',
          aiAnalysis: aiAnalysis || !!limit.mailing?.aiAnalysis,
        },
      },
      dashboard_id: dashboard._id,
      query,
    };

    MailingService.mailAlertsSending(alert, transporter, senderEmail, dashboard, configuredByEmail);
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

    const bannerUrl = MailingService.appAssetUrl('assets/images/logos/logo_500.png');
    const bannerBlock =
      `<div style="margin-top:24px;padding-top:16px;border-top:1px solid #eee;text-align:center">` +
        `<img src="${bannerUrl}" alt="" style="max-height:64px;width:auto"/>` +
      `</div>`;

    const html =
      `<div style="font-family:Arial,Helvetica,sans-serif;color:#111;font-size:14px;line-height:1.5">` +
        `<div style="white-space:pre-wrap">${message || ''}</div>` +
        aiBlock +
        imageBlock +
        `<p><a href="${link}">${link}</a></p>` +
        bannerBlock +
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

  /** Same rule as DashboardController.securityCheck: when a datamodel has model-level security
   * (`model_granted_roles`), the user must be listed explicitly, be in a granted group, or the
   * model must be public. `getQueryBuilded` already enforces row/column granted roles, but not
   * this model-level gate — so we check it before running a panel query for the mail. */
  static datamodelAllowed(dataModel: any, user: any): boolean {
    try {
      const roles: string[] = (user?.role || []).map((r: any) => String(r));
      if (roles.includes('135792467811111111111110')) return true; // EDA admin group
      const granted: any[] = dataModel?.ds?.metadata?.model_granted_roles || [];
      if (!granted.length) return true;

      let anyone = false;
      const allowedUsers: string[] = [];
      let matchedGroup = false;
      for (const p of granted) {
        if (p?.type === 'anyoneCanSee' && p?.permission === true) anyone = true;
        else if (p?.type === 'users') (p.users || []).forEach((u: any) => allowedUsers.push(String(u)));
        else if (p?.type === 'groups') {
          const g = (p.groups || []).map((x: any) => String(x));
          if (roles.some(r => g.includes(r))) matchedGroup = true;
        }
      }
      if (anyone || matchedGroup) return true;
      return allowedUsers.includes(String(user?._id || ''));
    } catch {
      return true;
    }
  }

  static async execQuery(alertQuery, user) {

    try {
      const connection = await ManagerConnectionService.getConnection(alertQuery.model_id);
      const dataModel = await connection.getDataSource(alertQuery.model_id);

      const dataModelObject = JSON.parse(JSON.stringify(dataModel));
      if (!MailingService.datamodelAllowed(dataModelObject, user)) {
        console.log(`[MailingService] execQuery: ${user?.email} sin acceso al datamodel, panel omitido`);
        return null;
      }
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
    } catch (err: any) {
      console.warn('[MailingService] execQuery:', err?.message || err);
      return null;
    }

  }

  static async execSqlQuery(alertQuery, user) {
    try {

      const connection = await ManagerConnectionService.getConnection(alertQuery.model_id);
      const dataModel = await connection.getDataSource(alertQuery.model_id);
      const dataModelObject = JSON.parse(JSON.stringify(dataModel));
      if (!MailingService.datamodelAllowed(dataModelObject, user)) {
        console.log(`[MailingService] execSqlQuery: ${user?.email} sin acceso al datamodel, panel omitido`);
        return null;
      }
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

    } catch (err: any) {
      console.warn('[MailingService] execSqlQuery:', err?.message || err);
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
      if (!MailingService.datamodelAllowed(dataModelObject, user)) {
        console.log(`[MailingService] execQueryRows: ${user?.email} sin acceso al datamodel, panel omitido`);
        return [];
      }
      const query = panelQuery?.query?.modeSQL
        ? connection.BuildSqlQuery(panelQuery.query, dataModelObject, user)
        : await connection.getQueryBuilded(panelQuery.query, dataModelObject, user);

      connection.client = await connection.getclient();
      const getResults = await connection.execQuery(query);
      return Array.isArray(getResults) ? getResults.slice(0, limit) : [];
    } catch (err: any) {
      console.warn('[MailingService] execQueryRows:', err?.message || err);
      return [];
    }
  }

  /** Data behind a KPI panel's `${pN.value...}` tokens. Plain `kpi` -> one item, no label.
   * `kpibar` / `kpiline` / `kpiarea` -> one item per category (label + number). null if unresolved. */
  static async execKpiSeries(panelQuery: any, user: any, chart: string): Promise<{ items: { label: string; value: number }[] } | null> {
    if (chart === 'kpi') {
      const v = panelQuery?.query?.modeSQL
        ? await MailingService.execSqlQuery(panelQuery, user)
        : await MailingService.execQuery(panelQuery, user);
      if (v === null || v === undefined || v === '') return null;
      return { items: [{ label: '', value: Number(v) || 0 }] };
    }
    const rows = await MailingService.execQueryRows(panelQuery, user, 5000);
    if (!rows.length) return null;
    const cols = Object.keys(rows[0]);
    let numCol: string | null = null;
    for (let c = cols.length - 1; c >= 0; c--) {
      if (rows.every(r => { const v = r[cols[c]]; return v === null || v === '' || Number.isFinite(Number(v)); })) { numCol = cols[c]; break; }
    }
    if (!numCol) return null;
    const labelCol = cols.find(c => c !== numCol) ?? null;
    return {
      items: rows.map(r => ({
        label: labelCol ? String(r[labelCol] ?? '') : '',
        value: Number(r[numCol as string]) || 0,
      })),
    };
  }

  private static fmtNum(n: number): string {
    return Number.isFinite(n) ? Number(n).toLocaleString('de-DE') : String(n);
  }

  /** Text for a `${pN.value...}` token given the panel's series and the token kind. */
  static kpiTokenValue(series: { items: { label: string; value: number }[] } | null, kind: string): string {
    if (!series || !series.items.length) return '';
    const items = series.items;
    const pair = (i: { label: string; value: number }) => i.label ? `${i.label}: ${MailingService.fmtNum(i.value)}` : MailingService.fmtNum(i.value);
    const total = items.reduce((s, i) => s + i.value, 0);
    switch (kind) {
      case 'top':       return pair(items.reduce((a, b) => (b.value > a.value ? b : a)));
      case 'bottom':    return pair(items.reduce((a, b) => (b.value < a.value ? b : a)));
      case 'average':   return MailingService.fmtNum(total / items.length);
      case 'breakdown': return items.map(pair).join(', ');
      default:          return MailingService.fmtNum(total);
    }
  }

}
