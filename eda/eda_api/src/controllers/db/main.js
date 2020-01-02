const mDB = require('./mongo_queries');
const DS = require('../global/data-source-controller');
const PM = require('./postgres/postgres_manager');
const GM = require('./postgres/generate_data_source');
const permissions = require('./check_permissions');
const cn_model = require('../../models/global/connection_model');


//-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------
/** Main post function **/
exports.connection = async (req, res, err) => {
  console.log('\n\x1b[34m=========================\x1b[0m \x1b[33mQuery processing\x1b[0m \x1b[34m=========================\x1b[0m\n');
  /** Get user and roles **/
  /** Get data model from mongoDB **/
  try {
    const data_model = await mDB.get_datasource(req.body.model_id);
    //console.log(req.body.model_id);
    const json_data = JSON.parse(JSON.stringify(data_model));
    const connection_properties = json_data.ds.connection;

    //Get connection properties
    const cn = {
      user: connection_properties.user,
      host: connection_properties.host,
      database: connection_properties.database,
      password: connection_properties.password,
      port: connection_properties.port
    }
    // console.log('\x1b[32m%s\x1b[0m', 'Database properties:\n');
    // console.log(cn);

    /** Check permissions to-do **/
    const authorized = await permissions.check_permissions(req);
    if (!authorized) {
      throw Error('Not authorized to do this query');
    };

    /** check db type to-do & query to postgres **/
    if (db_type() === 'postgres') {
      try {
        await PM.postgreSQL_query(req, res, cn, json_data);
      }
      catch (e) {
        return res.status(400).json({
          ok: false,
          message: e,
        })
      }
    } else {
      return res.status(400).json({
        ok: false,
        message: 'FOR THE MOMENT ONLY POSTGRES QUERIES ARE ALLOWED',
      });
    }

  } catch (e) {
    // console.log('e');
    return res.status(400).json({
      ok: false,
      message: e,
    });
  }

}

//----------------------------------------------------------------------------------------------------------------------
function db_type() {
  return 'postgres';
}

/*Checks if connection is valid with given params -> req.query*/
exports.check_db = async (req, res) => {
  let cn = new cn_model(req.query.user, req.query.host, req.query.database, req.query.password, req.query.port);
  if (req.query.type != 'postgres') {
    return res.status(400).json({
      ok: false,
      message: 'Only postgres db is implemented',
    })
  } else {
    try {
      return await PM.check_postgreSQL_connection(res, cn);
    } catch (err) {
      throw err;
    }
  }
}

/** Generates a new datasource **/
exports.generate_data_model = async (req, res) => {
  if (req.body.type === 'postgres') {
    try {
      const ds = await GM.generate_datamodel(req);
      const data_source = await DS.createDataSource(ds);
      return res.status(200).json({ ok: true, data_source_id: data_source._id });
    } catch (e) {
      return res.status(400).json({ ok: false, message: `Error saving datasource`, errors: e });
    }
  } else {
    return res.status(400).json({ ok: false, message: `Only postgreSQL is implemented` });
  }
}


/*Generates DBmodel from DB and compare it with the one stored in mongo DB with same connection properties. 
* MongoDb model is updated if there have been changes in DB since  mongoDB model was created. 
**/
exports.refreshDatamodel = async (req, res) => {
  
  if (req.body.type != 'postgres') {
    return res.status(400).json({
      ok: false,
      message: 'Only postgres db is implemented',
    })
  } else {
    try {
      const ds = await GM.generate_datamodel(req);
      const newModel = await GM.update_model(req.params.id, ds);

      return GM.updateMongoModel(req.params.id, newModel, res);

    } catch (err) {
      return res.status(400).json({ ok: false, message: 'Error in refresh', errors: err });
    }
  }
}




























