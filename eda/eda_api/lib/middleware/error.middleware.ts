import { NextFunction, Request, Response } from "express";
import HttpException from '../module/global/model/http-exception.model';

function errorMiddleware(error: HttpException, request: Request, response: Response, next: NextFunction) {
    const status = error.status || 500;
    const message = error.message || 'Something went wrong';

    response
        .status(status)
        .json({
            status,
            message,
        });
}

export default errorMiddleware;
