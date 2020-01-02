const { Pool, Client } = require('pg');
const QB = require('../postgres/query_builder')

/** Returns a postgres pool **/
async function connect_postgres(cn) {
  const pool = new Pool(cn);
  try {
    console.log('\x1b[32m%s\x1b[0m', 'Connecting to PostgreSQL databse...\n');
    const pclient = await pool.connect();
    console.log('\x1b[36m%s\x1b[0m', 'Successfully connected to PostgreSQL database! \n');
    return pclient;
  }
  catch (e) {
    //console.log(e);
    throw e;
  }
}

////
function new_pool(cn) {
  const pool = new Pool(cn);
  return pool;
}

/** Check connection **/
exports.check_postgreSQL_connection = async (res, cn) => {

  try {
    let  pool = new Pool(cn);
    let  client = await  pool.connect();
    client.release(true);
     return res.status(200).json({
      ok: true,
       message: 'Database config is ok',
     })
  }
  catch (err) {
    return res.status(400).json({
      ok: false,
      message: 'Datos incorrectos',
      errors: err
    })
  }
}


exports.postgreSQL_query = async (req, res, cn, data_model) => {
  try {
    /** get pool **/
    const client = await connect_postgres(cn);
    /** execute query **/
    const query = req.body.query;
    const getResults = await get_results(client, query, data_model);
    /** parse results and return **/
    const results = [];

    //Normalize data
    getResults.forEach(r => {
      const output = Object.keys(r).map(i => r[i]);
      results.push(output);
    });
    
    let output = [req.body.output.labels, results]

    //console.log(output);
    console.log('\x1b[32m%s\x1b[0m', '\nOK\n');
    return res.status(200).json(output);
  }
  catch (err) {
    return res.status(400).json({
      ok: false,
      message: `Error quering database`,
      errors: err
    })
  }

}

/**
 * 
 * @param {*} pool 
 * @param {*} queryData 
 * @param {*} data_model 
 */
async function get_results(client, queryData, data_model) {
  try {
    const fields = [];
    queryData.fields.forEach(f => {
      fields.push(f.column_name)
    });

    let query = await QB.query(data_model, queryData);
    
    console.log('\x1b[32m%s\x1b[0m', 'Quering database...\n');
    console.log('\x1b[36m%s\x1b[0m', query);
    const results = await client.query(query);
    client.release(true);
    return results.rows;
  }

  catch (err) {
    console.log('\x1b[36m%s\x1b[0m', 'ERROR: SQL ERROR')
    throw err;
  }
}








