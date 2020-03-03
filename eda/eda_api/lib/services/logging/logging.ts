const { createLogger, format, transports } = require('winston');
const { combine, timestamp,  prettyPrint  } = format;


var options = {
  file: {
    level: 'info',
    filename: `logs/app.log`,
    handleExceptions: true,
    json: false,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    colorize: false,
  },
  console: {
    level: 'debug',
    handleExceptions: true,
    json: false,
    colorize: true,
  },
};

const logger = createLogger({
  format: combine(
    timestamp(),
    prettyPrint()
  ),
  transports: [new transports.File(options.file)]
});

export default logger;