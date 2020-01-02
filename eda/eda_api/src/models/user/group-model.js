const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const roles = {
    values: ['ADMIN_ROLE', 'USER_ROLE'],
    message: '{VALUE} no es un role permitido'
};

const GroupSchema = mongoose.Schema({
    name: { type: String, required: [true, 'El nombre es necesario'] },
    role: { type: String, required: true, enum: roles },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    img: { type: String, required: false },
});

GroupSchema.plugin( uniqueValidator, { message: 'Ya existe un grupo con este {PATH}' } );

module.exports = mongoose.model('Group', GroupSchema);
