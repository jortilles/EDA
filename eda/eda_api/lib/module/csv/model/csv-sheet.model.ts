import * as mongoose from 'mongoose';

export interface ICsvSheet extends mongoose.Document {
    key: any;
}

const CsvSheetSchema = new mongoose.Schema({
    key: { type: Object },
});

// Función segura que no sobrescribe modelos ya registrados
const CsvheetModel = (name: string) => {
    const modelName = `csv_sheet_${name}`;   // prefijo opcional para evitar choques
    return mongoose.models[modelName] || 
           mongoose.model<ICsvSheet>(modelName, CsvSheetSchema, `csv_${name}`);
};

export default CsvheetModel;
