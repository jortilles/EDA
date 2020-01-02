const mongoose = require('mongoose');

const DataSourceSchema = mongoose.Schema({
    ds: { type: Object },
    // user: { type: mongoose.Schema.Types.ObjectId, ref:'User', required: true}
},{ collection: 'data-source' });

module.exports = mongoose.model('DataSource', DataSourceSchema);

// connection: {
//     type: { type: String, required: true },
//     host: { type: String, required: true },
//     database: { type: String, required: true },
//     user: { type: String, required: true },
//     password: { type: String, required: true }
// },
// metadata: {
//     model_name: { type: String, required: true },
//     model_id: { type: String },
//     model_granted_roles: [ String ]
// },
// model: {
//     tables: [ String ]
// }