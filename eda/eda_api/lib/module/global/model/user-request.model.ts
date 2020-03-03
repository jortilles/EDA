import {Request} from "express";

export interface IUserRequest extends Request {
    body: any;
    user: any;
}
