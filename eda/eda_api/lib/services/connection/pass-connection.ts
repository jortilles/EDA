import {Request, Response, NextFunction} from "express";
import _ = require('lodash');

const jwt = require ('jsonwebtoken');
const SEED = require('../../config/seed').SEED;
const errorModel = require('../module/global/model/error.model');



export const PassConnection = async function (req: Request, res: Response, next: NextFunction) {
    const user = req.body.user.user_id;
    const roles = req.body.user.EDA_USER_ROLEs;


    if ( !_.isNil(user) ) {
        const query = req.body.query.fields;
        const columns = [];

        for(let i = 0, n = query.length; i < n; i+=1) {
            columns.push(query[i])
        }

        next();

    } else {
        return res.status(401).json(new errorModel('User required'));
    }
};
