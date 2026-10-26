/*
 * Self-service sign up (Edalitics Free). Replaces the external get.edalitics.com app.
 * When enabled, the login page shows the "Create account" tab and POST /signup is open to anyone.
 * The credentials email is sent with the SMTP configuration in SMPT.config.json.
 */
module.exports = {
    enabled: true,

    // Server URL written in the welcome email
    appUrl: 's',

    // Group every new user joins (Edalitics FREE, the same one Google / Microsoft sign-in uses)
    defaultGroupId: '',

    // Extra groups (by name) new users join
    extraGroups: [''],

    // Per-IP limit on sign up attempts (in memory, per worker)
    rateLimit: { windowMinutes: 60, max: 5 },

    // Postgres server where each new user gets a sample database (sales + customers),
    // a data model pointing to it and a sample dashboard. Disabled: only the user is created.
    sampleDatabase: {
        enabled: false,
        host: '',          // host the API uses to create the database
        port: ,
        user: '',           // needs CREATEDB and CREATEROLE
        password: '',
        datasourceHost: ,       // host stored in the data model; null = same as host
        datasourcePort: 
    }
};
