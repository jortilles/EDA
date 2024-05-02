import { NextFunction, Request, Response } from "express";
import { HttpException } from '../global/model/index';
import * as mongoose from 'mongoose';
import { error } from "console";
import ExcelSheetModel from "./model/excel-sheet.model";
import { model } from "mongoose";

export class ExcelSheetController {

    static async GenerateCollectionFromJSON(req: Request, res: Response, next: NextFunction) {
            return ExcelSheetController.FromJSONToCollection(req, res, next);
    }

    static async FromJSONToCollection(req: Request, res: Response, next: NextFunction) {
        try {
          const excelName = req.body?.name;
          const excelFields = req.body?.fields;
      
          if (!excelName || !excelFields) return res.status(400).json({ ok: false, message: 'Nombre o campos incorrectos en la solicitud' });
    
            const excelModel =  ExcelSheetModel(excelName)
            const excelDocs = await excelModel.findOne({});
             
            if(excelDocs){
              excelDocs.key = excelFields
              excelDocs.save()
            }else{
            const savingData = new excelModel({ key: excelFields });
            await savingData.save(); 
          }
          return res.status(200).json({ ok: true, message: 'Modelo actualizado correctamente' });
        } catch (error) {
          console.error('Error al crear o actualizar el ExcelSheet:', error);
          next(new HttpException(500, 'Error al crear o actualizar el ExcelSheet'));
        }
      }
      
      
}