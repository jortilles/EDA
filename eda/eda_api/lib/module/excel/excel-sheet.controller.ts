import { NextFunction, Request, Response } from "express";
import { HttpException } from '../global/model/index';
import ExcelSheetModel from "./model/excel-sheet.model";
import DataSource,{ IDataSource } from "../datasource/model/datasource.model";
import { EnCrypterService } from "../../services/encrypter/encrypter.service";
const databaseUrl = require('../../../config/database.config');


export class ExcelSheetController {

    static async GenerateCollectionFromJSON(req: Request, res: Response, next: NextFunction) {
            return ExcelSheetController.FromJSONToCollection(req, res, next);
    }
    static async FromJSONToCollection(req: Request, res: Response, next: NextFunction) {
       //Guarda una nueva colección con el nombre pasado desde el frontal, si esta ya existe sustituye los campos del excel por los nuevos.
        try {
          const excelName = req.body?.name;
          let excelFields = req.body?.fields;
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
            await this.ExcelCollectionToDataSource(excelName,excelFields, res, next);
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
    static async ExcelCollectionToDataSource(excelName,excelFields, res:Response, next:NextFunction){
            //Declaramos un objeto que va a contener los tipos y nombres de los campos del Excel
            const propertiesAndTypes = {};
            excelFields.forEach(object => {
                Object.entries(object).forEach(([property, value]) => {
                  if(typeof value === 'number') propertiesAndTypes[property] = 'numeric';
                  if(typeof value === 'string') propertiesAndTypes[property] = 'text';                  
                  console.log("VALOR: ", value, "TYPE: ", typeof value )
                });});
            const propertiesAndTypesArray = Object.entries(propertiesAndTypes).map(([name, type]) => ({ name, type })), columnsEntry = [];
            console.log("PROPIEDADES: ", propertiesAndTypes)
            //Mapeado de las columnas
            propertiesAndTypesArray.forEach((column) => {
              let newCol =  {
                column_name: column.name,
                column_type: column.type as string,
                display_name: {
                    default: column.name,
                    localized: []
                },
                description: {
                    default: column.name,
                    localized: []
                },
                minimumFractionDigits: 0,
                aggregation_type: [

                ],
                column_granted_roles: [],
                row_granted_roles: [],
                visible: true,
                tableCount: 0,
                valueListSource: {},
              }
              columnsEntry.push(newCol);
            });
      //Construcción del objeto table
      const dsTableObject =
      [  
       {
          table_name: excelName ,
          display_name : {
            default : excelName,
            localized : []
        },
        description: {
            default : excelName,
            localized : []
        },
        table_granted_roles : [],
        table_type : [],
        columns: columnsEntry,
        relations : [],
        visible : true,
        tableCount : 0,
        no_relations : []
       }
      ];
      try{
        if(!databaseUrl?.url) return res.status(400).json({ ok: false, message: 'La connexión a la base de datos no existe' });

        
        const parsedUrl = new URL(databaseUrl?.url);
        //Transformar a datasource con todo inicializado a vacio
        const database = parsedUrl.pathname.substring(1); 
        const { host, port, password} = parsedUrl;
        const datasource: IDataSource = new DataSource({
          ds: {
              connection: {
                  type: "mongodb",
                  host: host.substring(0, host.indexOf(':')),
                  port: Number(port),
                  database,
                  schema:"public",
                  searchPath:"public",
                  user: parsedUrl.username,
                  password: EnCrypterService.encrypt(password),
                  poolLimit:null,
                  sid:null,
                  warehouse:null,
                  ssl:false
              },
              metadata: {
                model_name:excelName,
                model_id:"",
                model_granted_roles:[],
                optimized:false,
                cache_config:{
                  units:"",
                  quantity:1,
                  hours:"",
                  minutes:"",
                  enabled:true
                },
                filter:null,
                model_owner:"",
                tags:[],
                external:{}
              },
              model: {
                  tables: dsTableObject
              }
          }
        });

      datasource.save((err, data_source) => {
          if (err) {
              return next(new HttpException(500, `Error saving the datasource`));
          }

          return res.status(201).json({ ok: true, data_source_id: data_source._id });
      });

      }catch(error){
        console.log("Error al parsear el excel: ", error);
      }
    }
      
}