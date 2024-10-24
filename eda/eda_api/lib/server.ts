import app from './app';

/**
 * oracle client
 */
const oracledb = require('oracledb');
/* SDA CUSTOM */ // const EDA_ORACLE_CLIENT = require('../config/oracle-config.js').EDA_ORACLE_CLIENT;

interface IError extends Error{
    status?: any;
}

const PORT = 8666;

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    let err: IError = new Error();
    err.status = 404;
    err.message = 'Not Found';
    next(err);
});

// error handler
app.use(function(err: IError, req, res, next) {
    // set locals, only providing error in development
    res.message = err.message;
    res.error = err;

    // render the error page
    res.status(err.status || 500);
    res.status(err.status).json(err);
});

app.listen(PORT, () => {
    console.log('\n\x1b[34m=====\x1b[0m Server start on port \x1b[32m['+PORT+'] \x1b[0m \x1b[34m=====\x1b[0m\n');
});

/**
 * Oracle client 
 */


/*SDA CUSTOM*/ // try {
/*SDA CUSTOM*/ //     oracledb.initOracleClient({libDir: EDA_ORACLE_CLIENT});
/*SDA CUSTOM*/ //   } catch (err) {
/*SDA CUSTOM*/ // 
/*SDA CUSTOM*/     // console.log('Para usar Oracle debes instalar instant_client y especificar la ruta en el archivo de configuración');
/*SDA CUSTOM*/     // console.error(err);
/*SDA CUSTOM*/ //   }
