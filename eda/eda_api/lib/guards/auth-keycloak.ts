import { Request, Response, NextFunction } from 'express';
import { HttpException } from '../module/global/model/index';

import _ = require('lodash');
const jwt = require ('jsonwebtoken');
const serverConfig = require('../../config/keycloak.config');


export const authKeycloak = async function (req: Request, res: Response, next: NextFunction) {
 
    const dataKC = req.body;
    const {access_token} = dataKC;
    const public_key = `-----BEGIN PUBLIC KEY-----\n${serverConfig.PUBLIC_KEY}\n-----END PUBLIC KEY-----`;

    // Decode de keycloak token
    if( !_.isNil(access_token) ) {

        jwt.verify(access_token, public_key, {
            algorithms: ['RS256'],
        }, (err, decoded) => {
            if(err) return next(new HttpException(401, 'Invalid or Expired Token'));

            req.decoded = decoded;
            next();
        });

    } else {
        return next(new HttpException(401, 'Token required'));
    }

};
