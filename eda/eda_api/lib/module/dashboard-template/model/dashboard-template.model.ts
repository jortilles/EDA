import * as mongoose from 'mongoose';
import { IGroup } from '../../admin/groups/model/group.model';
import { IUser } from '../../admin/users/model/user.model';

export interface IDashboardTemplate extends mongoose.Document {
    name: string;
    description: string;
    config: ITemplateConfig;
    user: IUser;
    group: IGroup[];
    createdAt: Date;
    updatedAt: Date;
    lastUsedAt: Date;
    useCount: number;
    isPublic: boolean;
}

interface ITemplateConfig {
    title: string;
    ds: any;
    panel: any[];
    filters: any[];
    styles: any;
    applyToAllfilter: any;
    orderDependentFilters: any[];
    clickFiltersEnabled: boolean;
    refreshTime: number;
}

const DashboardTemplateSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, default: '' },
    config: { type: Object, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    group: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: false }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    lastUsedAt: { type: Date, default: Date.now },
    useCount: { type: Number, default: 0 },
    isPublic: { type: Boolean, default: false }
}, { collection: 'dashboard_template', strict: false });

export default mongoose.model<IDashboardTemplate>('DashboardTemplate', DashboardTemplateSchema);
