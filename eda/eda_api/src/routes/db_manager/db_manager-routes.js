const   express = require('express'),
        router = express.Router(),
        db_manager = require('../../controllers/db/main'),
        authGuard = require('../../guard/auth-guard');

//router.post('/post', db_manager.Q);
router.post('/query', authGuard, db_manager.connection);

router.get('/get_fields', authGuard, );

module.exports = router;
