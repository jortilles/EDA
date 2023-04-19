import { NextFunction, Request, Response } from 'express';

export class welcome {

    static async welcome(req: Request, res: Response, next: NextFunction) {
        return res.status(200).json({ 'status': 'ok'});
    }
}