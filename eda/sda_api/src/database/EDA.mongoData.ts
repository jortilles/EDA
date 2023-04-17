import mongoose, { mongo } from "mongoose";
import { Connections } from "../config/connections";
import { Request } from "express";
import { DashBoard } from "./models/dashboard";

export class MongoData {

    public async getDashboardData(req : Request) : Promise<string> {
        const user = req.params.user

         
                const DashBoardEda = await new DashBoard().dashboard()
                    
                const dashBoardData = await DashBoardEda.findOne({user:user})
            
            
            return await dashBoardData.then(err => { if (err) return err; dashBoardData.toString() });
            
    }


}