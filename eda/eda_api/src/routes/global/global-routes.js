const express = require('express'),
    router = express.Router(),
    global = require('../../controllers/global/index'),
    authGuard = require('../../guard/auth-guard');


// Search Routes
router.get('/search/:collection/:param', authGuard, global.search.findInCollection);

router.get('/search/:param', authGuard, global.search.find);

//Upload in server
router.put('/upload', authGuard, global.upload.uploadProfile);

module.exports = router;
