import * as mongoose from 'mongoose';
import { IGroup } from '../../admin/groups/model/group.model';
import { IUser } from '../../admin/users/model/user.model';

export interface IDashboard extends mongoose.Document {
    config: IDashboardConfig;
    user: IUser;
    group: IGroup[];
}

interface IDashboardConfig {
    createdAt: Date;
    modifiedAt: Date;
    sendViaMailConfig: any;
    title: string;
    visible: string;
    ds: any;
    panel: any[];
    onlyIcanEdit: boolean;
    styles:any;
}

const DashboardSchema = new mongoose.Schema({
    config: { type: Object },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    group: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: false }],
}, { collection: 'dashboard', strict: false });

export default mongoose.model<IDashboard>('Dashboard', DashboardSchema);
