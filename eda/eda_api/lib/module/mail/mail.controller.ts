import { NextFunction, Request, Response } from 'express';
import { HttpException } from '../global/model/index';
const fs = require('fs');
const path = require("path");
let nodemailer = require('nodemailer');

const SMPT_CONFIG_PATH = path.resolve(__dirname, '../../../config/SMPT.config.json');
const GMAIL_CONFIG_PATH = path.resolve(__dirname, '../../../config/GMAIL.config.json');

function readConfigFile(filePath: string): any {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export class MailController {

  static async checkCredentials(req: Request, res: Response, next: NextFunction) {
    try {
      const config = req.body;
      const configType = config?.configType || 'SMPT';

      if (configType === 'SMPT' && !config.auth?.pass) {
        try {
          const saved = readConfigFile(SMPT_CONFIG_PATH);
          config.auth.pass = saved.auth?.pass ?? null;
        } catch { }
      }

      const senderEmail = config.auth?.user;
      const transporter = nodemailer.createTransport(config);

      transporter.verify((error: any) => {
        if (error) {
          return next(new HttpException(501, error.message));
        }

        const mailOptions = {
          from: senderEmail,
          to: senderEmail,
          subject: 'EDA - Test de configuración de correo',
          text: `La configuración de correo de EDA es correcta.\n\nTipo: ${configType}\nHost: ${config.host}:${config.port}\nUsuario: ${senderEmail}`
        };

        transporter.sendMail(mailOptions, (sendErr: any) => {
          if (sendErr) {
            return next(new HttpException(501, 'Conexión correcta pero no se pudo enviar el email de prueba: ' + sendErr.message));
          }
          return res.status(200).json({ ok: true });
        });
      });

    } catch (err) {
      return next(new HttpException(501, 'Error en el fichero de configuración'));
    }
  }

  static async saveCredentials(req: Request, res: Response, next: NextFunction) {
    try {
      const newConfig = req.body;
      const configType = newConfig.configType || 'SMPT';

      if (configType === 'GMAIL') {
        fs.writeFile(GMAIL_CONFIG_PATH, JSON.stringify(newConfig, null, 4), 'utf8', (err: any) => {
          if (err) {
            return next(new HttpException(404, 'Error saving Gmail configuration'));
          }

          try {
            const smtpConfig = readConfigFile(SMPT_CONFIG_PATH);
            smtpConfig.configType = 'GMAIL';
            fs.writeFileSync(SMPT_CONFIG_PATH, JSON.stringify(smtpConfig, null, 4), 'utf8');
          } catch { }

          MailController.sendConfigConfirmationEmail(newConfig);
          return res.status(200).json({ ok: true });
        });

      } else {
        if (!newConfig.auth?.pass) {
          try {
            const existing = readConfigFile(SMPT_CONFIG_PATH);
            newConfig.auth.pass = existing.auth?.pass ?? null;
          } catch { }
        }

        fs.writeFile(SMPT_CONFIG_PATH, JSON.stringify(newConfig, null, 4), 'utf8', (err: any) => {
          if (err) {
            return next(new HttpException(404, 'Error saving configuration'));
          }

          let savedConfig: any;
          try {
            savedConfig = readConfigFile(SMPT_CONFIG_PATH);
          } catch {
            savedConfig = newConfig;
          }
          MailController.sendConfigConfirmationEmail(savedConfig);
          return res.status(200).json({ ok: true });
        });
      }

    } catch (err) {
      return next(new HttpException(501, 'Error saving configuration'));
    }
  }

  static async getCredentials(_req: Request, res: Response, next: NextFunction) {
    try {
      const smtpConfig = readConfigFile(SMPT_CONFIG_PATH);
      const activeType = smtpConfig.configType || 'SMPT';

      if (activeType === 'GMAIL') {
        const gmailConfig = readConfigFile(GMAIL_CONFIG_PATH);
        return res.status(200).json({ ok: true, config: gmailConfig });
      } else {
        smtpConfig.auth.pass = null;
        return res.status(200).json({ ok: true, config: smtpConfig });
      }
    } catch (err) {
      return next(new HttpException(501, 'Error loading configuration'));
    }
  }

  private static sendConfigConfirmationEmail(config: any) {
    try {
      const transporter = nodemailer.createTransport(config);
      const recipientEmail = config.auth?.user;

      if (!recipientEmail) return;

      transporter.verify((error: any) => {
        if (error) return;

        const mailOptions = {
          from: recipientEmail,
          to: recipientEmail,
          subject: 'EDA - Configuración de mailing establecida correctamente',
          text: `El servicio de mailing de EDA ha sido configurado correctamente.\n\n` +
            `Host: ${config.host}:${config.port}\n` +
            `Usuario: ${recipientEmail}\n\n` +
            `A partir de ahora los dashboards y alertas configurados con envío por correo serán enviados según su programación.`
        };

        transporter.sendMail(mailOptions, () => {});
      });
    } catch { }
  }

}
