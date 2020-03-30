import { Response, NextFunction } from 'express';
import { IUserRequest, HttpException } from '../module/global/model/index';

import _ = require('lodash');
const SEED = require('../../config/seed').SEED;
const jwt = require ('jsonwebtoken');




export const authGuard = async function (req: IUserRequest, res: Response, next: NextFunction) {
    let token = req.query.token;
    // return next(new HttpException(401, 'Invalid Token'));
    if ( !_.isNil(token) ) {
        jwt.verify(token, SEED, (err, decoded) => {

            if (err) {
                return next(new HttpException(401, 'Invalid Token'));
            }

            req.user = decoded.user;

            let url = req.baseUrl + req.path;
            _.forEach(req.params, (v, k) => {
                url = url.replace('/' + v, '/:' + k);
            });

            // console.log('\x1b[34m=====\x1b[0m Route Guard -- url: [' + url + '] method: [' + req.method + '] userAuth: [ USER_ROLE ] \x1b[34m=====\x1b[0m');

            next();
        });
    } else {
        return next(new HttpException(401, 'Token required'));
    }
};
