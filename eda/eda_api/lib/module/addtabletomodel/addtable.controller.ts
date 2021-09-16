import { NextFunction, Request, Response } from 'express';
import { HttpException } from '../global/model/index';
import ManagerConnectionService from '../../services/connection/manager-connection.service';




export class AddTableController {

  static async createTable(req: Request, res: Response, next: NextFunction) {
    try{
      let connection = await ManagerConnectionService.getConnection(req.body.model_id);
      connection.client = await connection.getclient();
      await connection.execQuery(`DROP TABLE IF EXISTS ${req.body.query.tableName}`);

      connection.client = await connection.getclient();
      const query = connection.createTable(req.body.query, req.user);
      await connection.execQuery(query);

      return res.status(200).json({ok:true});
    }catch(err){
      console.log(err);
      next(new HttpException(500, err));
    }
    
  }

  static async insertToTable(req:Request, res: Response, next : NextFunction){
    try{

      let connection = await ManagerConnectionService.getConnection(req.body.model_id);
      connection.client = await connection.getclient();
      const insert = connection.generateInserts(req.body.query, req.user);
      await connection.execQuery(insert);
      return res.status(200).json({ok:true});

    }catch(err){
      next( new HttpException(500, err));
    }
  }
}