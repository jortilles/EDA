import * as mongoose from 'mongoose';

export interface IDataSource extends mongoose.Document {
    ds: any;
}

const DataSourceSchema = new mongoose.Schema({
    ds: { type: Object },
    // user: { type: mongoose.Schema.Types.ObjectId, ref:'User', required: true}
},{ collection: 'data-source' });

export default mongoose.model<IDataSource>('DataSource', DataSourceSchema);
