import * as mongoose from 'mongoose';

export interface ICustomHTML extends mongoose.Document {
    key: string;
    value: string;
    updatedAt: Date;
    updatedBy: string;
}

const CustomHTMLSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: { type: String, required: true },
    updatedAt: { type: Date, default: Date.now },
    updatedBy: { type: String },
}, { collection: 'customhtml' });

export default mongoose.model<ICustomHTML>('CustomHTML', CustomHTMLSchema);
