import * as mongoose from 'mongoose';
import { IUser } from '../../admin/users/model/user.model' 


export interface IAIUsage extends mongoose.Document {
    user: IUser;
    prompt: string;
    response?: string;
    modelUsed: string;
    temperature?: number;
    createdAt: Date;
    metadata?: {
        tags?: string[];
        [key: string]: any;
    };
}

const AISchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    prompt: { type: String, required: true },
    response: { type: String },
    modelUsed: { type: String, required: true, default: 'gpt-4o-mini-search-preview' },
    temperature: { type: Number, default: 0.7 },
    createdAt: { type: Date, default: Date.now },
    metadata: { type: Object },
}, {
    collection: 'chat_messages',
    timestamps: true,
    strict: true
})


export default mongoose.model<IAIUsage>('AIUsage', AISchema);