import { Request, Response, NextFunction } from 'express';
const qs = require('qs');

export const callInterceptor = function(req: Request, res: Response, next: NextFunction) {
    // a partir de la la versió 4.17.2 de @types/express i express-serve-static-core el query deixa de ser any i passa a tenir type
    // degut aixo les api donen error de compilació. Per solucionar aquest problema fem servir el paquet qs que
    // converteix el query en un objecte de tipus any, i des de les apis fem servir només req.qs
    req.qs = qs.parse(req.query);
    req.query = undefined;

    next();
}