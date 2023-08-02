import mongoose from 'mongoose';
import { IGroup } from '../../groups/model/group.model';
const uniqueValidator = require('mongoose-unique-validator');

const roles = {
    values: ['EDA_ADMIN_ROLE', 'EDA_USER_ROLE'],
    message: '{VALUE} no es un role permitido'
};


export interface IUser extends mongoose.Document {
    name: String;
    email: String;
    password: String;
    img: String;
    role: any;
    active: Boolean;
}


const UserSchema = new mongoose.Schema({
    name: { type: String, required: [true, 'El nombre es necesario'] },
    email: { type: String, unique: true, required: [true, 'El mail es necesario'] },
    password: { type: String, required: [true, 'La contraseña es necesaria'] },
    img: { type: String, required: false },
    role: [{ type: mongoose.Types.ObjectId, ref: 'Group' }],
    active: { type:String, required:false}
}, { collection: 'users', strict: false });

UserSchema.plugin(uniqueValidator, { message: 'Ya existe un usuario con este {PATH}' });

export default mongoose.model<IUser>('User', UserSchema);

