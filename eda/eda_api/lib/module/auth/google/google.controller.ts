import { NextFunction, Request, Response } from 'express';
import { HttpException } from '../../global/model/index';
import { ActiveDirectoryService } from '../../../services/active-directory/active-directory.service';
import ServerLogService from '../../../services/server-log/server-log.service';
import * as path from 'path';
import * as fs from 'fs';
import { QueryOptions } from 'mongoose';



const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const SEED = require('../../../../config/seed').SEED;
const crypto = require('crypto');

function AASingleSingnOn(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
  
    descriptor.value = async function (req: Request, res: Response, next: NextFunction) {
      console.log('Nueva lógica de Single Sign On', req.body);
      return res.status(200).json({ok: 'nuevo sign on'});
    };
}

export class GoogleController {


    static async credentialGoogle(req: Request, res: Response, next: NextFunction) {
        
        const {credential} = req.body.resp

        console.log('credential reception: ',credential)

        res.json({
            ok: true,
            respGoogle: req.body.resp
        })

    }
}

