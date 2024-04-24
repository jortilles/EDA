import * as mongoose from 'mongoose';

export interface IExcelSheet extends mongoose.Document {
    name:string,
    fields:any
}

const ExcelSheetSchema = new mongoose.Schema({
    name:{type: String},
    fields:{type: Object},
},{collection:'excel-sheets'});
export default mongoose.model<IExcelSheet>('ExcelSheet',ExcelSheetSchema);