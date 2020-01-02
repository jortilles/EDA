const mongoose = require('mongoose');

const DashboardSchema = mongoose.Schema({
    config: { type: Object},
    user: { type: mongoose.Schema.Types.ObjectId, ref:'User', required: true }
},{ collection: 'dashboard', strict: false });

 
// title: { type: String, required: true },
// ds: { type: mongoose.Schema.Types.ObjectId, ref:'DataSource', required: true },
// panel: [
//     {
//         id: { type: String },
//         title: { type: String },
//         w: { type: Number },
//         h: { type: Number },
//         dragAndDrop: { type: Boolean },
//         resizable: { type: Boolean },
//         x: { type: Number },
//         y: { type: Number },
//         content: {
//             query: {
//                 id: { type: String },
//                 model_id: { type: String },
//                 user: {
//                     user_id: { type: String },
//                     user_roles: [String]
//                 },
//                 dashboard: {
//                     dashboard_id: { type: String },
//                     panel_id: { type: String }
//                 },
//                 query: {
//                     fields: { type: Array }
//                 },
//                 filters: { type: Array },
//                 output: { type: Object },
//                 chart: { type: String }
//             }
//         }
//     }
// ]


module.exports = mongoose.model('Dashboard', DashboardSchema);