import { NextFunction, Request, Response } from 'express';

export class SAMLController {


    static async login(req: Request, res: Response, next: NextFunction) {

        return true;
    }

}