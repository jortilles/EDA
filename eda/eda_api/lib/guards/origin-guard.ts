import { Request, Response, NextFunction } from 'express';
import { HttpException } from '../module/global/model/index';
const SEED = require('../../config/seed').SEED;
const jwt = require('jsonwebtoken');

export const originGuard = async function (req: Request, res: Response, next: NextFunction) {

  jwt.verify(req.params.token, SEED, (err, decoded) => {

    if (err) {
      return next(new HttpException(401, 'Invalid Token'));
    } else {
      
      if (!isThisLocalhost(req)) {
        return next(new HttpException(401, 'Invalid Origin'));
      } else {
        next();
      }
    }
  });

}

const isThisLocalhost = (req) => {

  var ip = req.socket.remoteAddress;
  var host = req.get('host');

  console.log(ip, host, req.ip, req.headers['x-forwarded-for'])

  return ip === "127.0.0.1" || ip === "::ffff:127.0.0.1" || ip === "::1" || host.indexOf("localhost") !== -1;
}