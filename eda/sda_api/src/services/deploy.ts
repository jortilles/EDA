import { NextFunction, Request, Response, Router } from 'express';
import { exec, execFile, ChildProcess, spawn } from 'child_process';
import { Connections } from '../config/connections';
import fs from "fs"
import mongoose, { mongo, Mongoose } from 'mongoose'; 


export class deploy {

    static execute(req: Request ) {

        var yourscript = exec("C:\\Users\\jortilles\\hola.bat " + req.query.host,
            (error, stdout, stderr) => {
                console.log(stdout);
                console.log(stderr);
                if (error !== null) {
                    console.log(`exec error: ${error}`);
                }
            });

    }

    public static async postDashboard(req: Request, res: Response) {
        
        const obj = req.body
        const _id = obj._id
        

        const DashBoard = new mongoose.Schema({
            group: { type: [] },
            config: {type: Object},
            user: {type: mongo.ObjectId}
        },{ collection: 'dashboard' });

        try {
            const DashBoardEda = mongoose.model('dashboard', DashBoard)
                } catch (err) {    }
            const DashBoardEda = mongoose.model('dashboard')

            const data = await DashBoardEda.findByIdAndUpdate({_id:_id},{config: obj.config})
            
                console.log(data)
        
                return data
    }



}



