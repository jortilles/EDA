import { NextFunction, Request, Response } from "express";
import { HttpException } from '../global/model/index';
import ExcelSheetModel from "./model/excel-sheet.model";

export class ExcelSheetController {

    static async GenerateCollectionFromJSON(req: Request, res: Response, next: NextFunction) {
            return ExcelSheetController.FromJSONToCollection(req, res, next);
    }

    static async FromJSONToCollection(req: Request, res: Response, next: NextFunction) {
       //Guarda una nueva colección con el nombre pasado desde el frontal, si esta ya existe sustituye los campos del excel por los nuevos.
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
    static async ExistsExcelData(req: Request, res: Response, next: NextFunction) {
      //Checkea si hay documentos, en el nombre pasado por el frontal. Si los hay devuelve true para confirmar en el front
      try{
           if (!req.body?.name) return res.status(400).json({ ok: false, message: 'Nombre o campos incorrectos en la solicitud' });
           const excelModelChecker = ExcelSheetModel(req.body?.name), existentExcelDoc = await excelModelChecker.find({});
           if(existentExcelDoc.length > 0)   return res.status(200).json({ ok: true, message: 'Modelo existe' , existence: true });
           return res.status(200).json({ ok: true, message: 'Modelo existe' , existence: false });
      }catch(error){
        console.log("Error: ", error);
        return false;
      }
    }
      
      
      
}