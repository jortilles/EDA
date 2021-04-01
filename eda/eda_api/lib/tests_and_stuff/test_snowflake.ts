import snowflake from 'snowflake-sdk';
import { Snowflake } from 'snowflake-promise';


export const test_snowflake = async () => {
/* default snowflake sdk for node style:  
  const connection = snowflake.createConnection({
    account: 'YF83212.europe-west4.gcp',
    username: 'PAUSALA',
    password: 'Snowflakepausala1984'
  })

  // Try to connect to Snowflake, and check whether the connection was successful.
  connection.connect(
    (err, conn) => {
      if (err) {
        console.error('Unable to connect: ' + err.message);
      }
      else {
        console.log('Successfully connected to Snowflake.');
        // Optional: store the connection ID.
        const connection_ID = conn.getId();
      }
    }
  );

  connection.execute({
    sqlText: 'Select * from DEMO_DB.public.SUBVENCIONS_BCN',
    complete: function (err, stmt, rows) {
      if (err) {
        console.error('Failed to execute statement due to the following error: ' + err.message);
      } else {
        console.log('Successfully executed statement: ' + stmt.getSqlText());
        console.log(rows[0]);
      }
    }
  });
*/
/**With promises:  */

  const snowflake = new Snowflake({
    account: 'YF83212.europe-west4.gcp',
    username: 'PAUSALA',
    password: 'Snowflakepausala1984',
    database: 'SNOWFLAKE_SAMPLE_DATA',
    schema: 'TPCDS_SF100TCL',
    warehouse: 'COMPUTE_WH'
  });

  await snowflake.connect();

  const rows = await snowflake.execute(
    'SHOW TABLES IN SCHEMA TPCDS_SF100TCL'
  );

  console.log(rows[0]);




}