import { NextFunction, Request, Response } from 'express';
import { HttpException } from '../global/model/index';
import { MailingService } from '../../services/mailingService/mailing.service'; //borrar
const fs = require('fs');
const path = require("path");
let nodemailer = require('nodemailer');

const CONFIG_PATH = path.resolve(__dirname, '../../../config/SMPT.config.json');

function readConfig(): any {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}

function writeConfig(data: any): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 4), 'utf8');
}

export class MailController {

  /** Verifies the SMTP connection and sends one email, rejecting with an HttpException on either failure */
  private static verifyAndSend(config: any, mailOptions: { from: string; to: string; subject: string; text: string }): Promise<void> {
    const transporter = nodemailer.createTransport({ ...config, family: 4 });
    return new Promise((resolve, reject) => {
      transporter.verify((error: any) => {
        if (error) return reject(new HttpException(501, error.message));
        transporter.sendMail(mailOptions, (sendErr: any) => {
          if (sendErr) return reject(new HttpException(501, 'No se pudo enviar el email de prueba: ' + sendErr.message));
          resolve();
        });
      });
    });
  }

  static async checkCredentials(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body;
      const configType = body?.configType || 'SMPT';
      const config = { ...body, family: 4 };

      // If SMTP and no password provided, use saved one
      if (configType === 'SMPT' && !config.auth?.pass) {
        try {
          const saved = readConfig();
          config.auth.pass = saved.auth?.pass ?? null;
        } catch { }
      }

      const senderEmail = config.auth?.user;
      await MailController.verifyAndSend(config, {
        from: senderEmail,
        to: senderEmail,
        subject: 'EDA - Test de configuración de correo',
        text: `La configuración de correo de EDA es correcta.\n\nTipo: ${configType}\nHost: ${config.host}:${config.port}\nUsuario: ${senderEmail}`
      });
      return res.status(200).json({ ok: true });

    } catch (err) {
      return next(err instanceof HttpException ? err : new HttpException(501, 'Error en el fichero de configuración'));
    }
  }

  static async saveCredentials(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body;
      const configType = body.configType || 'SMPT';

      let saved: any = {};
      try { saved = readConfig(); } catch { }

      if (configType === 'GMAIL') {
        const unified = {
          ...saved,
          configType: 'GMAIL',
          host: body.host ?? saved.host,
          port: body.port ?? saved.port,
          secure: body.secure ?? saved.secure,
          auth: {
            type: 'OAuth2',
            user: body.auth?.user ?? saved.auth?.user,
            pass: 'XXXX',
            clientId: body.auth?.clientId ?? saved.auth?.clientId,
            clientSecret: body.auth?.clientSecret ?? saved.auth?.clientSecret,
            refreshToken: body.auth?.refreshToken ?? saved.auth?.refreshToken,
          },
          tls: body.tls ?? saved.tls,
        };
        writeConfig(unified);
      } else {
        // Keep Gmail credentials, update SMTP fields, mask OAuth fields
        const pass = body.auth?.pass && body.auth.pass !== 'XXXX'
          ? body.auth.pass
          : (saved.auth?.pass && saved.auth.pass !== 'XXXX' ? saved.auth.pass : null);

        const unified = {
          ...saved,
          configType: 'SMPT',
          host: body.host ?? saved.host,
          port: body.port ?? saved.port,
          secure: body.secure ?? saved.secure,
          auth: {
            type: 'XXXX',
            user: body.auth?.user ?? saved.auth?.user,
            pass: pass,
            clientId: 'XXXX',
            clientSecret: 'XXXX',
            refreshToken: 'XXXX',
          },
          tls: body.tls ?? saved.tls,
        };
        writeConfig(unified);
      }

      const finalConfig = readConfig();
      MailController.sendConfigConfirmationEmail(finalConfig);
      return res.status(200).json({ ok: true });

    } catch (err) {
      return next(new HttpException(501, 'Error saving configuration'));
    }
  }

  static async getCredentials(_req: Request, res: Response, next: NextFunction) {
    try {
      const config = readConfig();
      // Never expose SMTP password to the frontend
      const sanitized = { ...config, auth: { ...config.auth, pass: null } };
      return res.status(200).json({ ok: true, config: sanitized });
    } catch (err) {
      return next(new HttpException(501, 'Error loading configuration'));
    }
  }

  private static async sendConfigConfirmationEmail(config: any) {
    const recipientEmail = config.auth?.user;
    if (!recipientEmail) return;

    try {
      await MailController.verifyAndSend(config, {
        from: recipientEmail,
        to: recipientEmail,
        subject: 'EDA - Configuración de mailing establecida correctamente',
        text: `El servicio de mailing de EDA ha sido configurado correctamente.\n\n` +
          `Host: ${config.host}:${config.port}\n` +
          `Usuario: ${recipientEmail}\n\n` +
          `A partir de ahora los dashboards y alertas configurados con envío por correo serán enviados según su programación.`
      });
    } catch { }
  }

  /** Sends an immediate test email using the saved SMTP config, for the "Probar" button in the KPI/dashboard mail-config dialogs */
  static async testSend(req: Request, res: Response, next: NextFunction) {
    try {
      const { to, subject, message } = req.body;
      const recipients: string[] = (Array.isArray(to) ? to : [to]).filter(Boolean);
      if (recipients.length === 0) {
        return next(new HttpException(400, 'No hay destinatarios configurados'));
      }

      const config = readConfig();
      await MailController.verifyAndSend(config, {
        from: config.auth?.user,
        to: recipients.join(', '),
        subject: subject || 'EDA - Correo de prueba',
        text: message || 'Correo de prueba enviado desde EDA.'
      });
      return res.status(200).json({ ok: true });

    } catch (err) {
      return next(err instanceof HttpException ? err : new HttpException(501, 'Error en el fichero de configuración de correo'));
    }
  }

  static async sendNow(_req: Request, res: Response, next: NextFunction) {
    try {
      MailingService.mailingService(false);
      return res.status(200).json({ ok: true });
    } catch (err) {
      return next(new HttpException(501, 'Error triggering mail service'));
    }
  }

}
