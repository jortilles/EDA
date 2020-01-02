const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const roles = {
    values: ['ADMIN_ROLE', 'USER_ROLE'],
    message: '{VALUE} no es un role permitido'
};

const UserSchema = mongoose.Schema({
    name: { type: String, required: [true, 'El nombre es necesario'] },
    email: { type: String, unique: true, required: [true, 'El mail es necesario'] },
    password: { type: String, required: [true, 'La contraseña es necesaria'] },
    img: { type: String, required: false },
    role: { type: String, required: true, default: 'USER_ROLE', enum: roles },
}, {collection: 'users', strict: false});

UserSchema.plugin( uniqueValidator, { message: 'Ya existe un usuario con este {PATH}' } );

module.exports = mongoose.model('User', UserSchema);
