import { NextFunction, Request, Response } from "express";
import ExcelSheet, { IExcelSheet } from "./model/excel-sheet.model";
import { HttpException } from '../global/model/index';

export class ExcelSheetController {

    static async GenerateCollectionFromJSON(req: Request, res: Response, next: NextFunction) {
            return ExcelSheetController.FromJSONToCollection(req, res, next);
    }

    static async FromJSONToCollection(req: Request, res: Response, next: NextFunction) {
        try {
            const body = req.body;
            if(body?.name && body?.fields){
                const existingExcelSheet = await ExcelSheet.findOne({name:body.name});
                if(!existingExcelSheet){
                    console.log('Importing new excel-sheet');
                    const newExcelSheet = new ExcelSheet(body);
                    await newExcelSheet.save();
                }
                if(existingExcelSheet){
                    console.log('Updating the existent excel-sheet');
                    existingExcelSheet.set(body);
                    await existingExcelSheet.save();
                }
                return res.status(200).json({ ok: true, message: 'Modelo actualizado correctamente' });
            }
        }catch(error){
            console.error('Error al crear o actualizar el ExcelSheet:', error);
            next(new HttpException(500, 'Error al crear o actualizar el ExcelSheet'));
        }
    }

    static async ExcelCollectionFromDatabase(req: Request, res: Response, next: NextFunction){
        try{
            if(req.qs?.name){
                return await ExcelSheet.findOne({name:req.qs?.name}, (err,excelSheet) =>{
                    if (err) return next(new HttpException(404, 'Error loading ExcelSheet'));
                    if(excelSheet) return res.status(200).json({ ok: true, ds: excelSheet });
                });
            }else return await ExcelSheet.find({}, (err,excelSheets)=>{
                if (err) return next(new HttpException(404, 'Error loading ExcelSheets'));
                if(excelSheets) return res.status(200).json({ ok: true, ds: excelSheets });
            });
        }catch(error){
            console.error('Error al obtener el ExcelSheet:', error);
            next(new HttpException(500, 'Error al obtener el ExcelSheet'));
        }
    }
    
    static async GetCollectionFromJSON(req: Request, res: Response, next: NextFunction) {
        return ExcelSheetController.ExcelCollectionFromDatabase(req, res, next);
    }   
}