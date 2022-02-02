const { createLogger, format, transports } = require('winston');
const { combine, timestamp,  prettyPrint  } = format;
import CSV from 'winston-csv-format';


var options = {
  file: {
    level: 'info',
    filename: `logs/app.log`,
    handleExceptions: false,
    json: false,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    colorize: false,
  },
  console: {
    level: 'debug',
    handleExceptions: false,
    json: false,
    colorize: true,
  },
};

const ServerLogService = createLogger({
  format: 
    CSV(['level', 'action', 'userMail', 'ip', 'type', 'date_str' ], { delimiter: '|,|' }),
  transports: [new transports.File(options.file)]
});

export default ServerLogService;