import * as mongoose from 'mongoose';

export interface IExcelSheet extends mongoose.Document {
    key:any
}

const ExcelSheetSchema = new mongoose.Schema({
    key:{type: Object},
});

const ExcelSheetModel = (name:string) =>{
 return mongoose.model<IExcelSheet>( name, ExcelSheetSchema);
}

export default ExcelSheetModel;