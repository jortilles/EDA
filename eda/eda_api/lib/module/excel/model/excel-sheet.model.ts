import * as mongoose from 'mongoose';

export interface IExcelSheet extends mongoose.Document {
    key:any
}

const ExcelSheetSchema = new mongoose.Schema({
    key:{type: Object},
});
//Función que recibe el nombre del modelo, el esquema y posteriormente el nombre de la colección donde se va a guardar el modelo
const ExcelSheetModel = (name:string) =>{
 return mongoose.model<IExcelSheet>( name, ExcelSheetSchema, `xls_${name}`);
}

export default ExcelSheetModel;