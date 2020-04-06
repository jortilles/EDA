import * as mongoose from 'mongoose';
import {IUser} from '../../users/model/user.model';
const uniqueValidator = require('mongoose-unique-validator');

export interface IGroup extends mongoose.Document {
    name: String;
    role: String;
    users: IUser[];
    img: String;
}

const roles = {
    values: ['ADMIN_ROLE', 'USER_ROLE'],
    message: '{VALUE} no es un role permitido'
};

const GroupSchema = new mongoose.Schema({
    name: { type: String, required: [true, 'El nombre es necesario'] },
    role: { type: String, required: true, enum: roles },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    img: { type: String, required: false },
});

GroupSchema.plugin( uniqueValidator, { message: 'Ya existe un grupo con este {PATH}' } );

export default mongoose.model<IGroup>('Group', GroupSchema);
