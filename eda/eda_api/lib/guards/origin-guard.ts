import { Request, Response, NextFunction } from 'express';
import { HttpException } from '../module/global/model/index';
const SEED = require('../../config/seed').SEED;
const jwt = require('jsonwebtoken');

export const originGuard = async function (req: Request, res: Response, next: NextFunction) {

  jwt.verify(req.params.token, SEED, (err, decoded) => {

    if (err) {
      return next(new HttpException(401, `Invalid Token: ${err.message}`));
    } else {

      if (!isThisLocalhost(req)) {
        return next(new HttpException(401, `Invalid Origin: ip=${req.socket.remoteAddress}, host=${req.get('host')}`));
      } else {
        next();
      }
    }
  });

}

const isThisLocalhost = (req) => {

  var ip = req.socket.remoteAddress;
  var host = req.get('host');

  const result = ip === "127.0.0.1" || ip === "::ffff:127.0.0.1" || ip === "::1" || host.indexOf("localhost") !== -1;
  console.log(`[originGuard] ip: ${ip} | host: ${host} | req.ip: ${req.ip} | x-forwarded-for: ${req.headers['x-forwarded-for']} | isLocalhost: ${result}`);

  return result;
}