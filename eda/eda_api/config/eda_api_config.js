module.exports = {
    // We can modify the null value of the database so that it gives us another value to read on the screen
    null_value: '',
    log_file: "/root/.pm2/logs/server-out.log", // Server query log - It must be modified depending on the server
    error_log_file: "/root/.pm2/logs/server-error.log" // Server error log - It must be modified depending on the server
}