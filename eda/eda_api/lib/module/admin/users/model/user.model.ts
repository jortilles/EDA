import * as mongoose from 'mongoose';
import {IGroup} from '../../groups/model/group.model';
const uniqueValidator = require('mongoose-unique-validator');

const roles = {
    values: ['ADMIN_ROLE', 'USER_ROLE'],
    message: '{VALUE} no es un role permitido'
};

export interface IUser extends mongoose.Document {
    name: String;
    email: String;
    password: String;
    img: String;
    role: IGroup[];
}


const UserSchema = new mongoose.Schema({
    name: { type: String, required: [true, 'El nombre es necesario'] },
    email: { type: String, unique: true, required: [true, 'El mail es necesario'] },
    password: { type: String, required: [true, 'La contraseña es necesaria'] },
    img: { type: String, required: false },
    role: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }],
}, {collection: 'users', strict: false});

UserSchema.plugin( uniqueValidator, { message: 'Ya existe un usuario con este {PATH}' } );

export default mongoose.model<IUser>('User', UserSchema);

