import mongoose from 'mongoose';

export interface IMediaFolder extends mongoose.Document {
    name: string;
    parentId: string | null; // media-folders _id, null = root
    createdAt: Date;
}

const MediaFolderSchema = new mongoose.Schema({
    name: { type: String, required: true },
    parentId: { type: String, required: false, default: null },
    createdAt: { type: Date, default: Date.now },
}, { collection: 'media-folders', strict: false });

export default mongoose.model<IMediaFolder>('MediaFolder', MediaFolderSchema);
