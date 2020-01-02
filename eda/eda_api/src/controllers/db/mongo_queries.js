const ds = require('../../models/global/data-source-model');



exports.get_datasource = async (id) => {
    return await ds.findOne({ _id: id }, (err, datasource) => {
      if (err) {
        throw Error(err);
      }
      return datasource;
    });
}

// exports.get_datasource = async (id) => {
//   try {
//     return await ds.findOne({ _id: id }, (err, datasource) => {
//       if (err) {
//         throw err;
//       } else {
//         return datasource;
//       }
//     });
//   } catch (e) {
//     throw e;
//   }
// }