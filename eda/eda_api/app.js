let path = require('path'),
    cors = require('cors'),
    express = require("express"),
    app = express(),
    bodyParser = require("body-parser"),
    methodOverride = require('express-method-override'),
    fileUpload = require('express-fileupload'),
    RoutesLoader = require('./src/routes/RoutesLoader');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// app.use(bodyParser.urlencoded({ extended: false }));
// app.use(bodyParser.json());

app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true, parameterLimit: 1000000}));

app.use(methodOverride('_method', { methods: ['POST', 'GET'] }));
app.use(cors());
app.use(function(req, res, next ) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Acces-Controll-Allow-Methods", "POST, GET, PUT, DELETE, OPTIONS");
    next();
})
app.use(fileUpload());

// Configuring the database
const dbConfig = require('./config/database.config.js');
const mongoose = require('mongoose');

mongoose.Promise = global.Promise;

// Connecting to the database
mongoose.connect(dbConfig.url, {
    useNewUrlParser: true
}).then(() => {
    console.log('\n\x1b[34m=====\x1b[0m \x1b[32mSuccessfully connected to the database \x1b[0m \x1b[34m=====\x1b[0m\n');
}).catch(err => {
    console.log('\n\x1b[34m=====\x1b[0m \x1b[31mCould not connect to the database. Exiting now... \x1b[0m \x1b[34m=====\x1b[0m\n', err);
    process.exit();
});

mongoose.set('useCreateIndex', true);

/* Routes */
RoutesLoader(app);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    console.log(next);
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
// app.use(function(err, req, res, next) {
//     // set locals, only providing error in development
//     res.locals.message = err.message;
//     res.locals.error = req.app.get('env') === 'development' ? err : {};
  
//     // render the error page
//     res.status(err.status || 500);
//     res.render('error');
// });


app.listen(8666, function() {
    console.log('\n\x1b[34m=====\x1b[0m Server start on port \x1b[32m[8666] \x1b[0m \x1b[34m=====\x1b[0m\n');
});