import mongoose from 'mongoose';

export interface IMedia extends mongoose.Document {
    filename: string;      // name of the file on disk (unique)
    originalName: string;  // original filename as uploaded by the user
    mimeType: string;
    size: number;           // bytes
    uploadedBy: string;     // user id
    folderId: string | null; // media-folders _id, null = root
    createdAt: Date;
}

const MediaSchema = new mongoose.Schema({
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedBy: { type: mongoose.Types.ObjectId, ref: 'User', required: false },
    folderId: { type: String, required: false, default: null },
    createdAt: { type: Date, default: Date.now },
}, { collection: 'media', strict: false });

export default mongoose.model<IMedia>('Media', MediaSchema);
