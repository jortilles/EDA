import { NextFunction, Request, Response } from 'express';
import { HttpException } from '../global/model/index';
const fs = require('fs');
const path = require("path");


let nodemailer = require('nodemailer');

export class MailController {

  static async checkCredentials(req: Request, res: Response, next: NextFunction) {

    try {

      const transporter = nodemailer.createTransport(req.body);
      const verify = transporter.verify((error, sucess) => {
        if (error) {
          return next(new HttpException(501, 'Error in SMPT configuration file'));
        } else {
          return res.status(200).json({ ok: true });
        }
      });

    } catch (err) {
      return next(new HttpException(501, 'Error in SMPT configuration file'));
    }

  }

  static async saveCredentials(req: Request, res: Response, next: NextFunction) {

    try {

      fs.writeFile(`config/SMPT.config.json`, JSON.stringify(req.body), 'utf8', (err) => {
        if (err) return next(new HttpException(404, 'Error saving configuration'));
        return res.status(200).json({ ok: true });
      });

    } catch (err) {
      return next(new HttpException(501, 'Error saving configuration'));
    }

  }

  static async getCredentials(req: Request, res: Response, next: NextFunction) {

    try {

      const config = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../config/SMPT.config.json"), 'utf-8'));
      config.auth.pass = null;
      return res.status(200).json({ ok: true, config: config });
      
    } catch (err) {
      return next(new HttpException(501, 'Error loading configuration'));
    }

  }


}